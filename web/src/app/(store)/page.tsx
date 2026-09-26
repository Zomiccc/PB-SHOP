import Link from "next/link";
import { HeroStory } from "@/components/home/HeroStory";
import { PassportCard } from "@/components/home/PassportCard";
import { ProductArt } from "@/components/product/ProductArt";
import { Reveal, SplitHeadline } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ReviewCard, ReviewForm, Stars } from "@/components/reviews/Reviews";
import { listProducts } from "@/lib/catalog";
import { approvedReviews, reviewStats } from "@/lib/reviews";
import { getSetting } from "@/lib/settings";
import { pkr } from "@/lib/format";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Homepage — follows the master brief's reference layout on a fully dark, logo-coloured theme. */
export default async function HomePage() {
  const [phones, tablets, accessories, loyalty, careServices, reviews, stats] = await Promise.all([
    listProducts({ type: "PHONE" }),
    listProducts({ type: "TABLET" }),
    listProducts({ type: "ACCESSORY" }),
    getSetting("loyalty"),
    db.careCardService.findMany({ where: { active: true, configured: true }, orderBy: { visitNumber: "asc" } }),
    approvedReviews({ take: 9 }),
    reviewStats(),
  ]);
  const featuredPhones = phones.filter((p) => p.featured).slice(0, 6);
  const featuredTablets = tablets.filter((p) => p.featured).concat(tablets.filter((p) => !p.featured)).slice(0, 3);
  const featuredAcc = accessories.filter((p) => p.featured).slice(0, 4);
  const hundredPts = 100 * loyalty.pointValueRupees;

  return (
    <>
      <HeroStory />

      {/* Category entry points */}
      <section className="relative z-10 pb-6 pt-6 md:pt-14">
        <div className="container-pb grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { href: "/repair", title: "Phone repairs", sub: "Screen, battery, software & more.", art: <RepairArt />, glow: "rgba(0,119,217,.45)" },
            { href: "/new-phones", title: "Buy a phone", sub: "New & pre-owned devices.", art: <ProductArt kind="PHONE" colorHex="#3a3f4a" brand="Apple" name="iPhone 16 Pro" />, glow: "rgba(215,25,32,.4)" },
            { href: "/tablets", title: "Tablets", sub: "iPad, Galaxy Tab & more.", art: <ProductArt kind="TABLET" colorHex="#8fa7c4" brand="Apple" name="iPad Air" />, glow: "rgba(0,119,217,.4)" },
            { href: "/accessories", title: "Accessories", sub: "Cases, chargers & essentials.", art: <ProductArt kind="ACCESSORY" accessoryType="EARBUDS" colorHex="#e8e8e8" />, glow: "rgba(217,166,46,.4)" },
          ].map((c, i) => (
            <Reveal key={c.href} delay={i * 0.05}>
              <Link href={c.href} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-gold/25 transition hover:ring-gold/70">
                <div className="relative aspect-[4/3.2] overflow-hidden bg-gradient-to-b from-[#0d1016] to-black">
                  <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 60%, ${c.glow}, transparent 70%)` }} />
                  <div className="absolute inset-2 transition-transform duration-500 group-hover:scale-105">{c.art}</div>
                </div>
                <div className="flex flex-1 flex-col p-3.5 md:p-4">
                  <p className="flex items-center gap-1 font-semibold">{c.title} <Icon name="arrow-right" className="h-3.5 w-3.5 text-gold" /></p>
                  <p className="mt-1 text-xs leading-snug text-muted md:text-sm">{c.sub}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Trust strip */}
        <div className="container-pb mt-3 md:mt-4">
          <div className="grid grid-cols-2 divide-x divide-white/10 rounded-2xl bg-card py-4 ring-1 ring-white/8 md:grid-cols-4">
            {[
              { icon: "bolt", t: "Fast service" },
              { icon: "shield", t: "Trusted care" },
              { icon: "check", t: "Genuine parts", desktop: true },
              { icon: "card", t: "Secure payments", desktop: true },
            ].map((x) => (
              <p key={x.t} className={`items-center justify-center gap-2.5 text-sm font-medium ${x.desktop ? "hidden md:flex" : "flex"}`}>
                <Icon name={x.icon} className="h-5 w-5 text-gold" /> {x.t}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Featured phones */}
      <Row title="Featured Phones" href="/new-phones">
        {featuredPhones.map((p) => (
          <MiniCard key={p.id} href={`/product/${p.slug}`} name={`${p.name}${p.condition === "USED" ? " (Used)" : ""}`} price={p.fromPrice} art={<ProductArt kind="PHONE" colorHex={p.finishHex} brand={p.brand} name={p.name} compact />} />
        ))}
      </Row>
      <div className="container-pb -mt-4 flex flex-wrap gap-2 pb-4">
        <Link href="/new-phones" className="rounded-full border border-gold/40 px-4 py-2 text-sm hover:bg-gold/10">Shop new phones</Link>
        <Link href="/used-phones" className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Shop used phones</Link>
        <Link href="/installments" className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Pay in installments</Link>
      </div>

      {/* Tablets */}
      {featuredTablets.length > 0 && (
        <Row title="Tablets" href="/tablets">
          {featuredTablets.map((p) => (
            <MiniCard key={p.id} href={`/product/${p.slug}`} name={`${p.name}${p.condition === "USED" ? " (Used)" : ""}`} price={p.fromPrice} art={<ProductArt kind="TABLET" colorHex={p.finishHex} brand={p.brand} name={p.name} compact />} />
          ))}
        </Row>
      )}

      {/* Accessories */}
      <Row title="Accessories" href="/accessories">
        {featuredAcc.map((p) => (
          <MiniCard key={p.id} href={`/product/${p.slug}`} name={p.name} price={p.fromPrice} art={<ProductArt kind="ACCESSORY" accessoryType={p.accessoryType} colorHex={p.finishHex} />} />
        ))}
      </Row>

      {/* PB Rewards (loyalty / Phone Passport) */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(45%_60%_at_80%_40%,rgba(0,119,217,.35),transparent_70%),radial-gradient(40%_50%_at_95%_80%,rgba(215,25,32,.3),transparent_70%)]" />
        <div className="container-pb relative grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="display flex items-center gap-3 text-4xl md:text-6xl">
              <span className="text-gradient-gold">PB Rewards</span>
              <CrownIcon />
            </h2>
            <p className="mt-3 text-lg text-white/85">Earn points every time you shop or repair.</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {["Get exclusive offers", "Member-only discounts", "Be the first to know", careServices.length ? `PB Care Card: ${careServices.length}+ free service visits with eligible devices` : null]
                .filter(Boolean)
                .map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-[#120d02]"><Icon name="check" className="h-3 w-3" strokeWidth={3} /></span>
                    {t}
                  </li>
                ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/account" className="btn btn-gold">Join for free <Icon name="arrow-right" className="h-4 w-4" /></Link>
              <Link href="/loyalty" className="btn border border-white/20 text-white hover:border-white/50">How it works</Link>
            </div>
          </div>
          <div>
            <PassportCard name={`100 points = ${pkr(hundredPts)} off`} />
          </div>
        </div>
        <div className="container-pb relative mt-12 grid grid-cols-3 gap-3 text-center md:gap-6">
          {[
            { icon: "user", t: "1. Join free", d: "Create your account in seconds." },
            { icon: "gift", t: "2. Earn points", d: "Get points when you shop or repair." },
            { icon: "star", t: "3. Redeem rewards", d: "Turn your points into discounts." },
          ].map((s) => (
            <div key={s.t}>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/60 text-gold"><Icon name={s.icon} className="h-6 w-6" /></span>
              <p className="mt-3 text-sm font-semibold md:text-base">{s.t}</p>
              <p className="mt-1 text-xs text-muted md:text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How repairs work */}
      <section className="py-14 md:py-20">
        <div className="container-pb">
          <h2 className="display text-3xl md:text-5xl">How repairs work</h2>
          <p className="mt-2 text-muted">A simple process to get you back up and running.</p>
          <div className="mt-6 grid grid-cols-3 gap-2 md:mt-8 md:gap-4">
            {[
              { n: 1, tone: "bg-red", icon: "chat", t: "Tell us the issue", d: "Share a few details about your device." },
              { n: 2, tone: "bg-blue", icon: "search", t: "Get a quote", d: "We'll check and give you a clear price." },
              { n: 3, tone: "bg-gold text-[#120d02]", icon: "phone", t: "Back to your day", d: "Expert repair and swift return." },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 0.06}>
                <div className="h-full rounded-2xl bg-card p-3 ring-1 ring-white/8 md:p-5">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold md:h-7 md:w-7 md:text-sm ${s.tone}`}>{s.n}</span>
                    <Icon name={s.icon} className="h-5 w-5 text-gold md:h-6 md:w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-tight md:mt-4 md:text-base">{s.t}</p>
                  <p className="mt-1 text-xs leading-snug text-muted md:text-sm">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Customer reviews — genuine, moderated reviews only */}
      <section className="py-14 md:py-20">
        <div className="container-pb">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-3xl md:text-5xl">Customer reviews</h2>
              {stats.count > 0 ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Stars value={stats.average ?? 0} /> <b className="text-white">{stats.average}</b> from {stats.count} review{stats.count > 1 ? "s" : ""}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">Be one of the first to review PB Mobiles.</p>
              )}
            </div>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {reviews.length > 0 ? (
              <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
                {reviews.map((r) => (
                  <div key={r.id} className="w-[85%] shrink-0 snap-start md:w-auto">
                    <ReviewCard r={{ ...r, createdAt: r.createdAt.toISOString() }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid place-items-center rounded-2xl border border-dashed border-gold/30 p-10 text-center">
                <div>
                  <Stars value={5} className="h-6 w-6" />
                  <p className="mt-3 font-semibold">Reviews from real customers appear here.</p>
                  <p className="mt-1 text-sm text-muted">Bought a phone or had a repair with us? We&apos;d love to hear from you.</p>
                </div>
              </div>
            )}
            <ReviewForm />
          </div>
        </div>
      </section>

      {/* Ready when you are */}
      <section className="pb-20 pt-6">
        <div className="container-pb">
          <Reveal className="relative overflow-hidden rounded-[1.75rem] bg-card p-7 ring-1 ring-blue/40 md:p-12">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_80%_at_90%_50%,rgba(0,119,217,.35),transparent_70%),radial-gradient(40%_70%_at_100%_100%,rgba(215,25,32,.3),transparent_70%)]" />
            <div className="relative grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="display text-4xl md:text-6xl">
                  <SplitHeadline text="Ready when you are" />
                  <span className="text-gold">.</span>
                </h2>
                <p className="mt-3 max-w-md text-white/75">Book a repair today and get your device back in expert hands.</p>
                <Link href="/repair" className="btn btn-gold mt-6"><Icon name="wrench" className="h-4 w-4" /> Book a repair <Icon name="arrow-right" className="h-4 w-4" /></Link>
              </div>
              <div className="mx-auto h-48 w-40 md:h-64 md:w-52"><RepairArt /></div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function Row({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="py-8 md:py-12">
      <div className="container-pb">
        <div className="flex items-end justify-between">
          <h2 className="display text-2xl md:text-4xl">{title}</h2>
          <Link href={href} className="flex items-center gap-1 text-sm font-medium text-gold hover:text-gold-soft">View all <Icon name="arrow-right" className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="-mx-5 mt-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-6 [&>*]:w-[42%] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">{children}</div>
      </div>
    </section>
  );
}

function MiniCard({ href, name, price, art }: { href: string; name: string; price: number; art: React.ReactNode }) {
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-white/8 transition hover:ring-gold/60">
      <div className="relative aspect-square bg-gradient-to-b from-[#12161e] to-black p-2">
        <div className="absolute inset-2 transition-transform duration-500 group-hover:scale-105">{art}</div>
      </div>
      <div className="flex items-end justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted">From <b className="text-gold">{pkr(price)}</b></p>
        </div>
        <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-white/60" />
      </div>
    </Link>
  );
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9 text-gold md:h-12 md:w-12" fill="currentColor" aria-hidden>
      <path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5L3 8Zm2.6 12h12.8v1.6H5.6V20Z" />
    </svg>
  );
}

/** Cracked phone + wrench illustration for the repair entry point. */
function RepairArt() {
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" role="img" aria-label="Phone repair illustration">
      <defs>
        <linearGradient id="rp-screen" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#0a1a2e" />
          <stop offset="1" stopColor="#030508" />
        </linearGradient>
        <linearGradient id="rp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d98b" />
          <stop offset="0.6" stopColor="#d9a62e" />
          <stop offset="1" stopColor="#8a6410" />
        </linearGradient>
      </defs>
      <g transform="rotate(-10 100 120)">
        <rect x="52" y="30" width="96" height="180" rx="16" fill="#0b0d12" stroke="#3a4250" strokeWidth="3" />
        <rect x="57" y="35" width="86" height="170" rx="12" fill="url(#rp-screen)" />
        <g stroke="#cfe3ff" strokeOpacity="0.75" strokeWidth="1.2" fill="none">
          <path d="M100 110 L70 60 M100 110 L130 70 M100 110 L140 130 M100 110 L118 185 M100 110 L66 150 M100 110 L80 196" />
          <path d="M84 84 L112 90 L126 118 L106 150 L78 136 Z" strokeOpacity="0.4" />
        </g>
      </g>
      <g transform="translate(112 118) rotate(38)">
        <path d="M0 -10 a18 18 0 1 0 0.1 0 M-6 -16 l12 0 l0 10 l-12 0z" fill="none" />
        <rect x="-7" y="0" width="14" height="78" rx="6" fill="url(#rp-gold)" />
        <path d="M-20 -8 a22 22 0 0 1 40 0 l-9 8 l-8 -9 l-6 0 l-8 9 z" fill="url(#rp-gold)" />
      </g>
    </svg>
  );
}
