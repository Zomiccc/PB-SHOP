import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { FlipPassportCard } from "@/components/home/FlipPassportCard";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: "PB Phone Passport — Points & Rewards",
  description: "Earn 10 points per repair, 20 per new phone and 15 per used phone. Redeem for AirPods, a phone case of your choice or 50% off repairs.",
};
export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const [rules, rewards] = await Promise.all([
    getSetting("passport"),
    db.reward.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }] }),
  ]);
  const earn = [
    { icon: "wrench", pts: rules.repairPoints, t: "Every repair", d: "Added when your repair is completed." },
    { icon: "phone", pts: rules.newPhonePoints, t: "New phone", d: "Per new phone, once payment is confirmed." },
    { icon: "shield", pts: rules.usedPhonePoints, t: "Used phone", d: "Per lab-checked used phone you buy." },
    { icon: "gift", pts: rules.welcomePoints, t: "Welcome reward", d: "Once, when you join the Passport." },
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
          <p className="mt-3 max-w-lg text-white/65">Points can be used on repairs and accessories. Ask at the counter — staff apply the reward to your Passport straight away.</p>
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
          <dl className="space-y-5 text-sm">
            <Rule t="Earning">{rules.repairPoints} points per completed repair, {rules.newPhonePoints} per new phone and {rules.usedPhonePoints} per used phone. Purchase points are added once payment is confirmed.{rules.welcomePoints > 0 && ` New members get a ${rules.welcomePoints}-point welcome reward.`}{rules.referralPoints > 0 && ` Refer a friend with your Passport ID and get ${rules.referralPoints} points when they make their first purchase or repair.`}</Rule>
            <Rule t="Expiry">Each set of points expires {rules.expiryMonths} months after the day it was earned. Expired points can&apos;t be redeemed; your Passport shows what&apos;s expiring and when.</Rule>
            <Rule t="Redeeming">Rewards are redeemed in store. Points that expire soonest are used first.</Rule>
            <Rule t="Exclusions">{rules.exclusions}</Rule>
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
