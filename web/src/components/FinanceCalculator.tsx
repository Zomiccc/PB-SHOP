"use client";

import Link from "next/link";
import { useState } from "react";
import { minDownPayment, quote, termList, type FinancingConfig } from "@/lib/finance";
import { cn, pkr } from "@/lib/format";
import { Icon } from "./ui/Icon";

type PhoneOption = { slug: string; name: string; price: number };

/**
 * Installment calculator: choose a phone (or type a price), set the down payment, pick a plan,
 * and see the per-installment amount with a full breakdown. Rates come from Admin → Settings.
 */
export function FinanceCalculator({ config, phones, initialPrice, productName, compact = false }: { config: FinancingConfig; phones?: PhoneOption[]; initialPrice?: number; productName?: string; compact?: boolean }) {
  const terms = termList(config);
  const eligiblePhones = (phones ?? []).filter((p) => p.price >= config.minPrice);
  const [slug, setSlug] = useState(eligiblePhones[0]?.slug ?? "");
  const [customPrice, setCustomPrice] = useState(initialPrice ?? eligiblePhones[0]?.price ?? 100000);
  const price = phones && slug ? (eligiblePhones.find((p) => p.slug === slug)?.price ?? customPrice) : customPrice;
  const minDp = minDownPayment(price, config);
  const [dpPercent, setDpPercent] = useState(config.minDownPaymentPercent);
  const [term, setTerm] = useState(terms[terms.length - 1] ?? 6);

  const q = quote(price, Math.round((price * dpPercent) / 100), term, config);
  const unit = config.period === "WEEKLY" ? "week" : "month";
  const tooCheap = price < config.minPrice;

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-card)] bg-navy-950 text-white", compact ? "" : "shadow-[var(--shadow-lift)]")}>
      <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
        {/* Inputs */}
        <div className="space-y-6 p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold">Installment calculator</p>
            <Icon name="card" className="h-5 w-5 text-gold" />
          </div>

          {phones ? (
            <label className="block">
              <span className="label !text-white/60">Phone</span>
              <select value={slug} onChange={(e) => setSlug(e.target.value)} className="field field-dark">
                {eligiblePhones.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name} — {pkr(p.price)}</option>
                ))}
                <option value="">Other amount…</option>
              </select>
            </label>
          ) : productName ? (
            <p className="text-sm text-white/70">{productName} · <b className="text-white">{pkr(price)}</b></p>
          ) : null}

          {(!phones || !slug) && !productName && (
            <label className="block">
              <span className="label !text-white/60">Phone price (Rs)</span>
              <input type="number" inputMode="numeric" min={0} value={customPrice || ""} onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value) || 0))} className="field field-dark" />
            </label>
          )}

          <div>
            <div className="flex items-end justify-between">
              <span className="label !mb-0 !text-white/60">Down payment</span>
              <span className="text-sm font-semibold">{pkr(q.downPayment)} <span className="text-white/50">({dpPercent}%)</span></span>
            </div>
            <input
              type="range"
              min={config.minDownPaymentPercent}
              max={90}
              step={5}
              value={dpPercent}
              onChange={(e) => setDpPercent(Number(e.target.value))}
              aria-label="Down payment percentage"
              className="mt-3 w-full accent-[var(--color-gold)]"
            />
            <p className="mt-1 text-xs text-white/45">Minimum {config.minDownPaymentPercent}% ({pkr(minDp)})</p>
          </div>

          <fieldset>
            <legend className="label !text-white/60">Plan</legend>
            <div className="flex flex-wrap gap-2">
              {terms.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  aria-pressed={term === t}
                  className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", term === t ? "border-gold bg-gold text-navy-950" : "border-white/20 hover:border-white/50")}
                >
                  {t} {unit}s
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Result */}
        <div className="border-t border-white/10 bg-white/[0.03] p-5 md:p-7 lg:border-l lg:border-t-0">
          {tooCheap ? (
            <p className="text-sm text-white/70">Installments are available on phones from {pkr(config.minPrice)}.</p>
          ) : (
            <>
              <p className="text-sm text-white/60">Pay per {unit}</p>
              <p className="display mt-1 text-5xl text-gold" aria-live="polite">{pkr(q.perInstallment)}</p>
              <p className="mt-1 text-sm text-white/60">for {q.terms} {unit}s</p>

              <dl className="mt-6 space-y-2 text-sm">
                <Row label="Due today" value={pkr(q.dueToday)} strong hint={q.guaranteeDeposit ? `Down payment + ${pkr(q.guaranteeDeposit)} guarantee deposit` : "Down payment"} />
                <Row label="Phone price" value={pkr(q.price)} />
                <Row label="Financed amount" value={pkr(q.financed)} />
                {q.markup > 0 && <Row label="Markup" value={pkr(q.markup)} />}
                {q.serviceFee > 0 && <Row label="Service fee" value={pkr(q.serviceFee)} />}
                {q.riskFee > 0 && <Row label="Risk management fee" value={pkr(q.riskFee)} />}
                <Row label="Total of installments" value={pkr(q.perInstallment * q.terms)} />
                <Row label="Total you pay" value={pkr(q.totalCost + q.guaranteeDeposit)} strong hint={q.extraCost > 0 ? `${pkr(q.extraCost)} more than the cash price${q.guaranteeDeposit ? " (deposit refundable per partner terms)" : ""}` : undefined} />
              </dl>

              {!compact && (
                <Link href="/contact?subject=Installment%20enquiry" className="btn btn-red mt-6 w-full">
                  Apply in store <Icon name="arrow-up-right" className="h-4 w-4" />
                </Link>
              )}
              <p className="mt-4 text-xs leading-relaxed text-white/45">
                Financing by {config.partnerName}. {config.disclaimer}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, hint }: { label: string; value: string; strong?: boolean; hint?: string }) {
  return (
    <div className="border-b border-white/5 pb-2">
      <div className="flex justify-between gap-4">
        <dt className="text-white/60">{label}</dt>
        <dd className={strong ? "font-bold text-white" : "text-white/90"}>{value}</dd>
      </div>
      {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
    </div>
  );
}
