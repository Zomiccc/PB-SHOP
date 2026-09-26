"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cartSubtotal, useCart } from "@/store/cart";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { ProductArt } from "../product/ProductArt";

type Props = {
  shipping: { flatFee: number; freeOver: number };
  pointsPerRupees: number;
  defaults: { name?: string; phone?: string; email?: string };
};

type Errors = Record<string, string[] | undefined>;

export function CheckoutForm({ shipping, pointsPerRupees, defaults }: Props) {
  const items = useCart((s) => s.items);
  // Cart rehydrates from localStorage after mount; the server always renders the loading state.
  const hydrated = useSyncExternalStore(
    (cb) => useCart.persist.onFinishHydration(cb),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
  const [fulfilment, setFulfilment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [method, setMethod] = useState<PaymentMethod>("MOBILE_WALLET");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gatewayForm, setGatewayForm] = useState<{ action: string; fields: Record<string, string> } | null>(null);
  const gwRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (gatewayForm) gwRef.current?.submit();
  }, [gatewayForm]);

  const subtotal = cartSubtotal(items);
  const fee = fulfilment === "PICKUP" || subtotal >= shipping.freeOver ? 0 : shipping.flatFee;
  const total = subtotal + fee;
  const err = (k: string) => errors[k]?.[0];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          name: f.get("name"),
          phone: f.get("phone"),
          email: f.get("email"),
          fulfilment,
          address: f.get("address") ?? undefined,
          city: f.get("city") ?? undefined,
          method,
          agree: f.get("agree") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Something went wrong");
        return;
      }
      // The bag is cleared on the result page once the order is confirmed, so a failed payment keeps it.
      if (data.next.kind === "redirect") window.location.href = data.next.url;
      else setGatewayForm({ action: data.next.action, fields: data.next.fields });
    } catch {
      setFormError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="container-pb h-96 animate-pulse" />;

  if (items.length === 0 && !gatewayForm) {
    return (
      <div className="container-pb grid place-items-center py-24 text-center">
        <Icon name="bag" className="h-10 w-10 text-muted" />
        <p className="mt-4 text-lg font-semibold">Your bag is empty.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/new-phones" className="btn btn-primary">Shop phones</Link>
          <Link href="/accessories" className="btn btn-ghost text-ink"><span>Accessories</span></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {gatewayForm && (
        <form ref={gwRef} action={gatewayForm.action} method="POST" className="hidden">
          {Object.entries(gatewayForm.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
      <form onSubmit={submit} noValidate className="container-pb grid gap-10 pb-24 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {formError && <p role="alert" className="rounded-xl bg-red/10 px-4 py-3 text-sm text-red">{formError}</p>}

          <Panel n="01" title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={err("name")}>
                <input name="name" defaultValue={defaults.name} autoComplete="name" className="field" aria-invalid={!!err("name")} />
              </Field>
              <Field label="Mobile number" error={err("phone")}>
                <input name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" placeholder="0300 1234567" className="field" aria-invalid={!!err("phone")} />
              </Field>
              <Field label="Email (for receipt, optional)" error={err("email")} className="sm:col-span-2">
                <input name="email" type="email" defaultValue={defaults.email} autoComplete="email" className="field" aria-invalid={!!err("email")} />
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted">Your phone number links this order to your PB Phone Passport so you earn points automatically.</p>
          </Panel>

          <Panel n="02" title="Delivery">
            <div className="grid grid-cols-2 gap-3">
              {(["DELIVERY", "PICKUP"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFulfilment(f)}
                  aria-pressed={fulfilment === f}
                  className={cn("rounded-xl border p-4 text-left transition", fulfilment === f ? "border-blue bg-blue/5 ring-1 ring-blue" : "border-ink/15 hover:border-ink/40")}
                >
                  <Icon name={f === "DELIVERY" ? "truck" : "pin"} className="h-5 w-5 text-blue" />
                  <p className="mt-2 font-semibold">{f === "DELIVERY" ? "Home delivery" : "Collect in store"}</p>
                  <p className="text-xs text-muted">{f === "DELIVERY" ? (subtotal >= shipping.freeOver ? "Free" : pkr(shipping.flatFee)) : "Free"}</p>
                </button>
              ))}
            </div>
            {fulfilment === "DELIVERY" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field label="Address" error={err("address")}>
                  <input name="address" autoComplete="street-address" className="field" aria-invalid={!!err("address")} />
                </Field>
                <Field label="City" error={err("city")}>
                  <input name="city" autoComplete="address-level2" className="field" aria-invalid={!!err("city")} />
                </Field>
              </div>
            )}
          </Panel>

          <Panel n="03" title="Payment">
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  aria-pressed={method === m}
                  className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition", method === m ? "border-blue bg-blue/5 ring-1 ring-blue" : "border-ink/15 hover:border-ink/40")}
                >
                  <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border", method === m ? "border-blue bg-blue" : "border-ink/30")}>
                    {method === m && <span className="h-2 w-2 rounded-full bg-card" />}
                  </span>
                  <span>
                    <span className="block font-semibold">{PAYMENT_METHODS[m].label}</span>
                    <span className="text-xs text-muted">{PAYMENT_METHODS[m].hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted">
              <Icon name="shield" className="h-4 w-4 text-emerald-600" />
              {method === "COD" ? "Pay in cash when your order arrives or at collection." : "You'll complete payment on the gateway's secure page. PB Mobiles never sees or stores your card or bank details."}
            </p>
          </Panel>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <div className="rounded-3xl bg-navy-950 p-6 text-white">
            <h2 className="display text-2xl">Order summary</h2>
            <ul className="mt-5 space-y-4">
              {items.map((i) => (
                <li key={i.variantId} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                    <ProductArt kind={i.kind} accessoryType={i.accessoryType} colorHex={i.colorHex} name={i.name} compact />
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[0.65rem] font-bold text-navy-950">{i.qty}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{i.name}</p>
                    <p className="truncate text-xs text-white/50">{i.variantLabel}</p>
                  </div>
                  <p className="text-sm font-semibold">{pkr(i.price * i.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between text-white/70"><dt>Subtotal</dt><dd>{pkr(subtotal)}</dd></div>
              <div className="flex justify-between text-white/70"><dt>Delivery</dt><dd>{fee ? pkr(fee) : "Free"}</dd></div>
              <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd>{pkr(total)}</dd></div>
            </dl>
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-gold">
              <Icon name="gift" className="h-4 w-4" /> You&apos;ll earn about {Math.floor(subtotal / pointsPerRupees)} Passport points
            </p>
            <label className="mt-5 flex items-start gap-3 text-xs text-white/70">
              <input type="checkbox" name="agree" className="mt-0.5 h-4 w-4 accent-[var(--color-gold)]" aria-invalid={!!err("agree")} />
              <span>
                I agree to the <Link href="/terms" className="text-gold underline">Terms &amp; Conditions</Link> and <Link href="/returns" className="text-gold underline">returns policy</Link>.
                {err("agree") && <span className="block text-red">{err("agree")}</span>}
              </span>
            </label>
            <button disabled={busy} className="btn btn-red mt-5 w-full !py-4 disabled:opacity-60">
              {busy ? "Processing…" : method === "COD" ? `Place order · ${pkr(total)}` : `Pay securely · ${pkr(total)}`}
            </button>
          </div>
        </aside>
      </form>
    </>
  );
}

function Panel({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 md:p-8">
      <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold">
        <span className="font-mono text-xs text-red">{n}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red">{error}</span>}
    </label>
  );
}
