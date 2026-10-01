import type { Metadata } from "next";
import { describeTiers } from "@/lib/points-rules";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { FlipPassportCard } from "@/components/home/FlipPassportCard";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: "PB Phone Passport — Points & Rewards",
  description: "Earn 1 point per Rs 100 on repairs and accessories, and 50–200 points per phone by price. Redeem 50 points for a free screen protector, 100 for a free custom 3D skin, 200 for free AirPods.",
};
export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const [rules, rewards] = await Promise.all([
    getSetting("passport"),
    db.reward.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }] }),
  ]);
  const tiers = describeTiers(rules.phoneTiers);
  const earn = [
    { icon: "wrench", pts: 1, t: `Per Rs ${rules.rupeesPerPoint} on repairs`, d: "Added when your repair is completed." },
    { icon: "bag", pts: 1, t: `Per Rs ${rules.rupeesPerPoint} on accessories`, d: "Cases, chargers, earbuds and more." },
    { icon: "phone", pts: tiers.length ? tiers[tiers.length - 1].points : 0, t: "Per phone — up to", d: "By the phone's price (see the table below). New, used and installment phones." },
    { icon: "gift", pts: rules.welcomePoints, t: "Welcome reward", d: "Once, with your first purchase or repair after joining." },
    { icon: "user", pts: rules.referralPoints, t: "Refer a friend", d: "When a friend you refer makes their first purchase or repair." },
  ].filter((e) => e.pts > 0);

  return (
    <>
      <PageHero dark eyebrow="PB Phone Passport" title="Points that" accent="pay you back." intro="One Passport for every repair and phone you buy with us. Collect points, track them, and swap them for real rewards.">
        <div className="mt-12 max-w-md">
          <FlipPassportCard />
        </div>
      </PageHero>

      {/* Earn */}
      <section className="py-16 md:py-24">
        <div className="container-pb">
          <p className="eyebrow text-gold">Earn</p>
          <h2 className="display mt-3 text-4xl md:text-5xl">How you collect points.</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
            {earn.map((e, i) => (
              <Reveal key={e.t} delay={i * 0.06} className="relative overflow-hidden rounded-[1.5rem] bg-card p-6 ring-1 ring-white/8">
                <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue/15 blur-2xl" />
                <Icon name={e.icon} className="relative h-6 w-6 text-gold" />
                <p className="display relative mt-5 text-5xl text-gold">+{e.pts}</p>
                <p className="relative mt-1 font-semibold">{e.t}</p>
                <p className="relative mt-1 text-sm text-muted">{e.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section className="bg-navy-950 py-16 text-white md:py-24">
        <div className="container-pb">
          <p className="eyebrow text-gold">Redeem</p>
          <h2 className="display mt-3 text-4xl md:text-5xl">What points get you.</h2>
          <p className="mt-3 max-w-lg text-white/65">Swap your PB Points for these rewards at the counter — staff apply them to your Passport straight away.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {rewards.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.05}>
                <li className="flex h-full flex-col rounded-[1.5rem] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 ring-1 ring-gold/25">
                  <div className="flex items-center justify-between">
                    <Icon name={r.kind === "REPAIR_DISCOUNT" ? "wrench" : "gift"} className="h-6 w-6 text-gold" />
                    <span className="rounded-full bg-gold px-3 py-1 font-mono text-xs font-bold text-[#120d02]">{r.pointsCost} pts</span>
                  </div>
                  <p className="mt-6 text-xl font-semibold">{r.name}</p>
                  {r.description && <p className="mt-1 text-sm text-white/60">{r.description}</p>}
                  {r.exclusions && <p className="mt-auto pt-4 text-xs text-white/45">{r.exclusions}</p>}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Rules */}
      <section id="rules" className="py-16 md:py-24">
        <div className="container-pb grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow text-gold">The rules</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">Clear and simple.</h2>
            <Link href="/account" className="btn btn-gold mt-8">
              <Icon name="user" className="h-4 w-4" /> See my Passport
            </Link>
          </div>
          {/* Final PB Points system (v6 final amendment) — same numbers as the points engine. */}
          <dl className="space-y-5 text-sm">
            <Rule t="Repairs & accessories">
              Earn 1 PB Point for every Rs {rules.rupeesPerPoint} spent.
              <span className="mt-2 flex flex-wrap gap-2">
                {[500, 1000, 1500, 5000].map((rs) => (
                  <span key={rs} className="rounded-full bg-card px-3 py-1 text-xs ring-1 ring-white/10">Rs {rs.toLocaleString("en-PK")} → <b className="text-gold">{Math.floor(rs / rules.rupeesPerPoint)} points</b></span>
                ))}
              </span>
            </Rule>
            <Rule t="New, used & installment phones">
              Points by eligible phone value:
              <span className="mt-2 grid max-w-sm grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-card p-3 text-xs ring-1 ring-white/10">
                {tiers.map((t) => (
                  <span key={t.label} className="contents"><span className="text-muted">{t.label}</span><b className="text-right text-gold">{t.points} points</b></span>
                ))}
              </span>
              <span className="mt-2 block">Installment phones follow the same points structure, based on the eligible phone value.</span>
            </Rule>
            {rules.welcomePoints > 0 && <Rule t="Welcome reward">{rules.welcomePoints} PB Points when your new account completes its first eligible purchase or repair — on top of the standard points for it.</Rule>}
            {rules.referralPoints > 0 && <Rule t="Referral reward">Share your referral code (your Passport ID). You get {rules.referralPoints} PB Points when a friend who joined with it completes their first eligible purchase or repair. Creating the account alone doesn&apos;t count.</Rule>}
            <Rule t="Bonus points">Our team can award extra PB Points from time to time — they show in your points history with the reason.</Rule>
            <Rule t="Points validity">Each PB Point is valid for {rules.expiryMonths} months from the date it is earned. Your Passport shows what&apos;s expiring and when; points that expire soonest are used first.</Rule>
            <Rule t="Important rules">
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Points can be accumulated until redeemed or expired.</li>
                <li>Redeemed points cannot be restored.</li>
                <li>No points are earned on redeemed rewards.</li>
                <li>Points from refunded or cancelled transactions are reversed.</li>
                <li>Points are calculated on the eligible / net transaction amount after discounts.</li>
              </ul>
            </Rule>
            <Rule t="Redeeming">Rewards are redeemed in store — staff apply them to your Passport straight away.</Rule>
          </dl>
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
