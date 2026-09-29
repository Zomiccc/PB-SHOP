import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { FinanceCalculator } from "@/components/FinanceCalculator";
import { InstallmentPhones } from "@/components/home/InstallmentPhones";
import { Icon } from "@/components/ui/Icon";
import { IdPrivacyNotice } from "@/components/IdPrivacyNotice";
import { listProducts } from "@/lib/catalog";
import { activeListings } from "@/lib/installments";
import { getSetting } from "@/lib/settings";

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
  const [config, listings, phones] = await Promise.all([getSetting("installmentCalc"), activeListings(), listProducts({ type: "PHONE" })]);

  // Calculator choices: the installment phones first, then other in-stock phones.
  const listingOptions = listings.filter((l) => l.availability !== "OUT_OF_STOCK").map((l) => ({ slug: `plan-${l.id}`, name: l.model, price: l.regularPrice }));
  const shopOptions = phones
    .filter((p) => p.totalStock > 0)
    .map((p) => ({ slug: p.slug, name: `${p.name}${p.condition === "USED" ? " (Used)" : ""}`, price: p.fromPrice }))
    .sort((a, b) => b.price - a.price);
  const options = [...listingOptions, ...shopOptions];
  const plan = typeof sp.plan === "string" ? `plan-${sp.plan}` : undefined;
  const price = typeof sp.price === "string" && Number(sp.price) > 0 ? Math.round(Number(sp.price)) : undefined;

  return (
    <>
      <PageHero eyebrow="Installments" title="Your phone now," accent="pay over time." intro="See which phones are available on installments, then work out your down payment and monthly payment. Purchases are completed in store with your original CNIC." />

      <nav aria-label="On this page" className="container-pb -mt-4 mb-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[
          { href: "#installments", label: "Phones on installments" },
          { href: "#calculator", label: "Installment calculator" },
          { href: "#how", label: "How it works" },
          { href: "#id-documents", label: "Your ID is safe" },
        ].map((l) => (
          <a key={l.href} href={l.href} className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-sm hover:border-gold hover:text-gold">{l.label}</a>
        ))}
      </nav>

      {listings.length > 0 ? (
        <InstallmentPhones listings={listings} showCalculatorLink={false} />
      ) : (
        <section id="installments" className="container-pb pb-10">
          <p className="rounded-2xl bg-card p-6 text-sm text-muted ring-1 ring-white/10">Installment phones are being updated — use the calculator below or ask us in store.</p>
        </section>
      )}

      <section id="calculator" className="scroll-mt-24 pb-16 pt-4">
        <div className="container-pb">
          <p className="eyebrow text-gold">Calculator</p>
          <h2 className="display mt-3 text-3xl md:text-5xl">Work out your monthly payment</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">Pick a phone (or enter any price), choose your down payment and number of months.</p>
          <div className="mt-6">
            {config.enabled ? (
              <FinanceCalculator key={plan ?? price ?? "calc"} config={config} phones={options} initialSlug={plan} initialPrice={price} />
            ) : (
              <p className="card p-8 text-center text-muted">The installment calculator is coming soon. Ask us in store or on chat.</p>
            )}
          </div>
        </div>
      </section>

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
