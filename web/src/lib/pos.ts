import bcrypt from "bcryptjs";
import { normalizePhone } from "./format";
import { db } from "./db";
import { finalizeOrder, nextOrderNumber } from "./orders";
import { nextRewardsId } from "./rewards-id";
import { StockError } from "./inventory";
import { availablePoints, spendPoints } from "./loyalty";
import { audit } from "./audit";

export type PosSaleInput = {
  items: { variantId: string; qty: number; unitPrice?: number }[];
  method: "CASH" | "CARD" | "MOBILE_WALLET" | "BANK_TRANSFER";
  customerPhone?: string;
  customerName?: string;
  note?: string;
  discount?: number;
  /** Passport points typed by staff for this sale; omit for the automatic amount. */
  points?: number;
  /** A PB Rewards reward redeemed with this sale — its points are taken and printed on the bill as "used". */
  rewardId?: string;
  /** Zero-stock exception. Owner at the till: no credentials needed. Employee: owner email + password. */
  override?: { email?: string; password?: string };
};

export class PosError extends Error {}

/**
 * In-store sale from the POS (§6, §19, §20): creates a POS order tied to the employee, confirms
 * payment, decrements stock, awards Phone Passport points when a customer is attached, saves the
 * employee's sale note and audits it. Zero-stock sales need a super admin's credentials.
 */
export async function createPosSale(input: PosSaleInput, staff: { id: string; role: string; email: string }) {
  if (!input.items.length) throw new PosError("Scan at least one item");

  let overrideBy: string | null = null;
  if (input.override) {
    if (staff.role === "SUPER_ADMIN") {
      overrideBy = staff.email;
    } else {
      const approver = await db.staff.findUnique({ where: { email: (input.override.email ?? "").trim().toLowerCase() } });
      const ok = approver?.role === "SUPER_ADMIN" && approver.active && (await bcrypt.compare(input.override.password ?? "", approver.passwordHash));
      if (!ok) throw new PosError("Override not authorised — owner credentials required");
      overrideBy = approver.email;
    }
  }

  const variants = await db.variant.findMany({ where: { id: { in: input.items.map((i) => i.variantId) } }, include: { product: true } });
  const lines = input.items.map((i) => {
    const v = variants.find((x) => x.id === i.variantId);
    if (!v) throw new PosError("Item not found");
    const label = [v.storage, v.color, v.grade ? `Grade ${v.grade}` : null].filter(Boolean).join(" · ");
    const listPrice = v.salePrice ?? v.price;
    // Negotiated price (Nov 2026): a salesman may go down to the item's offer / discount price; the owner has no limit.
    const floor = Math.min(listPrice, v.floorPrice ?? listPrice);
    const unitPrice = i.unitPrice ?? listPrice;
    if (!Number.isInteger(unitPrice) || unitPrice < 0) throw new PosError("Check the price");
    if (staff.role !== "SUPER_ADMIN" && unitPrice < floor) throw new PosError(`Lowest price for ${v.product.name} is Rs ${floor.toLocaleString("en-PK")} — ask the owner for less`);
    return { variantId: v.id, name: `${v.product.name}${v.product.condition === "USED" ? " (Used)" : ""}${label ? ` — ${label}` : ""}`, sku: v.sku, grade: v.grade, unitPrice, unitCost: v.costPrice, qty: i.qty, floor, listPrice };
  });
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = Math.max(0, Math.min(input.discount ?? 0, subtotal));
  const lowest = lines.reduce((s, l) => s + l.floor * l.qty, 0);
  if (staff.role !== "SUPER_ADMIN" && subtotal - discount < lowest) throw new PosError(`The lowest total for this sale is Rs ${lowest.toLocaleString("en-PK")} — reduce the discount or ask the owner`);

  const phoneForReward = input.customerPhone ? normalizePhone(input.customerPhone) || null : null;
  const reward = input.rewardId ? await db.reward.findUnique({ where: { id: input.rewardId } }) : null;
  if (input.rewardId) {
    if (!reward?.active) throw new PosError("That reward is switched off");
    const c = phoneForReward ? await db.customer.findUnique({ where: { phone: phoneForReward } }) : null;
    if (!c) throw new PosError("Add the customer's mobile number to use their points");
    const have = await db.$transaction((tx) => availablePoints(tx, c.id));
    if (have < reward.pointsCost) throw new PosError(`${reward.name} needs ${reward.pointsCost} points — the customer has ${have}`);
  }

  const phone = input.customerPhone ? normalizePhone(input.customerPhone) || null : null;
  const order = await db.$transaction(async (tx) => {
    let customerId: string | null = null;
    if (phone) {
      const c = (await tx.customer.findUnique({ where: { phone } })) ?? (await tx.customer.create({ data: { name: input.customerName?.trim() || "Walk-in customer", phone, passportNo: await nextRewardsId(tx) } }));
      customerId = c.id;
    }
    const o = await tx.order.create({
      data: {
        number: await nextOrderNumber(tx),
        channel: "POS",
        customerId,
        customerName: input.customerName?.trim() || "Walk-in customer",
        customerPhone: phone ?? "-",
        fulfilment: "IN_STORE",
        fulfilmentStatus: "COMPLETED",
        subtotal,
        discount,
        total: subtotal - discount,
        staffId: staff.id,
        items: { create: lines.map((l) => ({ variantId: l.variantId, name: l.name, sku: l.sku, grade: l.grade, unitPrice: l.unitPrice, unitCost: l.unitCost, qty: l.qty })) },
      },
    });
    await tx.payment.create({ data: { orderId: o.id, provider: "IN_STORE", method: input.method, amount: subtotal - discount, status: "SUCCESS", verifiedAt: new Date() } });
    if (input.note?.trim()) await tx.note.create({ data: { kind: "SALE", body: input.note.trim(), authorId: staff.id, orderId: o.id, customerId } });
    return o;
  });

  try {
    await finalizeOrder(order.id, { staffId: staff.id, markPaid: true, overrideBy, points: phone ? input.points : undefined });
  } catch (e) {
    // Roll back the unconfirmed sale so it never appears as revenue.
    await db.$transaction([
      db.note.deleteMany({ where: { orderId: order.id } }),
      db.payment.deleteMany({ where: { orderId: order.id } }),
      db.orderItem.deleteMany({ where: { orderId: order.id } }),
      db.order.delete({ where: { id: order.id } }),
    ]);
    if (e instanceof StockError) throw new PosError(`${e.message}. Ask the owner to authorise a zero-stock sale.`);
    throw e;
  }
  // Points used on this bill, then the customer's balance after the sale (printed on the bill — Nov 2026).
  if (order.customerId) {
    const customerId = order.customerId;
    await db.$transaction(async (tx) => {
      if (reward) {
        await spendPoints(tx, { customerId, points: reward.pointsCost, type: "REDEEM", reason: `${reward.name} — bill ${order.number}`, rewardId: reward.id, orderId: order.id, staffId: staff.id });
        await audit({ staffId: staff.id, action: "REWARD_REDEEMED", entityType: "ORDER", entityId: order.id, recordLabel: `Bill ${order.number} · ${reward.name}`, after: { points: -reward.pointsCost } }, tx);
      }
      const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      await tx.order.update({ where: { id: order.id }, data: { pointsBalance: c.loyaltyPoints } });
    });
  }
  // Keep the POS order status as completed (finalizeOrder moves NEW → PROCESSING only).
  return db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
}
