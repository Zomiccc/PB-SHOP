import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { Reveal, SplitHeadline } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "About Us",
  description: "PB Mobiles & Repairing Lab — new and used phones, genuine accessories and expert repairs, with honest advice and service you can trust.",
};

// NOTE: story copy is a placeholder draft — replace with PB Mobiles' real history, founding year and team details.
export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About PB Mobiles" title="Phones, repairs" accent="and people." intro="We started PB Mobiles with a simple idea: buying, fixing and upgrading a phone should feel straightforward, honest and friendly." />

      <section className="pb-20">
        <div className="container-pb">
          <Reveal className="relative aspect-[16/9] overflow-hidden rounded-[2rem] md:aspect-[21/9]">
            <Image src="/brand/pb-logo-scene.jpg" alt="PB Mobiles & Repairing Lab" fill sizes="100vw" className="object-cover" />
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-pb grid gap-12 lg:grid-cols-2">
          <h2 className="display text-4xl md:text-6xl">
            <SplitHeadline text="A shop and a lab, under one roof." />
          </h2>
          <Reveal className="space-y-5 text-lg text-muted">
            <p>PB Mobiles &amp; Repairing Lab brings together a phone shop and a proper repair workshop. That means the people selling you a phone are the same people who know how to look after it.</p>
            <p>Every used phone we sell passes through our lab first — tested, graded honestly and listed with battery health and notes. Every repair starts with a diagnosis, and nothing is done without your approval.</p>
            <p>With the PB Phone Passport and Care Card, we stay with you long after you leave the counter.</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-navy-950 py-24 text-white">
        <div className="container-pb">
          <p className="eyebrow text-gold">What we stand for</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: "wrench", t: "Repair expertise", d: "Screen, battery, charging, camera and board-level repairs using quality parts and proper tools." },
              { icon: "call", t: "Real customer service", d: "Clear advice, honest prices and updates on WhatsApp — before, during and after every visit." },
              { icon: "shield", t: "Trust, in writing", d: "Warranty on devices and repairs, transparent used-phone grading, and a clear returns policy." },
            ].map((v, i) => (
              <Reveal key={v.t} delay={i * 0.08} className="rounded-3xl bg-white/[0.04] p-8 ring-1 ring-white/10">
                <Icon name={v.icon} className="h-7 w-7 text-gold" />
                <h3 className="display mt-6 text-2xl">{v.t}</h3>
                <p className="mt-3 text-white/60">{v.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-pb flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <h2 className="display max-w-2xl text-4xl md:text-6xl">Come and say hello.</h2>
          <div className="flex gap-3">
            <Link href="/contact" className="btn btn-primary">Find the shop</Link>
            <Link href="/repair" className="btn btn-red">Book a repair</Link>
          </div>
        </div>
      </section>
    </>
  );
}
