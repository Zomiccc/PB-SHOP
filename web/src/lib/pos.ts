import bcrypt from "bcryptjs";
import { db } from "./db";
import { finalizeOrder, nextOrderNumber } from "./orders";
import { newPassportNo } from "./auth";
import { StockError } from "./inventory";

export type PosSaleInput = {
  items: { variantId: string; qty: number; unitPrice?: number }[];
  method: "CASH" | "CARD" | "MOBILE_WALLET" | "BANK_TRANSFER";
  customerPhone?: string;
  customerName?: string;
  note?: string;
  discount?: number;
  /** Zero-stock exception. Owner at the till: no credentials needed. Employee: owner email + password. */
  override?: { email?: string; password?: string };
};

export class PosError extends Error {}

/**
 * In-store sale from the POS (§6, §19, §20): creates a POS order tied to the employee, confirms
 * payment, decrements stock, awards loyalty / Care Card when a customer is attached, saves the
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
    return { variantId: v.id, name: `${v.product.name}${v.product.condition === "USED" ? " (Used)" : ""}${label ? ` — ${label}` : ""}`, sku: v.sku, grade: v.grade, unitPrice: v.salePrice ?? v.price, qty: i.qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = Math.max(0, Math.min(input.discount ?? 0, subtotal));

  const phone = input.customerPhone?.replace(/[\s-]/g, "") || null;
  const order = await db.$transaction(async (tx) => {
    let customerId: string | null = null;
    if (phone) {
      const c = (await tx.customer.findUnique({ where: { phone } })) ?? (await tx.customer.create({ data: { name: input.customerName?.trim() || "Walk-in customer", phone, passportNo: newPassportNo() } }));
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
        items: { create: lines },
      },
    });
    await tx.payment.create({ data: { orderId: o.id, provider: "IN_STORE", method: input.method, amount: subtotal - discount, status: "SUCCESS", verifiedAt: new Date() } });
    if (input.note?.trim()) await tx.note.create({ data: { kind: "SALE", body: input.note.trim(), authorId: staff.id, orderId: o.id, customerId } });
    return o;
  });

  try {
    await finalizeOrder(order.id, { staffId: staff.id, markPaid: true, overrideBy });
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
  // Keep the POS order status as completed (finalizeOrder moves NEW → PROCESSING only).
  return db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, careCard: true } });
}
