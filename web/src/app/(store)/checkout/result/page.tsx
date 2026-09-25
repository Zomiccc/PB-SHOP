import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { verifyOrderToken } from "@/lib/order-token";
import { pkr } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ClearCart } from "@/components/cart/ClearCart";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Clear order confirmation with successful / pending / failed states (§3, §10). */
export default async function ResultPage(props: PageProps<"/checkout/result">) {
  const sp = await props.searchParams;
  const number = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const order =
    number && verifyOrderToken(number, token)
      ? await db.order.findUnique({ where: { number }, include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 }, careCard: true } })
      : null;

  if (!order) {
    return (
      <Shell tone="red" icon="close" title="We couldn't find that order." body="If you completed a payment, please contact us with your payment reference and we'll sort it out.">
        <Link href="/contact" className="btn btn-primary">Contact us</Link>
      </Shell>
    );
  }

  const payment = order.payments[0];
  const cod = payment?.method === "COD";
  const state = order.paymentStatus === "PAID" || (cod && order.stockCommitted) ? "success" : order.paymentStatus === "FAILED" ? "failed" : "pending";

  const details = (
    <div className="mt-8 w-full rounded-2xl bg-cream p-5 text-left text-sm">
      <div className="flex justify-between"><span className="text-muted">Order</span><b>{order.number}</b></div>
      <div className="mt-2 flex justify-between"><span className="text-muted">Total</span><b>{pkr(order.total)}</b></div>
      <div className="mt-2 flex justify-between"><span className="text-muted">Payment</span><b>{cod ? "Cash on delivery" : payment?.status}</b></div>
      {payment?.providerRef && <div className="mt-2 flex justify-between"><span className="text-muted">Transaction ref</span><b className="font-mono text-xs">{payment.providerRef}</b></div>}
      <ul className="mt-4 space-y-1 border-t border-ink/10 pt-3">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4">
            <span className="truncate">{i.qty} × {i.name}</span>
            <span>{pkr(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (state === "success") {
    return (
      <Shell tone="green" icon="check" title={cod ? "Order placed!" : "Payment successful!"} body={`Thank you, ${order.customerName.split(" ")[0]}. We've received your order and will confirm on ${order.customerPhone}.`}>
        <ClearCart />
        {order.fulfilmentStatus === "ON_HOLD" && (
          <p className="mt-6 rounded-xl bg-gold/15 p-3 text-sm text-[#7a570c]">One item sold out while you were paying. Our team will call you to arrange a substitute or full refund.</p>
        )}
        {order.careCard && (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-navy-950 p-3 text-sm text-gold">
            <Icon name="shield" className="h-4 w-4" /> PB Care Card {order.careCard.number} issued with this order.
          </p>
        )}
        {details}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/account" className="btn btn-primary">View my Passport</Link>
          <Link href="/" className="btn btn-ghost text-navy-950"><span>Keep shopping</span></Link>
        </div>
      </Shell>
    );
  }
  if (state === "pending") {
    return (
      <Shell tone="gold" icon="clock" title="Payment pending." body="Your payment is being confirmed by the gateway. This usually takes a few minutes — we'll confirm your order as soon as it's verified.">
        {details}
        <div className="mt-8 flex justify-center gap-3">
          <Link href={`/checkout/result?order=${order.number}&t=${token}`} className="btn btn-primary">Refresh status</Link>
        </div>
      </Shell>
    );
  }
  return (
    <Shell tone="red" icon="close" title="Payment failed." body="No money was taken for this order. You can try again with a different payment method — your bag has been kept.">
      {details}
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/checkout" className="btn btn-red">Try again</Link>
        <Link href="/contact" className="btn btn-ghost text-navy-950"><span>Get help</span></Link>
      </div>
    </Shell>
  );
}

function Shell({ tone, icon, title, body, children }: { tone: "green" | "gold" | "red"; icon: string; title: string; body: string; children?: React.ReactNode }) {
  const color = tone === "green" ? "bg-emerald-600" : tone === "gold" ? "bg-gold" : "bg-red";
  return (
    <div className="container-pb grid min-h-[70vh] place-items-center py-16">
      <div className="flex w-full max-w-lg flex-col items-center rounded-3xl bg-white p-8 text-center shadow-[var(--shadow-lift)] md:p-12">
        <span className={`grid h-16 w-16 place-items-center rounded-full text-white ${color}`}>
          <Icon name={icon} className="h-8 w-8" strokeWidth={2.5} />
        </span>
        <h1 className="display mt-6 text-4xl">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}
