import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentProvider } from "@/lib/payments";
import { finalizeOrder } from "@/lib/orders";
import { StockError } from "@/lib/inventory";
import { orderToken } from "@/lib/order-token";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

/**
 * Gateway return / IPN endpoint (§3). The gateway response is verified server-side (signature +
 * amount) before any order is confirmed. Handles success, pending and failed states idempotently.
 */
async function handle(req: Request, params: Record<string, string>) {
  const result = await paymentProvider().verify(params);
  const order = await db.order.findUnique({ where: { number: result.orderNumber ?? "" }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  if (!order) return NextResponse.redirect(`${site}/checkout/result?error=unknown`, 303);

  const payment = order.payments[0];
  let status = result.status;
  if (status === "SUCCESS" && result.amount != null && result.amount !== order.total) {
    status = "FAILED";
    result.message = `Amount mismatch: paid ${result.amount}, expected ${order.total}`;
  }

  // Forged/unsigned callbacks are logged and ignored. Repeated callbacks for a paid order change nothing.
  if (!result.verified) {
    await audit({ action: "PAYMENT_CALLBACK_REJECTED", entityType: "ORDER", entityId: order.id, recordLabel: `Order ${order.number}`, after: { message: result.message } });
  } else if (order.paymentStatus !== "PAID") {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: status === "SUCCESS" ? "SUCCESS" : status === "PENDING" ? "PENDING" : "FAILED",
        providerRef: result.providerRef,
        rawResponse: JSON.stringify(result.raw),
        verifiedAt: new Date(),
      },
    });

    if (status === "SUCCESS") {
      try {
        await finalizeOrder(order.id, { markPaid: true });
        await notify({ to: { phone: order.customerPhone, email: order.customerEmail }, subject: `Order ${order.number} confirmed`, text: `PB Mobiles: payment received — your order ${order.number} (Rs ${order.total}) is confirmed. Thank you!` });
      } catch (e) {
        if (!(e instanceof StockError)) throw e;
        // Paid but sold out in the meantime (e.g. last used phone) — hold for staff to refund or substitute.
        await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", fulfilmentStatus: "ON_HOLD" } });
        await audit({ action: "ORDER_ON_HOLD_STOCK", entityType: "ORDER", entityId: order.id, recordLabel: `Order ${order.number}`, after: { reason: e.message } });
      }
    } else if (status === "FAILED") {
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    }
  }

  return NextResponse.redirect(`${site}/checkout/result?order=${order.number}&t=${orderToken(order.number)}`, 303);
}

export async function GET(req: Request) {
  return handle(req, Object.fromEntries(new URL(req.url).searchParams));
}

export async function POST(req: Request) {
  const form = await req.formData();
  return handle(req, Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])));
}
