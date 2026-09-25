import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { PassportCard } from "@/components/home/PassportCard";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { pkr } from "@/lib/format";

export const metadata: Metadata = {
  title: "PB Phone Passport & Care Card",
  description: "Earn points on purchases and repairs, keep your repair history in one place, and get up to 5 free service visits with the PB Care Card.",
};
export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const [loyalty, rewards, services] = await Promise.all([
    getSetting("loyalty"),
    db.reward.findMany({ where: { active: true }, orderBy: { pointsCost: "asc" } }),
    db.careCardService.findMany({ orderBy: { visitNumber: "asc" } }),
  ]);

  return (
    <>
      <PageHero dark eyebrow="Loyalty" title="The PB" accent="Phone Passport." intro="Turn every visit into a useful check-in. Points on purchases and repairs, your full repair history, member rewards — and a Care Card with eligible phones.">
        <div className="mt-12 max-w-md">
          <PassportCard />
        </div>
      </PageHero>

      {/* Earn / track / redeem */}
      <section className="py-20 md:py-28">
        <div className="container-pb grid gap-5 md:grid-cols-3">
          {[
            { n: "01", icon: "bag", t: "Earn", d: `Get 1 point for every ${pkr(loyalty.pointsPerRupees)} spent on eligible purchases, plus ${loyalty.repairPoints} points on completed repairs.` },
            { n: "02", icon: "wrench", t: "Track", d: "Every purchase, repair and Care Card visit is saved to your Passport — online and in store, linked by your phone number." },
            { n: "03", icon: "gift", t: "Redeem", d: "Swap points for accessory discounts, free protector fitting, priority repair slots and member-only offers." },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 0.08} className="card p-7">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-red">{s.n}</span>
                <Icon name={s.icon} className="h-6 w-6 text-gold" />
              </div>
              <h2 className="display mt-6 text-3xl">{s.t}</h2>
              <p className="mt-3 text-muted">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Care Card */}
      <section className="bg-navy-950 py-20 text-white md:py-28">
        <div className="container-pb grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold">PB Care Card</p>
            <h2 className="display mt-4 text-4xl md:text-6xl">Five visits. On us.</h2>
            <p className="mt-5 max-w-md text-white/65">
              Eligible phone purchases come with a PB Care Card that can be used up to 5 times. Each visit unlocks one free service — each service can be redeemed once per card.
            </p>
            <Link href="/new-phones" className="btn btn-gold mt-8">Shop eligible phones</Link>
          </div>
          <ol className="space-y-3">
            {services.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.06}>
                <li className={`flex items-center gap-5 rounded-2xl p-5 ring-1 ${s.configured ? "bg-white/[0.04] ring-white/10" : "border border-dashed border-white/20 ring-transparent"}`}>
                  <span className="display grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-xl text-navy-950">{s.visitNumber}</span>
                  <div>
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/50">Visit {s.visitNumber}</p>
                    <p className="text-lg font-semibold">{s.configured ? s.name : "To be announced"}</p>
                    {!s.configured && <p className="text-sm text-white/50">The fifth benefit will be confirmed by PB Mobiles soon.</p>}
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Rewards + rules */}
      <section className="py-20 md:py-28">
        <div className="container-pb grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-red">Rewards</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">What points get you.</h2>
            <ul className="mt-8 divide-y divide-ink/10 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-4">
                  <span className="font-medium">{r.name}</span>
                  <span className="rounded-full bg-navy-950 px-3 py-1 font-mono text-xs text-gold">{r.pointsCost} pts</span>
                </li>
              ))}
            </ul>
          </div>
          <div id="rules">
            <p className="eyebrow text-red">The rules</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">Clear and simple.</h2>
            <dl className="mt-8 space-y-5 text-sm">
              <Rule t="Earning">1 point per {pkr(loyalty.pointsPerRupees)} spent on eligible products; {loyalty.repairPoints} points per completed repair. Points are added once payment is confirmed.</Rule>
              <Rule t="Redemption">Rewards are redeemed in store or on request; staff record every redemption on your Passport. 1 point is worth about {pkr(loyalty.pointValueRupees)} when used as a discount.</Rule>
              <Rule t="Expiry">Points expire {loyalty.expiryMonths} months after they are earned.</Rule>
              <Rule t="Exclusions">{loyalty.exclusions}</Rule>
              <Rule t="Care Card">Up to 5 uses per card. Each free service can be redeemed once per card. The card is exhausted after the fifth use. Service definitions may be updated by PB Mobiles.</Rule>
            </dl>
            <p className="mt-6 text-xs text-muted">Reward values and rules are configurable and may change; the version shown here is always current.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function Rule({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-ink/10 pb-5 sm:grid-cols-[130px_1fr]">
      <dt className="font-semibold">{t}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}
