import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { verifyOrderToken } from "@/lib/order-token";
import { pkr } from "@/lib/format";
import { PAYMENT_ACCOUNTS, isManualMethod } from "@/lib/payment-accounts";
import { Icon } from "@/components/ui/Icon";
import { ClearCart } from "@/components/cart/ClearCart";
import { PaymentPanel } from "@/components/cart/PaymentPanel";

export const metadata: Metadata = { title: "Complete your payment", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * After checkout (client request): pay our Easypaisa / JazzCash / Faysal Bank account, upload the receipt, then
 * the order waits as "Payment under review" until staff confirm it. Opened with the order's private link.
 */
export default async function PayPage(props: PageProps<"/checkout/pay">) {
  const sp = await props.searchParams;
  const number = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const order =
    number && verifyOrderToken(number, token)
      ? await db.order.findUnique({ where: { number }, include: { items: true, payments: { orderBy: { createdAt: "desc" } } } })
      : null;

  if (!order) {
    return (
      <Shell tone="red" icon="close" title="We couldn't find that order." body="Please use the link from your order message, or contact us with your order number.">
        <Link href="/contact" className="btn btn-primary mt-6">Contact us</Link>
      </Shell>
    );
  }

  const latest = order.payments[0];
  const rejected = order.payments.find((p) => p.status === "REJECTED" && (!latest || latest.id === p.id));
  const method = isManualMethod(latest?.provider) ? latest.provider : "EASYPAISA";
  const first = order.customerName.split(" ")[0];

  const summary = (
    <div className="mt-8 w-full rounded-2xl bg-black/30 p-5 text-left text-sm ring-1 ring-white/10">
      <div className="flex justify-between"><span className="text-white/55">Order</span><b>{order.number}</b></div>
      <div className="mt-2 flex justify-between"><span className="text-white/55">Total</span><b className="text-gold">{pkr(order.total)}</b></div>
      {latest?.providerRef && <div className="mt-2 flex justify-between"><span className="text-white/55">Transaction ID</span><b className="font-mono text-xs">{latest.providerRef}</b></div>}
      <ul className="mt-4 space-y-1 border-t border-white/10 pt-3">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4">
            <span className="truncate">{i.qty} × {i.name}</span>
            <span className="shrink-0">{pkr(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (order.paymentStatus === "PAID") {
    return (
      <Shell tone="green" icon="check" title="Payment confirmed!" body={`Thank you, ${first}. We've confirmed your payment for ${order.number} and are preparing your order.`}>
        <ClearCart />
        {summary}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/account" className="btn btn-primary">My account</Link>
          <Link href="/" className="btn border border-white/20 text-white hover:border-white/50">Keep shopping</Link>
        </div>
      </Shell>
    );
  }
  if (order.paymentStatus === "CANCELLED" || order.fulfilmentStatus === "CANCELLED") {
    return (
      <Shell tone="red" icon="close" title="This order was cancelled." body="If you already paid, please contact us with your receipt and we'll sort it out straight away.">
        {summary}
        <Link href="/contact" className="btn btn-primary mt-6">Contact us</Link>
      </Shell>
    );
  }
  if (order.paymentStatus === "UNDER_REVIEW") {
    return (
      <Shell tone="gold" icon="clock" title="Payment under review." body={`Thanks, ${first}! We've received your ${isManualMethod(latest?.provider) ? PAYMENT_ACCOUNTS[latest.provider].label : ""} receipt. Our team is checking it — we'll confirm your order on ${order.customerPhone} as soon as the payment shows in our account.`}>
        <ClearCart />
        {summary}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/checkout/pay?order=${order.number}&t=${token}`} className="btn btn-primary">Refresh status</Link>
          <Link href="/" className="btn border border-white/20 text-white hover:border-white/50">Keep shopping</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell tone="gold" icon="card" title={rejected ? "Please send your receipt again." : "Complete your payment."} body={rejected ? "We couldn't confirm your last receipt." : `Order ${order.number} is placed, ${first}. Pay the exact total below, then upload your receipt — we'll confirm your order once we've checked it.`} wide>
      <ClearCart />
      {rejected && (
        <p className="mt-5 w-full rounded-xl bg-red/10 p-4 text-left text-sm text-red ring-1 ring-red/30">
          <b>Receipt not accepted.</b> {rejected.reviewNote ? `Reason: ${rejected.reviewNote}` : "Please check the amount and account, then upload a clear receipt."}
        </p>
      )}
      <div className="mt-6 w-full">
        <PaymentPanel order={order.number} token={token} total={order.total} initialMethod={method} />
      </div>
      {summary}
    </Shell>
  );
}

function Shell({ tone, icon, title, body, wide, children }: { tone: "green" | "gold" | "red"; icon: string; title: string; body: string; wide?: boolean; children?: React.ReactNode }) {
  const color = tone === "green" ? "bg-emerald-600" : tone === "gold" ? "bg-gold text-[#120d02]" : "bg-red";
  return (
    <div className="container-pb grid min-h-[70vh] place-items-center py-12 md:py-16">
      <div className={`flex w-full ${wide ? "max-w-2xl" : "max-w-lg"} flex-col items-center rounded-3xl bg-card p-5 text-center ring-1 ring-white/10 sm:p-8 md:p-10`}>
        <span className={`grid h-14 w-14 place-items-center rounded-full text-white ${color}`}>
          <Icon name={icon} className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <h1 className="display mt-5 text-3xl md:text-4xl">{title}</h1>
        <p className="mt-3 text-white/70">{body}</p>
        {children}
      </div>
    </div>
  );
}
