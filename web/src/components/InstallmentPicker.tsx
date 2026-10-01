"use client";

import { useEffect, useRef, useState } from "react";
import type { Brand } from "@/lib/brands";
import type { FinancingConfig } from "@/lib/finance";
import { cn, pkr } from "@/lib/format";
import { FinanceCalculator } from "./FinanceCalculator";
import { ProductArt } from "./product/ProductArt";
import { Icon } from "./ui/Icon";

export type PickerListing = {
  id: string;
  brand: string | null;
  model: string;
  imageUrl: string | null;
  regularPrice: number;
  installmentTotal: number;
  downPayment: number;
  durationMonths: number;
  interestPercent: number;
  planLabel: string | null;
  availability: string;
};

const AVAIL: Record<string, { label: string; tone: string }> = {
  AVAILABLE: { label: "Available", tone: "bg-emerald-500/15 text-emerald-300" },
  LIMITED: { label: "Limited stock", tone: "bg-gold/20 text-gold-soft" },
  OUT_OF_STOCK: { label: "Out of stock", tone: "bg-red/15 text-red" },
};

const monthly = (l: PickerListing) => Math.ceil(Math.max(0, l.installmentTotal - l.downPayment) / Math.max(1, l.durationMonths));

/**
 * Installments, step by step: 1. choose the brand (logo tiles) → 2. choose the model → 3. see the
 * store's plan and the calculator for that phone. Purchases are completed in store with a CNIC.
 */
export function InstallmentPicker({ brands, listings, config, initialBrand, initialPlan }: { brands: Brand[]; listings: PickerListing[]; config: FinancingConfig; initialBrand?: string; initialPlan?: string }) {
  const startPlan = listings.find((l) => l.id === initialPlan);
  const [brand, setBrand] = useState<string | null>(startPlan?.brand ?? initialBrand ?? null);
  const [planId, setPlanId] = useState<string | null>(startPlan?.id ?? null);
  const modelsRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const count = (slug: string) => listings.filter((l) => l.brand === slug).length;
  const models = listings.filter((l) => l.brand === brand);
  const plan = listings.find((l) => l.id === planId) ?? null;
  const current = brands.find((b) => b.slug === brand);

  // Keep the choice in the URL so it can be shared / reopened.
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.delete("price");
    u.searchParams.delete("name");
    if (brand) u.searchParams.set("brand", brand);
    else u.searchParams.delete("brand");
    if (planId) u.searchParams.set("plan", planId);
    else u.searchParams.delete("plan");
    history.replaceState(null, "", u);
  }, [brand, planId]);

  const scrollTo = (el: HTMLElement | null) => setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  return (
    <div className="space-y-10">
      {/* 1 — brand */}
      <section aria-labelledby="step-brand">
        <Step n={1} id="step-brand" title="Select brand" />
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {brands.map((b) => {
            const n = count(b.slug);
            return (
              <button
                key={b.slug}
                type="button"
                onClick={() => {
                  setBrand(b.slug);
                  setPlanId(null);
                  scrollTo(modelsRef.current);
                }}
                aria-pressed={brand === b.slug}
                className={cn("group overflow-hidden rounded-2xl text-left ring-1 transition", brand === b.slug ? "ring-2 ring-gold" : "ring-white/10 hover:ring-gold/60")}
              >
                <BrandMark b={b} />
                <span className="flex items-center justify-between bg-card px-2.5 py-1.5 text-[0.7rem]">
                  <span className={n ? "text-white/80" : "text-white/40"}>{n ? `${n} phone${n > 1 ? "s" : ""}` : "Coming soon"}</span>
                  {brand === b.slug && <Icon name="check" className="h-3.5 w-3.5 text-gold" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 — model */}
      <section ref={modelsRef} aria-labelledby="step-model" className="scroll-mt-24">
        <Step n={2} id="step-model" title={current ? `Select ${current.name} model` : "Select model"} />
        {!brand ? (
          <p className="mt-4 rounded-2xl bg-card p-5 text-sm text-muted ring-1 ring-white/10">Choose a brand above to see its phones on installments.</p>
        ) : models.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-card p-5 text-sm text-muted ring-1 ring-white/10">No {current?.name ?? brand} phones on installments right now — ask us in store or on chat, we may be able to arrange one.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={l.availability === "OUT_OF_STOCK"}
                  onClick={() => {
                    setPlanId(l.id);
                    scrollTo(planRef.current);
                  }}
                  aria-pressed={planId === l.id}
                  className={cn("flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left ring-1 transition disabled:opacity-50", planId === l.id ? "ring-2 ring-gold" : "ring-white/10 hover:ring-gold/60")}
                >
                  <span className="h-20 w-14 shrink-0">
                    {l.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <ProductArt kind="PHONE" colorHex="#3a3f4a" name={l.model} compact />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${AVAIL[l.availability]?.tone ?? AVAIL.AVAILABLE.tone}`}>{AVAIL[l.availability]?.label ?? l.availability}</span>
                    <span className="mt-1 block font-semibold leading-snug">{l.model}</span>
                    <span className="block text-xs text-muted">Cash price {pkr(l.regularPrice)}</span>
                    <span className="mt-1 block text-sm"><b className="text-gold">{pkr(monthly(l))}</b><span className="text-white/60">/month · {l.durationMonths} months</span></span>
                  </span>
                  <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-white/50" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3 — plan + calculator */}
      <section ref={planRef} id="calculator" aria-labelledby="step-plan" className="scroll-mt-24">
        <Step n={3} id="step-plan" title="Your installment plan" />
        {plan ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-[var(--radius-card)] bg-gradient-to-br from-gold/15 to-transparent p-5 ring-1 ring-gold/40">
              <p className="text-xs uppercase tracking-wider text-gold-soft">PB Mobiles plan</p>
              <p className="mt-1 text-lg font-semibold">{plan.model}</p>
              <p className="display mt-4 text-4xl text-gold">{pkr(monthly(plan))}<span className="text-base text-white/60"> /month</span></p>
              <dl className="mt-4 space-y-2 text-sm">
                <Fact k="Down payment (in store)" v={pkr(plan.downPayment)} />
                <Fact k="Plan" v={plan.planLabel || `${plan.durationMonths} monthly payments`} />
                <Fact k="Total on plan" v={pkr(plan.installmentTotal)} />
                <Fact k="Cash price" v={pkr(plan.regularPrice)} />
              </dl>
              <p className="mt-4 text-xs text-white/55">Want a different down payment or number of months? Use the calculator.</p>
            </div>
            <FinanceCalculator key={plan.id} config={config} initialPrice={plan.regularPrice} productName={plan.model} bookable />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-card p-5 text-sm text-muted ring-1 ring-white/10">Choose a model to see its monthly payment and try different down payments.</p>
        )}
      </section>
    </div>
  );
}

function Step({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-xl font-semibold md:text-2xl">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-sm font-bold text-[#120d02]">{n}</span>
      {title}
    </h2>
  );
}

/** Brand tile: the official logo if one has been added, otherwise a brand-coloured wordmark. */
export function BrandMark({ b }: { b: Brand }) {
  return (
    <span className="grid aspect-[1.6] place-items-center px-2" style={{ background: b.bg, color: b.fg }}>
      {b.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logo} alt={b.name} className="max-h-[55%] max-w-[80%] object-contain" />
      ) : (
        <span className={cn("text-center text-[clamp(0.95rem,3.6vw,1.35rem)] font-extrabold leading-none tracking-tight", b.lower && "lowercase", b.italic && "italic")}>{b.name}</span>
      )}
    </span>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/10 pb-2">
      <dt className="text-white/60">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
