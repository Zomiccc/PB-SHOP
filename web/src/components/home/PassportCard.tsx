"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * PB Rewards / Phone Passport card, following the client's reference design: PB logo, gold
 * circuit lines, blue + red swooshes, "PB REWARDS" and a gold points coin.
 * (No "tap to reveal" and no visit counter — both removed at the client's request.)
 * With a customer's `points` / `number` it is their digital card; without them it's a labelled sample.
 * `expires` is only passed for the digital card when the owner turns that on — the printed (physical)
 * card never shows the expiry date (Passport requirements §1).
 */
export function PassportCard({ name, number, points, expires, still = false }: { name?: string; number?: string; points?: number; expires?: string | null; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [12, -12]), { stiffness: 160, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 1], [-16, 16]), { stiffness: 160, damping: 16 });
  const glareX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [0, 1], ["0%", "100%"]);
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,.4), transparent 45%)`);
  const sample = points == null;
  const shown = (points ?? 1250).toLocaleString("en-PK");

  return (
    <div
      ref={ref}
      style={{ perspective: 1100 }}
      className={still ? "@container w-full" : "@container mx-auto w-full max-w-[460px] touch-pan-y"}
      onPointerMove={(e) => {
        if (still || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        {...(still ? {} : { initial: { rotateZ: -6, y: 30, opacity: 0 }, whileInView: { rotateZ: -3, y: 0, opacity: 1 } })}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        aria-label={sample ? "Sample PB Rewards card" : `PB Rewards card — ${shown} points`}
        role="img"
        className="print-exact relative aspect-[1.586] overflow-hidden rounded-[4.5cqw] bg-[#05070b] text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.9),0_0_0_1px_rgba(217,166,46,.7),0_0_40px_-10px_rgba(217,166,46,.55)]"
      >
        {/* Blue + red swooshes across the top, like the logo */}
        <div aria-hidden className="absolute -right-[20%] -top-[30%] h-[70%] w-[120%] rotate-[-14deg] bg-gradient-to-r from-transparent via-blue/80 to-blue/30 blur-[2px]" />
        <div aria-hidden className="absolute -right-[20%] top-[8%] h-[16%] w-[110%] rotate-[-14deg] bg-gradient-to-r from-transparent via-red to-red/40" />
        <div aria-hidden className="absolute -right-[20%] top-[24%] h-[3%] w-[110%] rotate-[-14deg] bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_100%,rgba(0,119,217,.25),transparent_70%)]" />
        {/* Gold circuit lines */}
        <svg aria-hidden viewBox="0 0 200 120" className="absolute bottom-3 right-3 h-[46%] opacity-60">
          {[30, 50, 70, 90].map((y, i) => (
            <g key={y} stroke="#d9a62e" fill="none" strokeWidth="1.2">
              <path d={`M20 ${y} H${100 + i * 10} L${118 + i * 10} ${y - 12} H196`} />
              <circle cx="20" cy={y} r="2.5" fill="#d9a62e" />
            </g>
          ))}
        </svg>
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: glare }} />

        <div className="relative flex h-full flex-col justify-between p-[5.5%]" style={{ transform: "translateZ(40px)" }}>
          <div className="flex items-start justify-between gap-3">
            <Image src="/brand/pb-logo-horizontal.webp" alt="" width={1007} height={200} className="h-auto w-[46%] drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" />
            {sample && <span className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/70 ring-1 ring-white/20">Sample</span>}
          </div>
          <div>
            <p className="display bg-gradient-to-b from-[#fff3c4] via-gold to-[#8a6414] bg-clip-text text-[11cqw] leading-none text-transparent">PB REWARDS</p>
            <div className="mt-[4%] flex items-center gap-3">
              <span className="grid aspect-square w-[15%] place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] via-gold to-[#7a560f] text-[#3a2604] shadow-[0_0_18px_rgba(217,166,46,.6)] ring-2 ring-[#fff1c1]/60">
                <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor" aria-hidden>
                  <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                </svg>
              </span>
              <div className="leading-none">
                <p className="display text-[8.5cqw]">{shown}</p>
                <p className="mt-[1cqw] font-mono text-[2.4cqw] uppercase tracking-[0.3em] text-gold">Points</p>
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 font-mono text-[2.6cqw] uppercase tracking-[0.16em] text-white/70">
            <span className="truncate">{name ?? "PB Phone Passport"}</span>
            <span className="shrink-0 text-right">
              {expires && <span className="mb-[1cqw] block text-[2.1cqw] tracking-[0.2em] text-gold/90">Valid thru {expires}</span>}
              {number ?? "PBP-000000"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
