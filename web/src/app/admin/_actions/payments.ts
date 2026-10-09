"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { finalizeOrder } from "@/lib/orders";
import { StockError } from "@/lib/inventory";
import { notify } from "@/lib/notify";
import { orderToken } from "@/lib/order-token";
import { pkr } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import type { FormState } from "./auth";
import { run, str } from "./util";

/**
 * Manual payment receipts (client request): staff confirm the money arrived, or reject the receipt (reason
 * optional). Confirming commits the stock, marks the order paid and awards PB Points; rejecting lets the
 * customer upload a new receipt from their payment link. Both are audited and the customer is told.
 */

async function reviewable(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (o.paymentStatus === "PAID") throw new Error("This order is already paid");
  if (o.paymentStatus !== "UNDER_REVIEW" || !o.payments[0]) throw new Error("There's no receipt waiting on this order");
  return { o, payment: o.payments[0] };
}

export async function confirmPaymentAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const { o, payment } = await reviewable(str(f, "orderId"));
    let onHold = false;
    try {
      await finalizeOrder(o.id, { markPaid: true, staffId: staff.id });
    } catch (e) {
      if (!(e instanceof StockError)) throw e;
      // Paid, but an item sold out meanwhile: keep the money on record and put the order on hold for a call.
      onHold = true;
      await db.order.update({ where: { id: o.id }, data: { paymentStatus: "PAID", fulfilmentStatus: "ON_HOLD" } });
    }
    await db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", verifiedAt: new Date(), reviewedAt: new Date(), reviewedById: staff.id, reviewNote: null } });
    await audit({ staffId: staff.id, action: "PAYMENT_CONFIRMED", entityType: "ORDER", entityId: o.id, recordLabel: `Order ${o.number}`, after: { method: payment.provider, amount: payment.amount, ref: payment.providerRef, onHold } });
    await notify({
      to: { phone: o.customerPhone, email: o.customerEmail },
      subject: `Payment confirmed — ${o.number}`,
      text: `PB Mobiles: we've received your payment of ${pkr(o.total)} for order ${o.number}. Thank you! ${onHold ? "One item just sold out — we'll call you to arrange a substitute or refund." : "We're preparing your order now."}`,
    }).catch(() => {});
    revalidatePath("/admin/inbox");
    revalidatePath(`/admin/orders/${o.id}`);
    return onHold ? `Payment confirmed for ${o.number} — but an item is out of stock, so the order is ON HOLD. Call the customer.` : `Payment confirmed for ${o.number} — order is now processing.`;
  });
}

export async function rejectPaymentAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const { o, payment } = await reviewable(str(f, "orderId"));
    const reason = str(f, "reason").slice(0, 300) || null;
    await db.$transaction([
      db.payment.update({ where: { id: payment.id }, data: { status: "REJECTED", reviewNote: reason, reviewedAt: new Date(), reviewedById: staff.id } }),
      db.order.update({ where: { id: o.id }, data: { paymentStatus: "PENDING" } }),
    ]);
    await audit({ staffId: staff.id, action: "PAYMENT_REJECTED", entityType: "ORDER", entityId: o.id, recordLabel: `Order ${o.number}`, after: { method: payment.provider, amount: payment.amount, reason } });
    await notify({
      to: { phone: o.customerPhone, email: o.customerEmail },
      subject: `Payment not confirmed — ${o.number}`,
      text: `PB Mobiles: we couldn't confirm your payment for order ${o.number}.${reason ? ` Reason: ${reason}.` : ""} Please upload your receipt again: ${siteUrl()}/checkout/pay?order=${o.number}&t=${orderToken(o.number)}`,
    }).catch(() => {});
    revalidatePath("/admin/inbox");
    revalidatePath(`/admin/orders/${o.id}`);
    return `Receipt rejected for ${o.number}. The customer can upload a new one.`;
  });
}
