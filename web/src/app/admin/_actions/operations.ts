"use server";

import { revalidatePath } from "next/cache";
import { normalizePhone } from "@/lib/format";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { awardOrderBenefits, nextRepairRef } from "@/lib/orders";
import { restoreOrderStock } from "@/lib/inventory";
import { changeRepairStatus } from "@/lib/repairs";
import { earnPoints, repairDiscount, spendPoints, syncBalance } from "@/lib/loyalty";
import { notify } from "@/lib/notify";
import { newPassportNo } from "@/lib/auth";
import { parseBirthday } from "@/lib/passport";
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

/** Cash-on-delivery / pending order confirmed as paid → Phone Passport points are granted now. */
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
    return "Marked as paid — Phone Passport points applied";
  });
}

/** Finalised cancellation or return: restores stock and reverses the order's Passport points (§10). */
export async function cancelOrReturnAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const kind = str(f, "kind") === "RETURN" ? "RETURN" : "CANCEL";
    const reason = str(f, "reason");
    if (reason.length < 3) throw new Error("Give a reason");
    const o = await db.order.findUniqueOrThrow({ where: { id: str(f, "orderId") } });
    if (["CANCELLED", "RETURNED"].includes(o.fulfilmentStatus)) throw new Error("Order is already closed");
    await db.$transaction(async (tx) => {
      await restoreOrderStock(tx, o.id, staff.id, kind);
      // Reverse this order's points: unspent points on its own lots first, then from the rest of the balance.
      const lots = await tx.loyaltyTransaction.findMany({ where: { orderId: o.id, type: "EARN" } });
      const pts = lots.reduce((s, t) => s + t.points, 0);
      if (pts > 0 && o.customerId) {
        for (const lot of lots) await tx.loyaltyTransaction.update({ where: { id: lot.id }, data: { remaining: 0 } });
        const unspent = lots.reduce((s, t) => s + (t.remaining ?? 0), 0);
        await tx.loyaltyTransaction.create({ data: { customerId: o.customerId, type: "ADJUST", points: -unspent, orderId: o.id, reason: `${kind === "RETURN" ? "Return" : "Cancellation"} of ${o.number}`, staffId: staff.id } });
        if (pts - unspent > 0) await spendPoints(tx, { customerId: o.customerId, points: pts - unspent, type: "ADJUST", reason: `${kind === "RETURN" ? "Return" : "Cancellation"} of ${o.number} (points already used)`, orderId: o.id, staffId: staff.id, allowPartial: true });
        else await syncBalance(tx, o.customerId);
      }
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
    const data = { quote: int(f, "quote"), finalPrice: int(f, "finalPrice"), partsCost: int(f, "partsCost"), assignedToId: optStr(f, "assignedToId"), imei: optStr(f, "imei") };
    if (data.partsCost != null && data.partsCost < 0) throw new Error("Parts cost can't be negative");
    await db.repairRequest.update({ where: { id: r.id }, data });
    await audit({ staffId: staff.id, action: "REPAIR_UPDATED", entityType: "REPAIR", entityId: r.id, recordLabel: `Repair ${r.ref}`, before: { quote: r.quote, finalPrice: r.finalPrice, partsCost: r.partsCost, assignedToId: r.assignedToId, imei: r.imei }, after: data });
    revalidatePath(`/admin/repairs/${r.id}`);
    return "Repair updated";
  });
}

/** Walk-in repair booked at the counter (links to the customer's Passport by phone). */
export async function createWalkInRepairAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const phone = normalizePhone(str(f, "phone"));
    if (!/^(\+92|0)?3\d{9}$/.test(phone)) throw new Error("Enter a valid mobile number");
    for (const k of ["name", "brand", "model", "category", "description"]) if (!str(f, k)) throw new Error(`${k} is required`);
    const r = await db.$transaction(async (tx) => {
      const c = (await tx.customer.findUnique({ where: { phone } })) ?? (await tx.customer.create({ data: { name: str(f, "name"), phone, passportNo: newPassportNo() } }));
      const r = await tx.repairRequest.create({
        data: { ref: await nextRepairRef(tx), customerId: c.id, name: str(f, "name"), phone, brand: str(f, "brand"), model: str(f, "model"), imei: optStr(f, "imei"), category: str(f, "category"), description: str(f, "description"), dropOff: "WALK_IN", status: "RECEIVED", assignedToId: staff.id },
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
    await db.$transaction(async (tx) => {
      // Additions are new lots with their own six-month expiry; deductions use the soonest-expiring points.
      if (pts > 0) await earnPoints(tx, { customerId: c.id, points: pts, source: "MANUAL", type: str(f, "type") === "PROMO" ? "PROMO" : "ADJUST", reason, staffId: staff.id });
      else await spendPoints(tx, { customerId: c.id, points: -pts, type: "ADJUST", reason, staffId: staff.id });
      const after = await tx.customer.findUniqueOrThrow({ where: { id: c.id } });
      await audit({ staffId: staff.id, action: "LOYALTY_ADJUSTED", entityType: "LOYALTY", entityId: c.id, recordLabel: `${c.name} (${c.passportNo})`, before: { points: c.loyaltyPoints }, after: { points: after.loyaltyPoints, change: pts, reason } }, tx);
    });
    revalidatePath(`/admin/customers/${c.id}`);
    return "Points updated";
  });
}

/**
 * Manual PB Points award (Passport requirements §5): staff pick a customer, enter the extra points and a
 * reason, and confirm. It is its own "AWARD" transaction in the customer's points history, recorded with
 * the awarding staff member and time, and audited. Awarded points follow the normal expiry rules.
 */
export async function awardPointsAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const pts = int(f, "points");
    const reason = str(f, "reason");
    if (!pts || pts < 1 || pts > 10000) throw new Error("Enter between 1 and 10,000 points to award");
    if (reason.length < 3) throw new Error("A reason / note is required");
    if (str(f, "confirmed") !== "yes") throw new Error("Confirm the award first");
    const c = await db.customer.findUniqueOrThrow({ where: { id: str(f, "customerId") } });
    const after = await db.$transaction(async (tx) => {
      await earnPoints(tx, { customerId: c.id, points: pts, source: "MANUAL", type: "AWARD", reason, staffId: staff.id });
      const after = await tx.customer.findUniqueOrThrow({ where: { id: c.id } });
      await audit({ staffId: staff.id, action: "POINTS_AWARDED", entityType: "LOYALTY", entityId: c.id, recordLabel: `${c.name} (${c.passportNo})`, before: { points: c.loyaltyPoints }, after: { points: after.loyaltyPoints, awarded: pts, reason } }, tx);
      return after;
    });
    revalidatePath(`/admin/customers/${c.id}`);
    revalidatePath("/admin/points");
    return `${pts} PB Points awarded to ${c.name} — new balance ${after.loyaltyPoints}`;
  });
}

/** Passport details kept by staff: birth month + day (no year) and the card expiry date (§1, §2). Audited. */
export async function updatePassportAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const c = await db.customer.findUniqueOrThrow({ where: { id: str(f, "customerId") } });
    const birthday = parseBirthday(str(f, "birthMonth"), str(f, "birthDay"));
    const exp = str(f, "cardExpiresAt");
    const cardExpiresAt = exp ? new Date(`${exp}T23:59:59`) : null;
    if (cardExpiresAt && isNaN(cardExpiresAt.getTime())) throw new Error("Enter a valid expiry date");
    const data = { birthMonth: birthday?.birthMonth ?? null, birthDay: birthday?.birthDay ?? null, cardExpiresAt };
    const before = { birthMonth: c.birthMonth, birthDay: c.birthDay, cardExpiresAt: c.cardExpiresAt?.toISOString().slice(0, 10) ?? null };
    const next = { ...data, cardExpiresAt: exp || null };
    if (JSON.stringify(before) === JSON.stringify(next)) return "No changes";
    await db.$transaction(async (tx) => {
      await tx.customer.update({ where: { id: c.id }, data });
      await audit({ staffId: staff.id, action: "PASSPORT_DETAILS_UPDATED", entityType: "CUSTOMER", entityId: c.id, recordLabel: `${c.name} (${c.passportNo})`, before, after: next }, tx);
    });
    revalidatePath(`/admin/customers/${c.id}`);
    return "Passport details saved";
  });
}

/** Staff give a chosen number of Passport points for a paid purchase (client request). Audited. */
export async function givePointsForOrderAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const pts = int(f, "points");
    if (!pts || pts < 1 || pts > 10000) throw new Error("Enter between 1 and 10,000 points");
    const o = await db.order.findUniqueOrThrow({ where: { id: str(f, "orderId") }, include: { customer: true } });
    if (!o.customerId || !o.customer) throw new Error("This order isn't linked to a Passport (no customer phone)");
    if (o.paymentStatus !== "PAID") throw new Error("Points can only be given once the order is paid");
    const reason = optStr(f, "reason");
    await db.$transaction(async (tx) => {
      await earnPoints(tx, { customerId: o.customerId!, points: pts, source: "MANUAL", reason: `Purchase ${o.number}${reason ? ` — ${reason}` : " (points given by staff)"}`, orderId: o.id, staffId: staff.id });
      await audit({ staffId: staff.id, action: "LOYALTY_ADJUSTED", entityType: "LOYALTY", entityId: o.customerId, recordLabel: `${o.customer!.name} · order ${o.number}`, before: { points: o.customer!.loyaltyPoints }, after: { points: o.customer!.loyaltyPoints + pts, given: pts, reason } }, tx);
    });
    revalidatePath(`/admin/orders/${o.id}`);
    return `${pts} points given to ${o.customer.name}`;
  });
}

/**
 * Redeems a Phone Passport reward (master brief §4). Only unexpired points can be used.
 * Repair-discount rewards (if the owner creates any) are applied to a repair and never discount the parts.
 */
export async function redeemRewardAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const c = await db.customer.findUniqueOrThrow({ where: { id: str(f, "customerId") } });
    const reward = await db.reward.findUniqueOrThrow({ where: { id: str(f, "rewardId") } });
    if (!reward.active) throw new Error("This reward is switched off");
    const repairId = optStr(f, "repairId");
    let discount: number | null = null;
    let repairRef: string | null = null;
    if (reward.kind === "REPAIR_DISCOUNT") {
      if (!repairId) throw new Error("Choose the repair this discount is for");
      const r = await db.repairRequest.findUniqueOrThrow({ where: { id: repairId } });
      if (r.customerId && r.customerId !== c.id) throw new Error("That repair belongs to another customer");
      if (r.rewardDiscount) throw new Error(`Repair ${r.ref} already has a Passport discount`);
      const charge = r.finalPrice ?? r.quote;
      if (charge == null) throw new Error(`Set the quote or final charge on repair ${r.ref} first`);
      discount = repairDiscount(charge, r.partsCost, reward.discountPercent ?? 0);
      repairRef = r.ref;
    }
    await db.$transaction(async (tx) => {
      const before = c.loyaltyPoints;
      await spendPoints(tx, { customerId: c.id, points: reward.pointsCost, type: "REDEEM", reason: repairRef ? `${reward.name} — repair ${repairRef}` : reward.name, rewardId: reward.id, repairId, staffId: staff.id });
      if (repairId && discount != null) await tx.repairRequest.update({ where: { id: repairId }, data: { rewardDiscount: discount } });
      const after = await tx.customer.findUniqueOrThrow({ where: { id: c.id } });
      await audit({ staffId: staff.id, action: "REWARD_REDEEMED", entityType: "LOYALTY", entityId: c.id, recordLabel: `${c.name} · ${reward.name}`, before: { points: before }, after: { points: after.loyaltyPoints, repair: repairRef, discount } }, tx);
    });
    revalidatePath(`/admin/customers/${c.id}`);
    if (repairId) revalidatePath(`/admin/repairs/${repairId}`);
    return discount != null ? `Redeemed: ${reward.name} — Rs ${discount.toLocaleString("en-PK")} off repair ${repairRef} (parts excluded)` : `Redeemed: ${reward.name}`;
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

/**
 * Deletes a customer's Phone Passport profile (owner only; Passport requirements §6). Their profile,
 * customer notes and login are removed, so they no longer appear anywhere as a customer. Retention:
 * orders, repairs and installment sales stay (business / tax records) but are unlinked, and the full
 * points history is kept as a snapshot in the audit entry with the deleting admin and time.
 */
export async function deleteCustomerAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  const res = await run(async () => {
    const c = await db.customer.findUniqueOrThrow({ where: { id: str(f, "customerId") }, include: { _count: { select: { orders: true, repairs: true, installments: true, referrals: true } } } });
    if (str(f, "confirm").trim().toUpperCase() !== "DELETE") throw new Error('Type DELETE to confirm');
    const ledger = await db.loyaltyTransaction.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "asc" }, include: { staff: { select: { name: true } } } });
    await db.$transaction(async (tx) => {
      await tx.customer.updateMany({ where: { referredById: c.id }, data: { referredById: null } });
      await tx.order.updateMany({ where: { customerId: c.id }, data: { customerId: null } });
      await tx.repairRequest.updateMany({ where: { customerId: c.id }, data: { customerId: null } });
      await tx.installmentSale.updateMany({ where: { customerId: c.id }, data: { customerId: null } });
      await tx.note.deleteMany({ where: { customerId: c.id, kind: "CUSTOMER" } });
      await tx.note.updateMany({ where: { customerId: c.id }, data: { customerId: null } });
      await tx.loyaltyTransaction.deleteMany({ where: { customerId: c.id } });
      await tx.customer.delete({ where: { id: c.id } });
      await audit(
        { staffId: staff.id, action: "CUSTOMER_DELETED", entityType: "CUSTOMER", entityId: c.id, recordLabel: `${c.name} (${c.passportNo})`, before: { name: c.name, phone: `${c.phone.slice(0, 4)}*****${c.phone.slice(-2)}`, points: c.loyaltyPoints, orders: c._count.orders, repairs: c._count.repairs, installments: c._count.installments, referrals: c._count.referrals, pointsHistory: ledger.map((t) => ({ at: t.createdAt.toISOString(), type: t.type, source: t.source, points: t.points, reason: t.reason, by: t.staff?.name ?? null })) } },
        tx,
      );
    });
  });
  if (res?.ok) redirect("/admin/customers?deleted=1");
  return res;
}
