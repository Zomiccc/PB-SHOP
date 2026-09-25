"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Icon } from "../ui/Icon";

const HeroCanvas = dynamic(() => import("../three/HeroCanvas"), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

const LAYERS = [
  { label: "Screen & glass", detail: "OLED / LCD replacement", pos: "left-[6%] top-[22%] md:left-[20%] md:top-[24%]" },
  { label: "Logic board", detail: "Micro-soldering & diagnostics", pos: "right-[6%] top-[34%] md:right-[20%] md:top-[30%]" },
  { label: "Battery", detail: "Health check & replacement", pos: "left-[6%] top-[46%] md:left-[22%] md:top-[60%]" },
  { label: "Back glass & camera", detail: "Housing, lens & port repair", pos: "right-[6%] top-[56%] md:right-[18%] md:top-[66%]" },
];

/** true = desktop/tablet (≥768px), false = phone, null = not known yet (server render). */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 768px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => null,
  );
}

/**
 * Home hero. Desktop: pinned scroll story with copy beside the 3D phone.
 * Phones: the 3D phone gets its own frame and the copy flows underneath — nothing is layered
 * over the canvas, so text and 3D can never overlap on small screens.
 */
export function HeroStory() {
  const isDesktop = useIsDesktop();
  return (
    <>
      <MobileHero active={isDesktop === false} />
      <DesktopHero active={isDesktop === true} />
    </>
  );
}

const PHASES = [
  { until: 0.22, text: "Your phone. Sorted." },
  { until: 0.45, text: "New & used · lab-checked" },
  { until: 0.74, text: "Screen · board · battery · back glass" },
  { until: 1.01, text: "Everything your phone needs" },
];
const LOOP_SECONDS = 14;

function MobileHero({ active }: { active: boolean }) {
  const progress = useRef(0);
  const reduced = useReducedMotion() ?? false;
  const [phase, setPhase] = useState(0);

  // Self-playing loop: float → turn → explode into layers → reassemble (p=1 looks identical to p=0).
  useEffect(() => {
    if (!active || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = (((now - start) / 1000) % LOOP_SECONDS) / LOOP_SECONDS;
      progress.current = p;
      const i = PHASES.findIndex((ph) => p < ph.until);
      setPhase((prev) => (prev === i ? prev : i));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);

  return (
    <section aria-label="PB Mobiles — phones and repairs" className="relative -mt-[var(--header-h)] overflow-hidden bg-navy-950 pt-[var(--header-h)] text-white md:hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,#0f3a63_0%,#071a2b_55%,#040f1a_100%)]" />
      <div className="relative h-[min(50svh,420px)] min-h-[290px]">
        {active && <HeroCanvas progress={progress} box />}
        <p className="absolute inset-x-0 bottom-2 flex justify-center" aria-hidden>
          <span className="rounded-full border border-white/15 bg-navy-950/70 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-gold backdrop-blur">
            {PHASES[phase].text}
          </span>
        </p>
      </div>
      <div className="container-pb relative pb-12 pt-4">
        <p className="eyebrow text-gold">Your phone. Sorted.</p>
        <h1 className="display mt-3 text-[2.55rem] leading-[0.98]">
          Love your phone. <span className="text-red">We&apos;ll handle the rest</span>
          <span className="text-gold">.</span>
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-white/70">
          New and lab-checked used phones, expert repairs and the little extras — all at PB Mobiles &amp; Repairing Lab.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {[
            { href: "/new-phones", label: "New phones", icon: "phone" },
            { href: "/used-phones", label: "Used phones", icon: "shield" },
            { href: "/repair", label: "Book a repair", icon: "wrench" },
            { href: "/accessories", label: "Accessories", icon: "bolt" },
          ].map((c, i) => (
            <Link
              key={c.href}
              href={c.href}
              className={`flex items-center justify-between gap-2 rounded-2xl p-4 text-sm font-semibold ${i === 0 ? "bg-red" : i === 2 ? "bg-gold text-navy-950" : "border border-white/15 bg-white/[0.04]"}`}
            >
              <span className="flex items-center gap-2">
                <Icon name={c.icon} className="h-4 w-4" />
                {c.label}
              </span>
              <Icon name="arrow-up-right" className="h-4 w-4 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesktopHero({ active }: { active: boolean }) {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const bar = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  useIsoLayout(() => {
    if (!active || reduced || !section.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            progress.current = self.progress;
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      // Timeline spans exactly 0 → 1 so positions below read as scroll progress.
      tl.to({}, { duration: 1 }, 0);
      tl.to("[data-ch='1']", { autoAlpha: 0, y: -60, duration: 0.08 }, 0.14);
      tl.fromTo("[data-ch='2']", { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.28);
      tl.to("[data-ch='2']", { autoAlpha: 0, y: -60, duration: 0.07 }, 0.42);
      tl.fromTo("[data-ch='3']", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.52);
      tl.fromTo("[data-layer]", { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.05, stagger: 0.02 }, 0.56);
      tl.to("[data-ch='3']", { autoAlpha: 0, duration: 0.06 }, 0.72);
      tl.fromTo("[data-ch='4']", { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.82);
      tl.fromTo("[data-hint]", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.05 }, 0.9);

      // Dev-only QA hook: /?story=0.6 freezes the story at that progress without scrolling.
      const forced = process.env.NODE_ENV !== "production" ? new URLSearchParams(location.search).get("story") : null;
      if (forced !== null) {
        (window as unknown as { __pbStoryForced?: boolean }).__pbStoryForced = true;
        tl.scrollTrigger?.kill();
        tl.progress(Number(forced));
        progress.current = Number(forced);
      }
    }, section);
    return () => ctx.revert();
  }, [active, reduced]);

  return (
    <section
      ref={section}
      aria-label="PB Mobiles — phones and repairs"
      className="relative -mt-[var(--header-h)] hidden bg-navy-950 text-white md:block"
      style={{ height: reduced ? "100svh" : "460svh" }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Backdrop */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,#0f3a63_0%,#071a2b_55%,#040f1a_100%)]" />
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <p aria-hidden className="display pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[34vw] leading-none text-white/[0.025] md:text-[26vw]">
          PB LAB
        </p>

        {active && <HeroCanvas progress={progress} />}

        {/* Chapter 1 — hero */}
        <div data-ch="1" className="container-pb pointer-events-none absolute inset-0 flex items-end pb-24 pt-[var(--header-h)] md:items-center md:pb-0">
          <div className="pointer-events-auto max-w-xl">
            <p className="eyebrow text-gold">Your phone. Sorted.</p>
            <h1 className="display mt-4 text-[min(2.6rem,6svh)] sm:mt-5 sm:text-[min(4.5rem,10svh)] lg:text-[min(6.2rem,11.5svh)]">
              Love your phone.
              <br />
              <span className="text-red">We&apos;ll handle</span>
              <br />
              <span className="text-red">the rest</span>
              <span className="text-gold">.</span>
            </h1>
            <p className="mt-6 hidden max-w-md text-base leading-relaxed text-white/70 sm:block md:text-lg">
              A new phone, a second chance for your current one, or the little extras that make it yours. Find it all at PB Mobiles &amp; Repairing Lab.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <Link href="/new-phones" className="btn btn-red">
                Shop new phones <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link href="/repair" className="btn btn-ghost-light">
                Book a repair <Icon name="arrow-up-right" className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 hidden items-center gap-3 text-sm text-white/60 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/40 text-gold">
                <Icon name="sparkle" className="h-4 w-4" />
              </span>
              <span>
                <b className="font-semibold text-white">Repair. Refresh. Repeat.</b> One place for your everyday tech.
              </span>
            </div>
          </div>
        </div>

        {/* Chapter 2 — new & used */}
        <div data-ch="2" className="invisible container-pb pointer-events-none absolute inset-0 flex items-end justify-end pb-24 md:items-center md:pb-0">
          <div className="pointer-events-auto max-w-lg md:text-right">
            <p className="eyebrow text-gold md:flex-row-reverse">01 / Phone shop</p>
            <h2 className="display mt-4 text-4xl sm:mt-5 sm:text-5xl md:text-7xl">
              New or pre-loved.
              <br />
              <span className="text-blue-soft">Always checked.</span>
            </h2>
            <p className="mt-5 hidden text-white/70 sm:block md:text-lg">
              Brand-new devices with official warranty, and used phones graded A+ to C with battery health, notes and a PB Lab warranty on every one.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 md:justify-end">
              <Link href="/new-phones" className="btn btn-gold">Shop new phones</Link>
              <Link href="/used-phones" className="btn btn-ghost-light">Shop used phones</Link>
            </div>
          </div>
        </div>

        {/* Chapter 3 — exploded repair view */}
        <div data-ch="3" className="invisible pointer-events-none absolute inset-0">
          <div className="container-pb absolute inset-x-0 top-[calc(var(--header-h)+1rem)] text-center md:top-[calc(var(--header-h)+2rem)]">
            <p className="eyebrow justify-center text-gold">02 / Repairing lab</p>
            <h2 className="display mt-3 text-4xl md:text-6xl">
              Every layer. <span className="text-red">Handled.</span>
            </h2>
          </div>
          {LAYERS.map((l) => (
            <div key={l.label} data-layer className={`absolute ${l.pos} max-w-[9.5rem] md:max-w-none`}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-gold shadow-[0_0_16px_4px_rgba(217,166,46,.55)]" />
                <span className="text-sm font-semibold md:text-base">{l.label}</span>
              </div>
              <p className="ml-4 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-white/50 md:text-[0.68rem]">{l.detail}</p>
            </div>
          ))}
          <div className="pointer-events-auto absolute inset-x-0 bottom-20 flex justify-center md:bottom-14">
            <Link href="/repair" className="btn btn-red">
              Book a repair <Icon name="wrench" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Chapter 4 — CTA grid */}
        <div data-ch="4" className="invisible container-pb pointer-events-none absolute inset-0 flex items-end pb-16 md:items-center md:pb-0">
          <div className="pointer-events-auto w-full max-w-xl">
            <p className="eyebrow text-gold">03 / Everything in one place</p>
            <h2 className="display mt-4 text-4xl sm:text-5xl md:text-7xl">
              Everything your
              <br />
              phone <span className="text-gradient-gold">needs.</span>
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { href: "/new-phones", label: "Shop New Phones", icon: "phone", tone: "hover:border-blue hover:bg-blue/10" },
                { href: "/used-phones", label: "Shop Used Phones", icon: "shield", tone: "hover:border-gold hover:bg-gold/10" },
                { href: "/repair", label: "Book a Repair", icon: "wrench", tone: "hover:border-red hover:bg-red/10" },
                { href: "/accessories", label: "View Accessories", icon: "bolt", tone: "hover:border-white hover:bg-white/10" },
              ].map((c) => (
                <Link key={c.href} href={c.href} className={`group flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/[0.03] p-4 backdrop-blur transition-colors sm:p-5 ${c.tone}`}>
                  <span className="flex items-center gap-3 text-sm font-semibold sm:text-base">
                    <Icon name={c.icon} className="h-5 w-5 text-gold" />
                    {c.label}
                  </span>
                  <Icon name="arrow-up-right" className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint + progress */}
        {!reduced && (
          <>
            <div data-hint className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/50 md:flex">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em]">Scroll to explore</span>
              <span className="h-10 w-px overflow-hidden bg-white/15">
                <span className="block h-1/2 w-full animate-[float_1.6s_ease-in-out_infinite] bg-gold" />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5">
              <div ref={bar} className="h-full origin-left scale-x-0 bg-gradient-to-r from-blue via-gold to-red" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
