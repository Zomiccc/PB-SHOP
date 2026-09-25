import Link from "next/link";
import Image from "next/image";
import { HeroStory } from "@/components/home/HeroStory";
import { QuickRepair } from "@/components/home/QuickRepair";
import { PassportCard } from "@/components/home/PassportCard";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal, SplitHeadline } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { listProducts, toCatalogItems } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ACCESSORY_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MARQUEE = ["New phones", "Used phones — graded & tested", "Screen repairs", "Battery replacement", "Charging port fixes", "Genuine accessories", "PB Phone Passport", "Care Card benefits"];

export default async function HomePage() {
  const [phones, accessories, careServices] = await Promise.all([
    listProducts({ type: "PHONE" }),
    listProducts({ type: "ACCESSORY" }),
    db.careCardService.findMany({ where: { active: true }, orderBy: { visitNumber: "asc" } }),
  ]);
  const featured = toCatalogItems(phones.filter((p) => p.featured)).slice(0, 4);
  const featuredAcc = toCatalogItems(accessories.filter((p) => p.featured)).slice(0, 4);
  const newCount = phones.filter((p) => p.condition === "NEW").length;
  const usedCount = phones.filter((p) => p.condition === "USED").length;

  return (
    <>
      <HeroStory />

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-gold/25 bg-navy-900 py-4 text-white">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="flex items-center gap-10 font-mono text-xs uppercase tracking-[0.25em] text-white/70">
              {m}
              <span className="text-gold">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* What we do — repair + shop cards (reference layout) */}
      <section className="bg-navy-950 py-24 text-white md:py-32">
        <div className="container-pb">
          <Reveal>
            <p className="eyebrow text-gold">What we do</p>
          </Reveal>
          <h2 className="display mt-5 max-w-3xl text-5xl md:text-7xl">
            <SplitHeadline text="Everything your phone needs." />
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-white/60 md:text-lg">From the moment you pick a phone to the moment it needs a little care.</p>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <Reveal className="relative overflow-hidden rounded-[1.75rem] bg-cream p-7 text-ink md:p-10">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-red">01 / Repair lab</p>
                <Icon name="sparkle" className="h-6 w-6 text-gold" />
              </div>
              <h3 className="display mt-6 text-4xl md:text-5xl">Something not working right?</h3>
              <p className="mt-4 max-w-md text-muted">Tell us what is happening and create a clear visit note before you come in. Screens, batteries, charging and more.</p>
              <QuickRepair />
            </Reveal>

            <Reveal delay={0.1} className="relative flex flex-col overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-navy-800 to-navy-900 p-7 ring-1 ring-white/10 md:p-10">
              <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue/25 blur-3xl" />
              <div className="relative flex items-center justify-between">
                <p className="eyebrow text-gold">02 / Phone shop</p>
                <Icon name="phone" className="h-6 w-6 text-gold" />
              </div>
              <h3 className="display relative mt-6 text-4xl md:text-5xl">Find your next favourite.</h3>
              <p className="relative mt-4 max-w-md text-white/60">Explore a starting point, then ask about current models, condition and availability in store.</p>
              <div className="relative mt-6 flex flex-wrap gap-2">
                <Link href="/new-phones?sort=price-asc" className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-950">Everyday</Link>
                <Link href="/new-phones?brand=Apple,Samsung,Google" className="rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white">Camera</Link>
                <Link href="/used-phones" className="rounded-full border border-white/20 px-4 py-2 text-sm hover:border-white">Great value</Link>
              </div>
              <div className="relative mt-8 grid flex-1 grid-cols-2 gap-4">
                <Link href="/new-phones" className="group flex flex-col justify-between rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10 transition hover:bg-white/[0.09] hover:ring-blue/60">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-blue-soft">{newCount} models</span>
                  <span className="mt-10">
                    <span className="display block text-3xl">New</span>
                    <span className="mt-1 flex items-center gap-1 text-sm text-white/60">Official warranty <Icon name="arrow-up-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                  </span>
                </Link>
                <Link href="/used-phones" className="group flex flex-col justify-between rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10 transition hover:bg-white/[0.09] hover:ring-gold/60">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gold">{usedCount} devices</span>
                  <span className="mt-10">
                    <span className="display block text-3xl">Used</span>
                    <span className="mt-1 flex items-center gap-1 text-sm text-white/60">Graded &amp; tested <Icon name="arrow-up-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured phones */}
      <section className="py-24 md:py-32">
        <div className="container-pb">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Reveal>
                <p className="eyebrow text-red">Featured</p>
              </Reveal>
              <h2 className="display mt-5 text-5xl md:text-7xl">
                <SplitHeadline text="Picked by the lab." />
              </h2>
            </div>
            <Reveal delay={0.1} className="flex gap-3">
              <Link href="/new-phones" className="btn btn-primary">Shop new phones</Link>
              <Link href="/used-phones" className="btn btn-ghost text-navy-950"><span>Shop used phones</span></Link>
            </Reveal>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.08}>
                <ProductCard item={item} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Accessories */}
      <section className="relative overflow-hidden bg-navy-950 py-24 text-white md:py-32">
        <div aria-hidden className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        <div className="container-pb">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal>
                <p className="eyebrow text-gold">Complete the setup</p>
              </Reveal>
              <h2 className="display mt-5 text-5xl md:text-6xl">
                <SplitHeadline text="The little extras." />
              </h2>
              <Reveal delay={0.1}>
                <p className="mt-5 text-white/60">Cases, chargers, screen protection and more — genuine and quality-checked, with free protector fitting in store.</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {Object.entries(ACCESSORY_TYPES)
                    .filter(([k]) => k !== "OTHER")
                    .map(([k, v]) => (
                      <Link key={k} href={`/accessories?type=${k}`} className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-white/80 transition hover:border-gold hover:text-gold">
                        {v}
                      </Link>
                    ))}
                </div>
                <Link href="/accessories" className="btn btn-gold mt-8">
                  View accessories <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-8">
              {featuredAcc.map((item, i) => (
                <Reveal key={item.id} delay={i * 0.08}>
                  <ProductCard item={item} dark />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PB Phone Passport + Care Card */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="container-pb grid items-center gap-16 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="eyebrow text-red">A reason to drop by</p>
            </Reveal>
            <h2 className="display mt-5 text-5xl md:text-7xl">
              Meet the <span className="text-gradient-brand">PB Phone Passport.</span>
            </h2>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-lg text-lg text-muted">
                Turn every visit into a useful check-in. Earn points on purchases and repairs, keep your repair history in one place, and unlock rewards and member offers.
              </p>
              <ol className="mt-8 grid grid-cols-3 gap-3 border-y border-ink/10 py-5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink/70">
                <li><span className="text-red">01</span> Earn</li>
                <li><span className="text-red">02</span> Track</li>
                <li><span className="text-red">03</span> Redeem</li>
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/account" className="btn btn-primary">
                  Start with your phone <Icon name="arrow-up-right" className="h-4 w-4" />
                </Link>
                <Link href="/loyalty" className="btn btn-ghost text-navy-950"><span>How it works</span></Link>
              </div>
            </Reveal>
          </div>
          <div>
            <PassportCard />
            <Reveal delay={0.2} className="mx-auto mt-12 max-w-[440px] rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="font-semibold">PB Care Card</p>
                <span className="rounded-full bg-gold/15 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#8a6410]">Up to 5 visits</span>
              </div>
              <p className="mt-1 text-sm text-muted">Included with eligible phone purchases.</p>
              <ul className="mt-4 space-y-2">
                {careServices.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-950 font-mono text-[0.65rem] text-gold">{s.visitNumber}</span>
                    {s.name}
                  </li>
                ))}
                {careServices.length < 5 && (
                  <li className="flex items-center gap-3 text-sm text-muted">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-ink/25 font-mono text-[0.65rem]">5</span>
                    Fifth visit benefit — announced soon
                  </li>
                )}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[420px] overflow-hidden lg:min-h-[640px]">
            <Image src="/brand/pb-logo-scene.jpg" alt="PB Mobiles & Repairing Lab sign in the store" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-navy-950" />
            <div className="absolute inset-x-6 bottom-6 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.25em] text-white/70">
              <span>Built by experts</span>
              <span>Backed by genuine parts</span>
            </div>
          </div>
          <div className="container-pb flex flex-col justify-center py-20 lg:px-16">
            <Reveal>
              <p className="eyebrow text-gold">Why PB Mobiles</p>
            </Reveal>
            <h2 className="display mt-5 text-5xl md:text-6xl">
              <SplitHeadline text="Trust, built in." />
            </h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
              {[
                { icon: "shield", t: "Warranty on every device", d: "Official warranty on new phones and a PB Lab warranty on used ones." },
                { icon: "wrench", t: "Transparent repairs", d: "Diagnosis first, approval before work, and a reference to track every step." },
                { icon: "battery", t: "Honest used grading", d: "Grades A+ to C, battery health and notes listed up front." },
                { icon: "card", t: "Secure local payments", d: "Wallets, bank and card through a verified Pakistani gateway." },
              ].map((f, i) => (
                <Reveal key={f.t} delay={i * 0.06} className="bg-navy-950 p-6">
                  <Icon name={f.icon} className="h-6 w-6 text-gold" />
                  <p className="mt-4 font-semibold">{f.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{f.d}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visit CTA */}
      <section className="py-24 md:py-32">
        <div className="container-pb">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-red px-7 py-16 text-white md:px-16 md:py-20">
            <div aria-hidden className="absolute -right-20 -top-20 h-80 w-80 rounded-full border-[40px] border-white/10" />
            <div aria-hidden className="absolute -bottom-24 right-40 h-64 w-64 rounded-full bg-blue/40 blur-3xl" />
            <div className="relative grid items-end gap-10 md:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow text-white/80">Visit the lab</p>
                <h2 className="display mt-5 text-5xl md:text-7xl">Bring it in. We&apos;ll sort it out.</h2>
                <p className="mt-5 max-w-lg text-white/80">Walk in, book a time slot, or start online and skip the queue with your repair reference.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/repair" className="btn bg-white text-red hover:bg-cream">Book a repair</Link>
                <Link href="/contact" className="btn btn-ghost-light">Find us</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
