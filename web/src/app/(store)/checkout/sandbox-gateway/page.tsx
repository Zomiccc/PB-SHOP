import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signSandbox } from "@/lib/payments";
import { pkr } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";

export const metadata: Metadata = { title: "Test payment gateway", robots: { index: false } };

/**
 * Local stand-in for the hosted payment page so success / pending / failed flows can be tested
 * before merchant credentials exist. Disabled automatically when PAYMENT_PROVIDER is not SANDBOX.
 */
export default async function SandboxGateway(props: PageProps<"/checkout/sandbox-gateway">) {
  if ((process.env.PAYMENT_PROVIDER ?? "SANDBOX") !== "SANDBOX") notFound();
  const sp = await props.searchParams;
  const order = String(sp.order ?? "");
  const amount = String(sp.amount ?? "0");
  const method = String(sp.method ?? "MOBILE_WALLET") as PaymentMethod;
  const ref = `SBX-${order}`;
  const link = (status: string) =>
    `/api/payments/callback?${new URLSearchParams({ order, amount, status, ref, sig: signSandbox(order, status) })}`;

  return (
    <div className="container-pb grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-lift)]">
        <div className="bg-[repeating-linear-gradient(45deg,#d9a62e,#d9a62e_10px,#071a2b_10px,#071a2b_20px)] px-6 py-2 text-center font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white">
          Sandbox — no real money moves
        </div>
        <div className="p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Test payment gateway</p>
          <p className="display mt-3 text-4xl">{pkr(Number(amount))}</p>
          <p className="mt-1 text-sm text-muted">
            Order {order} · {PAYMENT_METHODS[method]?.label ?? method}
          </p>
          <div className="mt-8 grid gap-3">
            <a href={link("success")} className="btn bg-emerald-600 text-white hover:bg-emerald-700">Simulate successful payment</a>
            <a href={link("pending")} className="btn btn-gold">Simulate pending payment</a>
            <a href={link("failed")} className="btn btn-red">Simulate failed payment</a>
          </div>
          <p className="mt-6 text-xs text-muted">
            In production this page is replaced by the selected gateway&apos;s hosted checkout (e.g. JazzCash), which posts its signed response back to
            <code className="mx-1 rounded bg-cream px-1">/api/payments/callback</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
