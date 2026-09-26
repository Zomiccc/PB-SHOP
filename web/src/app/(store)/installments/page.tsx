import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { FinanceCalculator } from "@/components/FinanceCalculator";
import { Icon } from "@/components/ui/Icon";
import { listProducts } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Phone Installments — Calculator",
  description: "Buy your phone on easy installments at PB Mobiles. Choose a phone, set your down payment and see your monthly installment instantly.",
};
export const dynamic = "force-dynamic";

export default async function InstallmentsPage() {
  const [config, phones] = await Promise.all([getSetting("financing"), listProducts({ type: "PHONE" })]);
  const options = phones
    .filter((p) => p.totalStock > 0)
    .map((p) => ({ slug: p.slug, name: `${p.name}${p.condition === "USED" ? " (Used)" : ""}`, price: p.fromPrice }))
    .sort((a, b) => b.price - a.price);

  return (
    <>
      <PageHero eyebrow="Installments" title="Your phone now," accent="pay over time." intro={`Pick a phone, choose your down payment and plan, and see exactly what you'll pay each ${config.period === "WEEKLY" ? "week" : "month"} — financing by ${config.partnerName}.`} />
      <section className="pb-20">
        <div className="container-pb">
          {config.enabled ? (
            <FinanceCalculator config={config} phones={options} />
          ) : (
            <p className="card p-8 text-center text-muted">Installment plans are coming soon. Ask us in store or on chat.</p>
          )}
        </div>
      </section>
      <section className="bg-navy-950 py-20 text-white">
        <div className="container-pb">
          <p className="eyebrow text-gold">How it works</p>
          <h2 className="display mt-4 text-4xl md:text-5xl">Four simple steps.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { icon: "phone", t: "Choose your phone", d: "New or lab-checked used — try it in store." },
              { icon: "user", t: "Bring your CNIC", d: "Quick verification with the financing partner." },
              { icon: "card", t: "Pay the down payment", d: "Take your phone home the same day." },
              { icon: "clock", t: "Easy installments", d: "Pay on time each period through the partner app." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10">
                <span className="font-mono text-xs text-gold">0{i + 1}</span>
                <Icon name={s.icon} className="mt-4 h-6 w-6 text-gold" />
                <p className="mt-3 font-semibold">{s.t}</p>
                <p className="mt-1 text-sm text-white/55">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/new-phones" className="btn btn-gold">Browse phones</Link>
            <Link href="/contact?subject=Installment%20enquiry" className="btn btn-ghost-light">Ask about installments</Link>
          </div>
        </div>
      </section>
    </>
  );
}
