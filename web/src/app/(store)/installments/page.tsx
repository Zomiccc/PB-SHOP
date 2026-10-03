import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { FinanceCalculator } from "@/components/FinanceCalculator";
import { InstallmentPicker } from "@/components/InstallmentPicker";
import { brandsWithListings, isApplePhone } from "@/lib/brands";
import { Icon } from "@/components/ui/Icon";
import { IdPrivacyNotice } from "@/components/IdPrivacyNotice";
import { listProducts } from "@/lib/catalog";
import { activeListings } from "@/lib/installments";
import { getSetting } from "@/lib/settings";
import { InstallmentRequestForm } from "@/components/InstallmentRequestForm";
import { bookableDates } from "@/lib/appointments";

export const metadata: Metadata = {
  title: "Phone Installments — Plans & Calculator",
  description: "Phones available on installments at PB Mobiles, and a calculator for your down payment and monthly payment. Purchases are completed in store with your CNIC.",
};
export const dynamic = "force-dynamic";

/**
 * The separate Installments page: phones available on installments (managed in Admin → Installments)
 * and the installment calculator. Informational only — no online installment checkout (master brief §3).
 */
export default async function InstallmentsPage(props: PageProps<"/installments">) {
  const sp = await props.searchParams;
  const [config, listings, phones, appts] = await Promise.all([getSetting("installmentCalc"), activeListings(), listProducts({ type: "PHONE" }), getSetting("installmentAppointments")]);
  const dates = appts.enabled ? bookableDates(appts) : [];
  const phoneNames = [...new Set([...listings.map((l) => l.model), ...phones.filter((p) => p.totalStock > 0 && p.condition === "NEW" && !isApplePhone(`${p.brand} ${p.name}`)).map((p) => p.name)])];

  // Any-price calculator: in-stock shop phones (the brand picker covers the installment phones).
  const shopOptions = phones
    .filter((p) => p.totalStock > 0 && !isApplePhone(`${p.brand} ${p.name}`)) // no installments on iPhone
    .map((p) => ({ slug: p.slug, name: `${p.name}${p.condition === "USED" ? " (Used)" : ""}`, price: p.fromPrice }))
    .sort((a, b) => b.price - a.price);
  const plan = typeof sp.plan === "string" ? sp.plan : undefined;
  const brand = typeof sp.brand === "string" ? sp.brand : undefined;
  const pickerListings = listings.map((l) => ({ id: l.id, brand: l.brand, model: l.model, modelNo: l.modelNo, colors: l.colors, imageUrl: l.imageUrl, regularPrice: l.regularPrice, installmentTotal: l.installmentTotal, downPayment: l.downPayment, durationMonths: l.durationMonths, interestPercent: l.interestPercent, planLabel: l.planLabel, availability: l.availability }));
  const price = typeof sp.price === "string" && Number(sp.price) > 0 ? Math.round(Number(sp.price)) : undefined;

  return (
    <>
      <PageHero eyebrow="Installments" title="Your phone now," accent="pay over time." intro="See which phones are available on installments, then work out your down payment and monthly payment. Purchases are completed in store with your original CNIC." />

      <nav aria-label="On this page" className="container-pb -mt-4 mb-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[
          { href: "#step-brand", label: "Choose brand & model" },
          { href: "#any-price", label: "Calculate any price" },
          { href: "#book", label: "Book an appointment" },
          { href: "#how", label: "How it works" },
          { href: "#id-documents", label: "Your ID is safe" },
        ].map((l) => (
          <a key={l.href} href={l.href} className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm hover:border-gold hover:text-gold">{l.label}</a>
        ))}
      </nav>

      <section className="pb-12">
        <div className="container-pb">
          {config.enabled ? (
            <InstallmentPicker brands={brandsWithListings(listings)} listings={pickerListings} config={config} initialBrand={brand} initialPlan={plan} />
          ) : (
            <p className="card p-8 text-center text-muted">Installment plans are coming soon. Ask us in store or on chat.</p>
          )}
        </div>
      </section>

      {config.enabled && (
        <section id="any-price" className="scroll-mt-24 pb-16">
          <div className="container-pb">
            <details className="group rounded-[var(--radius-card)] bg-card ring-1 ring-white/10" open={!!price}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                <span>
                  <span className="block font-semibold">Calculate any other phone or price</span>
                  <span className="text-sm text-muted">Any phone in our shop, or type a price.</span>
                </span>
                <Icon name="arrow-right" className="h-4 w-4 transition group-open:rotate-90" />
              </summary>
              <div className="p-2 pt-0 md:p-4 md:pt-0">
                <FinanceCalculator key={price ?? "any"} config={config} phones={shopOptions} initialPrice={price} bookable />
              </div>
            </details>
          </div>
        </section>
      )}

      {config.enabled && appts.enabled && (
        <section id="book" className="scroll-mt-24 pb-20">
          <div className="container-pb">
            <p className="eyebrow text-gold">Book your visit</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">Book an appointment.</h2>
            <p className="mt-3 max-w-xl text-muted">Tell us about you and the phone you want, then pick a date and time. Bring your original CNIC — we&apos;ll complete the plan with you in store.</p>
            <div className="mt-8">
              <InstallmentRequestForm dates={dates} phones={phoneNames} />
            </div>
          </div>
        </section>
      )}

      <section id="how" className="scroll-mt-24 bg-navy-950 py-20 text-white">
        <div className="container-pb">
          <p className="eyebrow text-gold">How it works</p>
          <h2 className="display mt-4 text-4xl md:text-5xl">Four simple steps.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { icon: "phone", t: "Choose your phone", d: "Pick from the installment phones above — try it in store." },
              { icon: "id-card", t: "Bring your CNIC", d: "Quick verification in store with the financing partner." },
              { icon: "card", t: "Pay the down payment", d: "Take your phone home the same day." },
              { icon: "clock", t: "Easy monthly payments", d: "Pay on time each month through the partner app." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10">
                <span className="font-mono text-xs text-gold">0{i + 1}</span>
                <Icon name={s.icon} className="mt-4 h-6 w-6 text-gold" />
                <p className="mt-3 font-semibold">{s.t}</p>
                <p className="mt-1 text-sm text-white/55">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <IdPrivacyNotice />
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn-gold"><Icon name="pin" className="h-4 w-4" /> Find the store</Link>
            <Link href="/contact?subject=Installment%20enquiry" className="btn btn-ghost-light">Ask about installments</Link>
          </div>
        </div>
      </section>
    </>
  );
}
