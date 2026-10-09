import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { verifyOrderToken } from "@/lib/order-token";
import { AttachmentError, saveAttachment } from "@/lib/attachments";
import { PAYMENT_ACCOUNTS, isManualMethod } from "@/lib/payment-accounts";
import { notifyStaff } from "@/lib/notify";
import { pkr } from "@/lib/format";

/**
 * The customer uploads their payment receipt (client request): Easypaisa / JazzCash / Faysal Bank transfer.
 * Only with the order's private link (order number + token). The order becomes "Payment under review" until
 * staff confirm or reject it in Admin → Inbox → Payments. A rejected receipt can be replaced with a new one.
 */
export async function POST(req: Request) {
  if (!rateLimit(`proof:${ipFrom(req)}`, 12, 600_000).ok) return NextResponse.json({ error: "Too many uploads — please try again in a few minutes." }, { status: 429 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please choose your receipt and try again." }, { status: 400 });
  const number = String(form.get("order") ?? "");
  const token = String(form.get("t") ?? "");
  const method = String(form.get("method") ?? "");
  const reference = String(form.get("reference") ?? "").trim().slice(0, 80) || null;
  const file = form.get("file");
  if (!number || !verifyOrderToken(number, token)) return NextResponse.json({ error: "This payment link isn't valid." }, { status: 403 });
  if (!isManualMethod(method)) return NextResponse.json({ error: "Choose how you paid." }, { status: 422 });
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Attach a screenshot or PDF of your payment receipt.", fields: { file: ["Attach your receipt"] } }, { status: 422 });

  const order = await db.order.findUnique({ where: { number }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentStatus === "PAID") return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  if (order.paymentStatus === "CANCELLED" || order.fulfilmentStatus === "CANCELLED") return NextResponse.json({ error: "This order was cancelled." }, { status: 409 });

  try {
    await db.$transaction(async (tx) => {
      await saveAttachment(file, { kind: "PAYMENT_PROOF", orderId: order.id, sensitive: false }, tx);
      const data = { provider: method, method: method === "FAYSAL" ? "BANK_TRANSFER" : "MOBILE_WALLET", providerRef: reference, status: "SUBMITTED", submittedAt: new Date(), reviewNote: null, reviewedAt: null, reviewedById: null };
      // A rejected receipt keeps its record (with the reason); a new upload starts a fresh payment attempt.
      if (order.payments[0] && order.payments[0].status !== "REJECTED") await tx.payment.update({ where: { id: order.payments[0].id }, data });
      else await tx.payment.create({ data: { orderId: order.id, amount: order.total, ...data } });
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "UNDER_REVIEW" } });
    });
  } catch (e) {
    if (e instanceof AttachmentError) return NextResponse.json({ error: e.message, fields: { file: [e.message] } }, { status: 422 });
    throw e;
  }
  await notifyStaff(
    `Payment receipt for ${order.number}`,
    `${order.customerName} (${order.customerPhone}) uploaded a ${PAYMENT_ACCOUNTS[method].label} receipt for ${order.number} — ${pkr(order.total)}${reference ? `, ref ${reference}` : ""}. Review it in Admin → Inbox → Payments.`,
  ).catch(() => {});
  return NextResponse.json({ ok: true });
}
