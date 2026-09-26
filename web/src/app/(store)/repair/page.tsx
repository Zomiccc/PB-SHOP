import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { RepairForm } from "@/components/repair/RepairForm";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { getCurrentCustomer } from "@/lib/auth";
import { REPAIR_STATUSES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Phone Repair — Book Online",
  description: "Book a phone repair at PB Repairing Lab: screens, batteries, charging ports, cameras, water damage and more. Get a repair reference instantly and track progress.",
};

const SERVICES = [
  { icon: "phone", t: "Screen & display", d: "Cracked glass, dead pixels, touch issues" },
  { icon: "battery", t: "Battery", d: "Fast drain, swelling, sudden shutdowns" },
  { icon: "bolt", t: "Charging port", d: "Loose cable, slow or no charging" },
  { icon: "sparkle", t: "Camera & lens", d: "Blurry photos, cracked lens, focus faults" },
  { icon: "shield", t: "Water damage", d: "Ultrasonic clean and board inspection" },
  { icon: "wrench", t: "Board & software", d: "Micro-soldering, updates, lock issues" },
];

export default async function RepairPage(props: PageProps<"/repair">) {
  const sp = await props.searchParams;
  const customer = await getCurrentCustomer();
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  return (
    <>
      <PageHero
        dark
        eyebrow="PB Repairing Lab"
        title="Something not"
        accent="working right?"
        intro="Tell us what's happening and create a clear visit note before you come in. We diagnose first and confirm the price before any work begins."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#form" className="btn btn-red">Start my repair</a>
          <Link href="/repair/track" className="btn btn-ghost-light">Track a repair</Link>
        </div>
      </PageHero>

      {/* Services */}
      <section className="bg-navy-950 pb-20 text-white">
        <div className="container-pb grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/10 md:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.05} className="bg-navy-950 p-6 md:p-8">
              <Icon name={s.icon} className="h-7 w-7 text-gold" />
              <p className="mt-5 font-semibold md:text-lg">{s.t}</p>
              <p className="mt-1 text-sm text-white/55">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 md:py-28">
        <div className="container-pb">
          <p className="eyebrow text-red">How it works</p>
          <h2 className="display mt-4 text-4xl md:text-6xl">From drop-off to done.</h2>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {REPAIR_STATUSES.map((s, i) => (
              <Reveal key={s.key} delay={i * 0.05}>
                <li className="relative h-full rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                  <span className="font-mono text-xs text-red">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-3 font-semibold leading-tight">{s.label}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Form */}
      <section id="form" className="scroll-mt-28 pb-24 md:pb-32">
        <div className="container-pb grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow text-red">Book a repair</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">Create your visit note.</h2>
            <p className="mt-4 text-muted">You&apos;ll get a repair reference instantly. Bring your phone in, book a slot, or request pickup.</p>
            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex gap-3"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" /> Free diagnosis before any paid work</li>
              <li className="flex gap-3"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" /> Price approved by you before we repair</li>
              <li className="flex gap-3"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" /> Repair history saved to your PB Phone Passport</li>
              <li className="flex gap-3"><Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" /> Care Card services redeemable on eligible visits</li>
            </ul>
          </div>
          <RepairForm defaults={{ device: str(sp.device), issue: str(sp.issue), name: customer?.name, phone: customer?.phone, email: customer?.email ?? undefined }} />
        </div>
      </section>
    </>
  );
}
