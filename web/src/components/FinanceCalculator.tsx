"use client";

import Link from "next/link";
import { useState } from "react";
import { downPaymentList, quote, termList, type FinancingConfig } from "@/lib/finance";
import { cn, pkr } from "@/lib/format";
import { Icon } from "./ui/Icon";
import { choosePlan } from "./InstallmentRequestForm";

type PhoneOption = { slug: string; name: string; price: number };

/**
 * Installment calculator laid out like the financing partner's app ("Product Price Center"):
 * pick a down-payment option, pick the number of terms, see the monthly payment. Same formula as the
 * app (flat monthly markup on the financed amount, rounded to the rupee). Informational only — installment
 * purchases are completed in store with the customer's CNIC (master brief §3).
 */
export function FinanceCalculator({ config, phones, initialPrice, initialSlug, productName, compact = false, bookable = false }: { config: FinancingConfig; phones?: PhoneOption[]; initialPrice?: number; initialSlug?: string; productName?: string; compact?: boolean; /** Show "Book an appointment with this plan" (Installments page, v6 §7). */ bookable?: boolean }) {
  const terms = termList(config);
  const downOptions = downPaymentList(config);
  const eligiblePhones = (phones ?? []).filter((p) => p.price >= config.minPrice);
  // Start on the phone picked on the page (or a price from a product page → "Other amount").
  const [slug, setSlug] = useState(initialSlug && eligiblePhones.some((p) => p.slug === initialSlug) ? initialSlug : initialPrice ? "" : eligiblePhones[0]?.slug ?? "");
  const [customPrice, setCustomPrice] = useState(initialPrice ?? eligiblePhones[0]?.price ?? 100000);
  const price = phones && slug ? (eligiblePhones.find((p) => p.slug === slug)?.price ?? customPrice) : customPrice;
  const [dpPercent, setDpPercent] = useState(downOptions.includes(30) ? 30 : downOptions[0]);
  const [term, setTerm] = useState(terms.includes(9) ? 9 : terms[terms.length - 1] ?? 6);

  const q = quote(price, Math.round((price * dpPercent) / 100), term, config);
  const unit = config.period === "WEEKLY" ? "Week" : "Month";
  const tooCheap = price < config.minPrice;

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-card)] bg-[#07090d] text-white ring-1 ring-gold/30", compact ? "" : "shadow-[var(--shadow-lift)]")}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-7">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold">Installment calculator</p>
        <Icon name="card" className="h-5 w-5 text-gold" />
      </div>

      {/* Product + price */}
      <div className="border-b border-white/10 px-5 py-4 md:px-7">
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
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{productName}</p>
            <p className="text-right"><b className="text-lg">{pkr(price)}</b><span className="block text-xs text-white/50">Total price</span></p>
          </div>
        ) : null}
        {(!phones || !slug) && !productName && (
          <label className="mt-3 block">
            <span className="label !text-white/60">Phone price (Rs)</span>
            <input type="number" inputMode="numeric" min={0} value={customPrice || ""} onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value) || 0))} className="field field-dark" />
          </label>
        )}
      </div>

      {tooCheap ? (
        <p className="px-5 py-6 text-sm text-white/70 md:px-7">Installments are available on phones from {pkr(config.minPrice)}.</p>
      ) : (
        <>
          <div className="grid lg:grid-cols-2">
            {/* Down payment */}
            <fieldset className="px-5 pt-4 md:px-7">
              <legend className="pt-4 font-semibold">Down Payment</legend>
              <div className="mt-2 divide-y divide-white/8">
                {downOptions.map((pct) => (
                  <Choice key={pct} checked={dpPercent === pct} onSelect={() => setDpPercent(pct)} name="dp" label={`${pct}% Order Amount, ${pkr(Math.round((price * pct) / 100))}`} />
                ))}
              </div>
            </fieldset>
            {/* Terms */}
            <fieldset className="px-5 pt-4 md:px-7 lg:border-l lg:border-white/10">
              <legend className="pt-4 font-semibold">Payment Term</legend>
              <div className="mt-2 divide-y divide-white/8">
                {terms.map((t) => (
                  <Choice key={t} checked={term === t} onSelect={() => setTerm(t)} name="term" label={`${t} terms, 1 ${unit} / Term`} />
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-4 grid border-t border-white/10 sm:grid-cols-2">
            <Highlight label="Down Payment" value={pkr(q.downPayment)} />
            <Highlight label={`${unit}ly Payment`} value={pkr(q.perInstallment)} big />
          </div>


          {bookable && (
            <div className="border-t border-white/10 px-5 py-4 md:px-7">
              <button
                type="button"
                onClick={() => choosePlan({ phoneModel: productName ?? eligiblePhones.find((p) => p.slug === slug)?.name ?? `Phone around ${pkr(price)}`, price, downPercent: dpPercent, terms: term, perInstallment: q.perInstallment })}
                className="btn btn-gold w-full"
              >
                <Icon name="clock" className="h-4 w-4" /> Book an appointment
              </button>
            </div>
          )}

          <div className="border-t border-white/10 px-5 py-4 md:px-7">
            <p className="text-xs leading-relaxed text-blue-soft">{config.disclaimer}</p>
            {!compact && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold/10 p-3 text-xs text-gold-soft ring-1 ring-gold/30">
                <Icon name="id-card" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Installment purchases are completed in store — bring your original CNIC. Your ID is only used to verify your purchase.{" "}
                  <Link href="/privacy#id-documents" className="underline underline-offset-2">How we protect your ID</Link>
                </span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Choice({ checked, onSelect, label, name }: { checked: boolean; onSelect: () => void; label: string; name: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-3.5 text-[0.95rem]">
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition", checked ? "border-gold bg-gold text-[#120d02]" : "border-white/35")} aria-hidden>
        {checked && <Icon name="check" className="h-3 w-3" strokeWidth={3.5} />}
      </span>
      <span className={checked ? "text-white" : "text-white/80"}>{label}</span>
    </label>
  );
}

function Highlight({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 py-4 md:px-7", big ? "bg-gold/15" : "bg-white/[0.04] sm:border-r sm:border-white/10")}>
      <span className={big ? "font-semibold text-gold-soft" : "text-white/80"}>{label}</span>
      <span className={cn("font-bold", big ? "text-2xl text-gold" : "text-lg")} aria-live="polite">{value}</span>
    </div>
  );
}
