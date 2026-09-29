import Link from "next/link";
import type { InstallmentListing } from "@prisma/client";
import { pkr } from "@/lib/format";
import { AVAILABILITY, STORE_VISIT_NOTICE, monthlyPayment, type Availability } from "@/lib/installments";
import { ProductArt } from "../product/ProductArt";
import { Icon } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";

const TONE: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-300",
  LIMITED: "bg-gold/20 text-gold-soft",
  OUT_OF_STOCK: "bg-red/15 text-red",
};

/**
 * Separate "Phones on installments" section (master brief §3). Deliberately has NO buy / apply /
 * checkout button: installment sales are completed in store with the customer's CNIC.
 */
export function InstallmentPhones({ listings, heading = true, showCalculatorLink = true }: { listings: InstallmentListing[]; heading?: boolean; showCalculatorLink?: boolean }) {
  if (!listings.length) return null;
  return (
    <section id="installments" className="relative overflow-hidden py-14 md:py-20">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_60%_at_10%_20%,rgba(217,166,46,.12),transparent_70%)]" />
      <div className="container-pb relative">
        {heading && (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-gold">Installments</p>
              <h2 className="display mt-3 text-3xl md:text-5xl">Phones on easy installments</h2>
            </div>
          </div>
        )}
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-gold/10 p-4 text-sm ring-1 ring-gold/35">
          <Icon name="id-card" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <p>
            <b className="text-gold-soft">Store visit required.</b> {STORE_VISIT_NOTICE.replace("Installment purchases are completed in store only. ", "")} Your ID is used only to verify your purchase and is kept private.{" "}
            <Link href="/privacy#id-documents" className="text-gold underline underline-offset-2">How we protect your ID</Link>
          </p>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
          {listings.map((l, i) => {
            const monthly = monthlyPayment(l);
            return (
              <Reveal key={l.id} delay={Math.min(i, 5) * 0.05}>
                <li className="flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-card ring-1 ring-white/10">
                  <div className="relative flex items-center gap-4 p-5">
                    <div className="h-24 w-16 shrink-0">
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <ProductArt kind="PHONE" colorHex="#3a3f4a" name={l.model} compact />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${TONE[l.availability] ?? TONE.AVAILABLE}`}>{AVAILABILITY[l.availability as Availability] ?? l.availability}</span>
                      <p className="mt-1.5 font-semibold leading-snug">{l.model}</p>
                      <p className="text-xs text-muted">Cash price {pkr(l.regularPrice)}</p>
                    </div>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-px bg-white/8 text-sm">
                    <Fact k="Monthly" v={`${pkr(monthly)}`} strong />
                    <Fact k="Down payment" v={pkr(l.downPayment)} />
                    <Fact k="Plan" v={l.planLabel || `${l.durationMonths} months`} />
                    <Fact k="Total on plan" v={pkr(l.installmentTotal)} />
                    <Fact k="Interest / markup" v={`${l.interestPercent}%`} />
                    <Fact k="Duration" v={`${l.durationMonths} months`} />
                  </div>
                  <Link href={`/installments?plan=${l.id}#calculator`} className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
                    <Icon name="card" className="h-4 w-4" /> Calculate my plan
                  </Link>
                </li>
              </Reveal>
            );
          })}
        </ul>
        <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span>Prices and plans may change; the store confirms the final plan after checking your CNIC.</span>
          {showCalculatorLink && (
            <Link href="/installments" className="inline-flex items-center gap-1 font-semibold text-gold hover:text-gold-soft">
              <Icon name="card" className="h-4 w-4" /> Open the installment calculator
            </Link>
          )}
          <Link href="/contact" className="inline-flex items-center gap-1 text-gold hover:text-gold-soft">
            <Icon name="pin" className="h-4 w-4" /> Find the store
          </Link>
        </p>
      </div>
    </section>
  );
}

function Fact({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-[0.7rem] uppercase tracking-wider text-muted">{k}</p>
      <p className={strong ? "text-lg font-bold text-gold" : "font-semibold"}>{v}</p>
    </div>
  );
}
