import Image from "next/image";
import Link from "next/link";
import { HeroStory } from "@/components/home/HeroStory";
import { FlipPassportCard } from "@/components/home/FlipPassportCard";
import { ProductArt } from "@/components/product/ProductArt";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ReviewCard, ReviewForm, Stars } from "@/components/reviews/Reviews";
import { listProducts, toCatalogItems } from "@/lib/catalog";
import { approvedReviews, reviewStats } from "@/lib/reviews";
import { getSetting } from "@/lib/settings";
import { pkr } from "@/lib/format";
import { activeListings } from "@/lib/installments";
import { brandsWithListings } from "@/lib/brands";
import { InstallmentPhones } from "@/components/home/InstallmentPhones";
import { parseTiers } from "@/lib/points-rules";
import { activeBroadcasts } from "@/lib/broadcasts";
import { BroadcastShowcase } from "@/components/home/BroadcastShowcase";
import { db } from "@/lib/db";
import { EditableHeadline, EditableMedia, StoreLink, T, Zone } from "@/components/site/Editable";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Homepage — follows the master brief's reference layout on a fully dark, logo-coloured theme. */
export default async function HomePage() {
  const [phones, tablets, accessories, passport, installments, reviews, stats, broadcasts, rewards] = await Promise.all([
    listProducts({ type: "PHONE" }),
    listProducts({ type: "TABLET" }),
    listProducts({ type: "ACCESSORY" }),
    getSetting("passport"),
    activeListings(),
    approvedReviews({ take: 9 }),
    reviewStats(),
    activeBroadcasts().catch(() => []),
    db.reward.findMany({ where: { active: true }, orderBy: [{ pointsCost: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, pointsCost: true } }),
  ]);
  // Featured first, then the newest — so real stock shows even before anything is marked featured.
  const newPhones = phones.filter((p) => p.condition === "NEW");
  const featuredPhones = [...newPhones.filter((p) => p.featured), ...newPhones.filter((p) => !p.featured)].slice(0, 6);
  // One card per used SKU, each with its single grade (master brief §12).
  const usedPhones = toCatalogItems(phones.filter((p) => p.condition === "USED")).filter((c) => c.totalStock > 0).sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 6);
  const featuredTablets = tablets.filter((p) => p.featured).concat(tablets.filter((p) => !p.featured)).slice(0, 3);
  const featuredAcc = [...accessories.filter((p) => p.featured), ...accessories.filter((p) => !p.featured)].slice(0, 4);
  const tiers = parseTiers(passport.phoneTiers);
  const tierRange = tiers.length ? `${tiers[0].points}–${tiers[tiers.length - 1].points}` : "Bonus";

  return (
    <>
      <HeroStory belowCtas={broadcasts.length ? <BroadcastShowcase broadcasts={broadcasts} /> : undefined} />
      {/* Desktop: the hero is a pinned scroll story, so broadcasts sit centred straight after it (v6 §1). */}
      {broadcasts.length > 0 && (
        <div className="container-pb relative z-10 hidden pt-10 md:block">
          <BroadcastShowcase broadcasts={broadcasts} />
        </div>
      )}
      <Zone k="home.afterHero" />

      {/* Category entry points */}
      <section className="relative z-10 pb-6 pt-6 md:pt-14">
        <div className="container-pb grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-7">
          {[
            { id: "repair", href: "/repair", title: "Phone repairs", sub: "Screen, battery, software & more.", art: <RepairArt />, glow: "rgba(0,119,217,.45)" },
            { id: "newPhones", href: "/new-phones", title: "New phones", sub: "Latest models, official warranty.", art: <ProductArt kind="PHONE" colorHex="#3a3f4a" brand="Apple" name="iPhone 16 Pro" />, glow: "rgba(215,25,32,.4)" },
            { id: "usedPhones", href: "/used-phones", title: "Used phones", sub: "Lab-checked, one clear grade.", art: <ProductArt kind="PHONE" colorHex="#5b6b7d" brand="Samsung" name="Galaxy S23" />, glow: "rgba(217,166,46,.4)" },
            { id: "tablets", href: "/tablets", title: "Tablets", sub: "New & used iPad, Galaxy Tab.", art: <ProductArt kind="TABLET" colorHex="#8fa7c4" brand="Apple" name="iPad Air" />, glow: "rgba(0,119,217,.4)" },
            { id: "accessories", href: "/accessories", title: "Accessories", sub: "Cases, chargers & essentials.", art: <ProductArt kind="ACCESSORY" accessoryType="EARBUDS" colorHex="#e8e8e8" />, glow: "rgba(217,166,46,.4)" },
            { id: "installments", href: "#installments", title: "Installments", sub: "Easy plans · pay in store.", art: <ProductArt kind="PHONE" colorHex="#b8955a" brand="Infinix" name="NOTE 60" />, glow: "rgba(215,25,32,.35)" },
            // Custom Skins (v6 §3): opens the brand → model → preview page.
            { id: "customSkins", href: "/custom-skins", title: "Custom Skins", sub: "Try designs on your exact phone — or upload your own.", art: <SkinTileArt />, glow: "rgba(217,166,46,.45)", wide: true },
          ].map((c, i) => (
            <Reveal key={c.href} delay={i * 0.05} className={"wide" in c ? "col-span-2 xl:col-span-1" : undefined}>
              <Link href={c.href} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-gold/25 transition hover:ring-gold/70">
                <div className="relative aspect-[4/3.2] overflow-hidden bg-gradient-to-b from-[#0d1016] to-black">
                  <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 60%, ${c.glow}, transparent 70%)` }} />
                  <EditableMedia k={`home.tile.${c.id}.media`} fallback={c.art} className="absolute inset-2 transition-transform duration-500 group-hover:scale-105" mediaClassName="mx-auto h-full w-auto object-contain" />
                </div>
                <div className="flex flex-1 flex-col p-3.5 md:p-4">
                  <p className="flex items-center gap-1 font-semibold"><T k={`home.tile.${c.id}.title`} d={c.title} /> <Icon name="arrow-right" className="h-3.5 w-3.5 text-gold" /></p>
                  <p className="mt-1 text-xs leading-snug text-muted md:text-sm"><T k={`home.tile.${c.id}.text`} d={c.sub} /></p>
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
            ].map((x, i) => (
              <p key={x.t} className={`items-center justify-center gap-2.5 text-sm font-medium ${x.desktop ? "hidden md:flex" : "flex"}`}>
                <Icon name={x.icon} className="h-5 w-5 text-gold" /> <T k={`home.trust${i + 1}`} d={x.t} />
              </p>
            ))}
          </div>
        </div>
      </section>
      <Zone k="home.afterTiles" />

      {/* Featured phones */}
      {featuredPhones.length > 0 && (
        <Row k="home.row.newPhones" title="Featured Phones" href="/new-phones">
          {featuredPhones.map((p) => (
            <MiniCard key={p.id} href={`/product/${p.slug}`} name={`${p.name}${p.condition === "USED" ? " (Used)" : ""}`} price={p.fromPrice} art={<ProductArt kind="PHONE" colorHex={p.finishHex} brand={p.brand} name={p.name} compact />} />
          ))}
        </Row>
      )}

      {/* Used phones */}
      {usedPhones.length > 0 && (
        <Row k="home.row.usedPhones" title="Used Phones" href="/used-phones">
          {usedPhones.map((p) => (
            <MiniCard key={p.id} href={p.href} name={`${p.name}${p.grade ? ` · Grade ${p.grade}` : ""}`} price={p.fromPrice} art={<ProductArt kind="PHONE" colorHex={p.finishHex} brand={p.brand} name={p.name} compact />} />
          ))}
        </Row>
      )}

      {/* Strong CTAs (master brief §18) */}
      <div className="container-pb -mt-2 flex gap-2 overflow-x-auto pb-4 [scrollbar-width:none]">
        {[
          { href: "/new-phones", label: "Shop Phones", gold: true },
          { href: "/used-phones", label: "Shop Used Phones" },
          { href: "/tablets", label: "Shop Tablets" },
          { href: "/accessories", label: "View Accessories" },
          { href: "/repair", label: "Book a repair" },
        ].map((c, i) => (
          <Link key={c.href} href={c.href} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${c.gold ? "border-gold/50 hover:bg-gold/10" : "border-white/15 hover:border-white/40"}`}><T k={`home.links${i + 1}`} d={c.label} /></Link>
        ))}
      </div>

      <InstallmentPhones listings={brandMix(installments, 6)} brands={brandsWithListings(installments)} />

      {/* Tablets */}
      {featuredTablets.length > 0 && (
        <Row k="home.row.tablets" title="Tablets" href="/tablets">
          {featuredTablets.map((p) => (
            <MiniCard key={p.id} href={`/product/${p.slug}`} name={`${p.name}${p.condition === "USED" ? " (Used)" : ""}`} price={p.fromPrice} art={<ProductArt kind="TABLET" colorHex={p.finishHex} brand={p.brand} name={p.name} compact />} />
          ))}
        </Row>
      )}

      {/* Accessories */}
      {featuredAcc.length > 0 && (
        <Row k="home.row.accessories" title="Accessories" href="/accessories">
          {featuredAcc.map((p) => (
            <MiniCard key={p.id} href={`/product/${p.slug}`} name={p.name} price={p.fromPrice} art={p.images[0] ? <Image src={p.images[0]} alt="" fill sizes="(min-width: 768px) 16vw, 42vw" className="object-contain" /> : <ProductArt kind="ACCESSORY" accessoryType={p.accessoryType} colorHex={p.finishHex} />} />
          ))}
        </Row>
      )}

      <Zone k="home.beforeRewards" />

      {/* PB Rewards (loyalty / Phone Passport) */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(45%_60%_at_80%_40%,rgba(0,119,217,.35),transparent_70%),radial-gradient(40%_50%_at_95%_80%,rgba(215,25,32,.3),transparent_70%)]" />
        <div className="container-pb relative grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="display flex items-center gap-3 text-4xl md:text-6xl">
              <span className="text-gradient-gold"><T k="home.rewards.title" d="PB Rewards" /></span>
              <CrownIcon />
            </h2>
            <p className="mt-3 text-lg text-white/85"><T k="home.rewards.text" d="Your PB Rewards account earns PB Points when you shop, repair or buy a phone." multiline /></p>
            {/* Finalised PB Points system (v6 §10 + final amendment) — same rules as the engine and the /loyalty page. */}
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                `1 PB Point per Rs ${passport.rupeesPerPoint} spent on repairs & accessories`,
                `${tierRange} PB Points per phone, by phone value — new, used & installment phones`,
                ...(passport.welcomePoints > 0 ? [`${passport.welcomePoints} welcome points after your first purchase or repair`] : []),
                ...(passport.referralPoints > 0 ? [`${passport.referralPoints} points for every friend you refer, after their first purchase`] : []),
                "Extra bonus points from our team from time to time",
                `PB Points are valid for ${passport.expiryMonths} months from the date earned`,
              ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-[#120d02]"><Icon name="check" className="h-3 w-3" strokeWidth={3} /></span>
                    {t}
                  </li>
                ))}
            </ul>
            {rewards.length > 0 && (
              <div className="mt-6 rounded-2xl bg-black/40 p-4 ring-1 ring-gold/30">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold"><T k="home.rewards.redeem" d="Redeem your PB Points" /></p>
                <ul className="mt-2 divide-y divide-white/10 text-sm">
                  {rewards.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex items-center gap-2"><Icon name="star" className="h-4 w-4 text-gold" /> <b>{r.pointsCost} Points</b></span>
                      <span className="text-right text-white/85">{r.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/account" className="btn btn-gold"><T k="home.rewards.cta1" d="Join for free" /> <Icon name="arrow-right" className="h-4 w-4" /></Link>
              <Link href="/loyalty" className="btn border border-white/20 text-white hover:border-white/50"><T k="home.rewards.cta2" d="How it works" /></Link>
            </div>
          </div>
          <div>
            <FlipPassportCard />
          </div>
        </div>
        <div className="container-pb relative mt-12 grid grid-cols-3 gap-3 text-center md:gap-6">
          {[
            { icon: "user", t: "1. Join free", d: "Create your account in seconds." },
            { icon: "gift", t: "2. Earn points", d: "On repairs, accessories and phones." },
            { icon: "star", t: "3. Redeem rewards", d: rewards.length ? rewards.map((r) => r.name.replace(/^Free\s+/i, "")).join(", ") + "." : "Rewards in store." },
          ].map((s, i) => (
            <div key={s.t}>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold/60 text-gold"><Icon name={s.icon} className="h-6 w-6" /></span>
              <p className="mt-3 text-sm font-semibold md:text-base"><T k={`home.rewards.step${i + 1}`} d={s.t} /></p>
              <p className="mt-1 text-xs text-muted md:text-sm">{i < 2 ? <T k={`home.rewards.step${i + 1}.text`} d={s.d} /> : s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How repairs work */}
      <section className="py-14 md:py-20">
        <div className="container-pb">
          <h2 className="display text-3xl md:text-5xl"><T k="home.how.title" d="How repairs work" /></h2>
          <p className="mt-2 text-muted"><T k="home.how.text" d="A simple process to get you back up and running." multiline /></p>
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
                  <p className="mt-3 text-sm font-semibold leading-tight md:mt-4 md:text-base"><T k={`home.how.step${s.n}`} d={s.t} /></p>
                  <p className="mt-1 text-xs leading-snug text-muted md:text-sm"><T k={`home.how.step${s.n}.text`} d={s.d} /></p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Zone k="home.beforeReviews" />

      {/* Customer reviews — genuine, moderated reviews only */}
      <section className="py-14 md:py-20">
        <div className="container-pb">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-3xl md:text-5xl"><T k="home.reviews.title" d="Customer reviews" /></h2>
              {stats.count > 0 ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Stars value={stats.average ?? 0} /> <b className="text-white">{stats.average}</b> from {stats.count} review{stats.count > 1 ? "s" : ""}</p>
              ) : (
                <p className="mt-2 text-sm text-muted"><T k="home.reviews.first" d="Be one of the first to review PB Mobiles." /></p>
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
                  <p className="mt-3 font-semibold"><T k="home.reviews.empty" d="Reviews from real customers appear here." /></p>
                  <p className="mt-1 text-sm text-muted"><T k="home.reviews.empty2" d="Bought a phone or had a repair with us? We'd love to hear from you." /></p>
                </div>
              </div>
            )}
            <ReviewForm />
          </div>
        </div>
      </section>

      {/* Visit the shop — address, opening hours and contact details (client request) */}
      <section className="pb-14 md:pb-20">
        <div className="container-pb">
          <div className="grid gap-6 rounded-[1.75rem] bg-card p-6 ring-1 ring-gold/30 md:grid-cols-[1.3fr_1fr] md:p-10">
            <div>
              <p className="eyebrow text-gold"><T k="home.visit.eyebrow" d="Visit the shop" /></p>
              <h2 className="display mt-3 text-3xl md:text-5xl"><T k="home.visit.title" d="Come and see us." /></h2>
              <p className="mt-4 flex items-start gap-3 text-white/85"><Icon name="pin" className="mt-1 h-5 w-5 shrink-0 text-gold" /> <T k="store.address" d={BRAND.address} multiline /></p>
              <p className="mt-3 flex items-start gap-3 text-white/85"><Icon name="clock" className="mt-1 h-5 w-5 shrink-0 text-gold" /> <span><T k="store.hours" d={BRAND.hours.map((h) => `${h.days} · ${h.time}`).join("\n")} multiline /></span></p>
              <p className="mt-3 flex items-start gap-3 text-white/85"><Icon name="call" className="mt-1 h-5 w-5 shrink-0 text-gold" /> <T k="store.phone" d={BRAND.phone} /></p>
            </div>
            <div className="grid content-center gap-3">
              <StoreLink type="tel" k="store.phone" d={BRAND.phone} className="btn btn-gold !justify-between">
                <span className="flex items-center gap-2"><Icon name="call" className="h-4 w-4" /> <T k="home.visit.call" d="Call the shop" /></span> <Icon name="arrow-right" className="h-4 w-4" />
              </StoreLink>
              <StoreLink type="wa" k="store.whatsapp" d={BRAND.whatsapp} className="btn !justify-between border border-emerald-500/60 text-white hover:bg-emerald-500/10">
                <span className="flex items-center gap-2"><Icon name="chat" className="h-4 w-4" /> <T k="home.visit.whatsapp" d="WhatsApp us" /></span> <Icon name="arrow-right" className="h-4 w-4" />
              </StoreLink>
              <Link href="/contact" className="btn !justify-between border border-white/20 text-white hover:border-white/50">
                <span className="flex items-center gap-2"><Icon name="pin" className="h-4 w-4" /> <T k="home.visit.directions" d="Map & directions" /></span> <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
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
                  <EditableHeadline k="home.ready.title" d="Ready when you are" />
                  <span className="text-gold">.</span>
                </h2>
                <p className="mt-3 max-w-md text-white/75"><T k="home.ready.text" d="Book a repair today and get your device back in expert hands." multiline /></p>
                <Link href="/repair" className="btn btn-gold mt-6"><Icon name="wrench" className="h-4 w-4" /> <T k="home.ready.cta" d="Book a repair" /> <Icon name="arrow-right" className="h-4 w-4" /></Link>
              </div>
              <EditableMedia k="home.ready.media" fallback={<RepairArt />} className="mx-auto h-48 w-40 md:h-64 md:w-52" mediaClassName="h-full w-full object-contain" />
            </div>
          </Reveal>
        </div>
      </section>
      <Zone k="home.bottom" />
    </>
  );
}

function Row({ k, title, href, children }: { k: string; title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="py-8 md:py-12">
      <div className="container-pb">
        <div className="flex items-end justify-between">
          <h2 className="display text-2xl md:text-4xl"><T k={`${k}.title`} d={title} /></h2>
          <Link href={href} className="flex items-center gap-1 text-sm font-medium text-gold hover:text-gold-soft"><T k="home.row.viewAll" d="View all" /> <Icon name="arrow-right" className="h-3.5 w-3.5" /></Link>
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

/** Custom Skins tile art: the client's photo of a customised phone skin, edges faded into the tile. */
function SkinTileArt() {
  return (
    <Image
      src="/brand/custom-skin-tile.webp"
      alt="Phone with a custom photo skin"
      width={720}
      height={900}
      sizes="(min-width: 1280px) 20vw, 50vw"
      className="mx-auto h-full w-auto object-contain [mask-image:radial-gradient(75%_70%_at_50%_50%,#000_60%,transparent_100%)]"
    />
  );
}

/** Up to `n` plans for the homepage, taking one from each brand in turn (the full list is on /installments). */
function brandMix<T extends { brand: string | null }>(list: T[], n: number) {
  const groups = new Map<string, T[]>();
  for (const l of list) groups.set(l.brand ?? "", [...(groups.get(l.brand ?? "") ?? []), l]);
  const out: T[] = [];
  for (let i = 0; out.length < n && [...groups.values()].some((g) => g.length > i); i++) for (const g of groups.values()) if (g[i] && out.length < n) out.push(g[i]);
  return out;
}
