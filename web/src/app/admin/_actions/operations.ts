"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { awardOrderBenefits, nextRepairRef } from "@/lib/orders";
import { restoreOrderStock } from "@/lib/inventory";
import { changeRepairStatus } from "@/lib/repairs";
import { redeemCareService } from "@/lib/care-card";
import { notify } from "@/lib/notify";
import { newPassportNo } from "@/lib/auth";
import type { FormState } from "./auth";
import { bool, int, optStr, run, str } from "./util";

// ─────────────── Orders ───────────────

const FULFILMENT = ["NEW", "PROCESSING", "READY", "SHIPPED", "COMPLETED", "ON_HOLD"];

export async function setFulfilmentAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const to = str(f, "status");
    if (!FULFILMENT.includes(to)) throw new Error("Choose a valid status (use Cancel / Return for those)");
    const o = await db.order.findUniqueOrThrow({ where: { id: str(f, "orderId") } });
    if (o.fulfilmentStatus === to) return "No change";
    await db.order.update({ where: { id: o.id }, data: { fulfilmentStatus: to } });
    await audit({ staffId: staff.id, action: "ORDER_STATUS_CHANGED", entityType: "ORDER", entityId: o.id, recordLabel: `Order ${o.number}`, before: { fulfilmentStatus: o.fulfilmentStatus }, after: { fulfilmentStatus: to } });
    if (["READY", "SHIPPED"].includes(to)) {
      await notify({ to: { phone: o.customerPhone, email: o.customerEmail }, subject: `Order ${o.number}`, text: `PB Mobiles: your order ${o.number} is ${to === "READY" ? "ready for collection" : "on its way"}.` });
    }
    revalidatePath(`/admin/orders/${o.id}`);
    return "Status updated";
  });
}

/** Cash-on-delivery / pending order confirmed as paid → points + Care Card are granted now. */
export async function markPaidAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const o = await db.order.findUniqueOrThrow({ where: { id: str(f, "orderId") }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (o.paymentStatus === "PAID") return "Already paid";
    if (!o.stockCommitted) throw new Error("Stock hasn't been committed for this order — it was never confirmed. Create a new sale instead.");
    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: o.id }, data: { paymentStatus: "PAID" } });
      if (o.payments[0]) await tx.payment.update({ where: { id: o.payments[0].id }, data: { status: "SUCCESS", verifiedAt: new Date(), providerRef: optStr(f, "ref") ?? o.payments[0].providerRef } });
      await awardOrderBenefits(tx, o.id, staff.id);
      await audit({ staffId: staff.id, action: "ORDER_MARKED_PAID", entityType: "ORDER", entityId: o.id, recordLabel: `Order ${o.number}`, before: { paymentStatus: o.paymentStatus }, after: { paymentStatus: "PAID", ref: optStr(f, "ref") } }, tx);
    });
    revalidatePath(`/admin/orders/${o.id}`);
    return "Marked as paid — loyalty points and Care Card applied";
  });
}

/** Finalised cancellation or return: restores stock, reverses points, voids the Care Card (§6, §19). */
export async function cancelOrReturnAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const kind = str(f, "kind") === "RETURN" ? "RETURN" : "CANCEL";
    const reason = str(f, "reason");
    if (reason.length < 3) throw new Error("Give a reason");
    const o = await db.order.findUniqueOrThrow({ where: { id: str(f, "orderId") }, include: { careCard: { include: { redemptions: true } } } });
    if (["CANCELLED", "RETURNED"].includes(o.fulfilmentStatus)) throw new Error("Order is already closed");
    await db.$transaction(async (tx) => {
      await restoreOrderStock(tx, o.id, staff.id, kind);
      const earned = await tx.loyaltyTransaction.findMany({ where: { orderId: o.id, type: "EARN" } });
      const pts = earned.reduce((s, t) => s + t.points, 0);
      if (pts > 0 && o.customerId) {
        await tx.loyaltyTransaction.create({ data: { customerId: o.customerId, type: "ADJUST", points: -pts, orderId: o.id, reason: `${kind === "RETURN" ? "Return" : "Cancellation"} of ${o.number}`, staffId: staff.id } });
        await tx.customer.update({ where: { id: o.customerId }, data: { loyaltyPoints: { decrement: pts } } });
      }
      if (o.careCard && o.careCard.redemptions.length === 0) await tx.careCard.update({ where: { id: o.careCard.id }, data: { status: "VOID" } });
      await tx.order.update({
        where: { id: o.id },
        data: { fulfilmentStatus: kind === "RETURN" ? "RETURNED" : "CANCELLED", paymentStatus: o.paymentStatus === "PAID" ? "REFUNDED" : "CANCELLED" },
      });
      await tx.note.create({ data: { kind: "SALE", body: `${kind === "RETURN" ? "Return" : "Cancellation"}: ${reason}`, important: true, authorId: staff.id, orderId: o.id } });
    });
    revalidatePath(`/admin/orders/${o.id}`);
    return kind === "RETURN" ? "Return finalised — stock restored" : "Order cancelled — stock restored";
  });
}

export async function addNoteAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const body = str(f, "body");
    if (body.length < 2) throw new Error("Write a note");
    const kind = str(f, "kind");
    const meta: Record<string, string> = {};
    for (const k of ["issue", "findings", "work", "parts"]) if (str(f, k)) meta[k] = str(f, k);
    const note = await db.note.create({
      data: {
        kind: kind === "REPAIR" ? "REPAIR" : kind === "CUSTOMER" ? "CUSTOMER" : "SALE",
        body,
        important: bool(f, "important"),
        meta: Object.keys(meta).length ? JSON.stringify(meta) : null,
        authorId: staff.id,
        orderId: optStr(f, "orderId"),
        repairId: optStr(f, "repairId"),
        customerId: optStr(f, "customerId"),
      },
    });
    if (note.repairId) {
      const r = await db.repairRequest.findUnique({ where: { id: note.repairId } });
      await audit({ staffId: staff.id, action: "REPAIR_NOTE_ADDED", entityType: "REPAIR", entityId: note.repairId, recordLabel: `Repair ${r?.ref}`, after: { note: body.slice(0, 200), ...meta } });
      revalidatePath(`/admin/repairs/${note.repairId}`);
    }
    if (note.orderId) {
      await audit({ staffId: staff.id, action: "SALE_NOTE_ADDED", entityType: "ORDER", entityId: note.orderId, after: { note: body.slice(0, 200) } });
      revalidatePath(`/admin/orders/${note.orderId}`);
    }
    if (note.customerId) revalidatePath(`/admin/customers/${note.customerId}`);
    return "Note saved";
  });
}

// ─────────────── Repairs ───────────────

export async function repairStatusAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    await changeRepairStatus(str(f, "repairId"), str(f, "status"), staff.id);
    revalidatePath(`/admin/repairs/${str(f, "repairId")}`);
    revalidatePath("/admin/repairs");
    return "Status updated — customer notified where applicable";
  });
}

export async function repairDetailsAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const r = await db.repairRequest.findUniqueOrThrow({ where: { id: str(f, "repairId") } });
    const data = { quote: int(f, "quote"), finalPrice: int(f, "finalPrice"), assignedToId: optStr(f, "assignedToId") };
    await db.repairRequest.update({ where: { id: r.id }, data });
    await audit({ staffId: staff.id, action: "REPAIR_UPDATED", entityType: "REPAIR", entityId: r.id, recordLabel: `Repair ${r.ref}`, before: { quote: r.quote, finalPrice: r.finalPrice, assignedToId: r.assignedToId }, after: data });
    revalidatePath(`/admin/repairs/${r.id}`);
    return "Repair updated";
  });
}

/** Walk-in repair booked at the counter (links to the customer's Passport by phone). */
export async function createWalkInRepairAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const phone = str(f, "phone").replace(/[\s-]/g, "");
    if (!/^(\+92|0)?3\d{9}$/.test(phone)) throw new Error("Enter a valid mobile number");
    for (const k of ["name", "brand", "model", "category", "description"]) if (!str(f, k)) throw new Error(`${k} is required`);
    const r = await db.$transaction(async (tx) => {
      const c = (await tx.customer.findUnique({ where: { phone } })) ?? (await tx.customer.create({ data: { name: str(f, "name"), phone, passportNo: newPassportNo() } }));
      const r = await tx.repairRequest.create({
        data: { ref: await nextRepairRef(tx), customerId: c.id, name: str(f, "name"), phone, brand: str(f, "brand"), model: str(f, "model"), category: str(f, "category"), description: str(f, "description"), dropOff: "WALK_IN", status: "RECEIVED", assignedToId: staff.id },
      });
      await tx.repairStatusChange.create({ data: { repairId: r.id, from: null, to: "RECEIVED", staffId: staff.id } });
      await audit({ staffId: staff.id, action: "REPAIR_CREATED", entityType: "REPAIR", entityId: r.id, recordLabel: `Repair ${r.ref}` }, tx);
      return r;
    });
    await notify({ to: { phone }, subject: `Repair ${r.ref}`, text: `PB Mobiles: we've received your ${r.brand} ${r.model}. Your repair reference is ${r.ref}.` });
    revalidatePath("/admin/repairs");
    return `Repair ${r.ref} created`;
  });
}

// ─────────────── Customers & loyalty ───────────────

export async function adjustPointsAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const pts = int(f, "points");
    const reason = str(f, "reason");
    if (!pts) throw new Error("Enter points (negative to deduct)");
    if (reason.length < 3) throw new Error("A reason is required");
    const c = await db.customer.findUniqueOrThrow({ where: { id: str(f, "customerId") } });
    if (c.loyaltyPoints + pts < 0) throw new Error("Balance can't go below zero");
    await db.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({ data: { customerId: c.id, type: str(f, "type") === "PROMO" ? "PROMO" : "ADJUST", points: pts, reason, staffId: staff.id } });
      await tx.customer.update({ where: { id: c.id }, data: { loyaltyPoints: { increment: pts } } });
      await audit({ staffId: staff.id, action: "LOYALTY_ADJUSTED", entityType: "LOYALTY", entityId: c.id, recordLabel: `${c.name} (${c.passportNo})`, before: { points: c.loyaltyPoints }, after: { points: c.loyaltyPoints + pts, reason } }, tx);
    });
    revalidatePath(`/admin/customers/${c.id}`);
    return "Points updated";
  });
}

export async function redeemRewardAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const c = await db.customer.findUniqueOrThrow({ where: { id: str(f, "customerId") } });
    const reward = await db.reward.findUniqueOrThrow({ where: { id: str(f, "rewardId") } });
    if (!reward.active) throw new Error("Reward is not active");
    if (c.loyaltyPoints < reward.pointsCost) throw new Error(`Needs ${reward.pointsCost} points — customer has ${c.loyaltyPoints}`);
    await db.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({ data: { customerId: c.id, type: "REDEEM", points: -reward.pointsCost, rewardId: reward.id, reason: reward.name, staffId: staff.id } });
      await tx.customer.update({ where: { id: c.id }, data: { loyaltyPoints: { decrement: reward.pointsCost } } });
      await audit({ staffId: staff.id, action: "REWARD_REDEEMED", entityType: "LOYALTY", entityId: c.id, recordLabel: `${c.name} · ${reward.name}`, before: { points: c.loyaltyPoints }, after: { points: c.loyaltyPoints - reward.pointsCost } }, tx);
    });
    revalidatePath(`/admin/customers/${c.id}`);
    return `Redeemed: ${reward.name}`;
  });
}

// ─────────────── Care Card desk ───────────────

export async function redeemCareAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const r = await redeemCareService({ cardId: str(f, "cardId"), serviceId: str(f, "serviceId"), staffId: staff.id, repairId: optStr(f, "repairId"), note: optStr(f, "note") });
    revalidatePath("/admin/care-cards");
    return `Redeemed (${r.used}/${r.max} uses)${r.exhausted ? " — card is now fully used" : ""}`;
  });
}

// ─────────────── Inbox ───────────────

export async function contactStatusAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const status = str(f, "status");
    if (!["NEW", "REPLIED", "CLOSED"].includes(status)) throw new Error("Invalid status");
    await db.contactMessage.update({ where: { id: str(f, "id") }, data: { status } });
    await audit({ staffId: staff.id, action: "CONTACT_STATUS", entityType: "CONTACT", entityId: str(f, "id"), after: { status } });
    revalidatePath("/admin/inbox");
    return "Updated";
  });
}

export async function chatReplyAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const body = str(f, "body");
    if (!body) throw new Error("Write a reply");
    const id = str(f, "conversationId");
    await db.chatMessage.create({ data: { conversationId: id, from: "STAFF", body: `${body}\n— ${staff.name}` } });
    await db.chatConversation.update({ where: { id }, data: { status: "HANDED_OFF" } });
    revalidatePath("/admin/inbox");
    return "Reply sent — the visitor sees it next time they open chat";
  });
}
