"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * Front of the PB Rewards card, following the client's reference artwork (change request V2 §3): stacked
 * PB Mobiles logo, dark navy field, gold border and circuit lines, a blue + red swoosh with gold edges, and
 * "PB REWARDS" with the points pill. (No "tap to reveal" perk and no visit counter — removed by request.)
 *
 * Two rendering states (V2 §4):
 *  - `digital` (default): the portal card — shows the customer's live points balance (or a labelled sample).
 *  - `print`: the physical / downloaded card — never shows points, so it stays a clean reusable card.
 * `expires` is only passed to the digital card when the owner turns that on; the printed card never shows it.
 */
export function PassportCard({ name, number, points, expires, still = false, mode = "digital" }: { name?: string; number?: string; points?: number; expires?: string | null; still?: boolean; mode?: "digital" | "print" }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [12, -12]), { stiffness: 160, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 1], [-16, 16]), { stiffness: 160, damping: 16 });
  const glareX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [0, 1], ["0%", "100%"]);
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,.35), transparent 45%)`);
  const print = mode === "print";
  const sample = !print && points == null;
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
        aria-label={print ? "PB Rewards card" : sample ? "Sample PB Rewards card" : `PB Rewards card — ${shown} points`}
        role="img"
        className="print-exact relative aspect-[1.586] overflow-hidden rounded-[4.5cqw] bg-[#071027] text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.9),0_0_40px_-12px_rgba(217,166,46,.55)]"
      >
        <CardFrontArt />
        {!still && <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: glare }} />}

        <div className="absolute inset-0" style={{ transform: still ? undefined : "translateZ(40px)" }}>
          <Image src="/brand/pb-logo-2026.webp" alt="" width={976} height={683} className="absolute left-[6%] top-[6%] h-auto w-[33%] drop-shadow-[0_3px_8px_rgba(0,0,0,.7)]" />
          {sample && <span className="absolute right-[6%] top-[7%] rounded-full bg-black/55 px-[2cqw] py-[0.6cqw] font-mono text-[2.2cqw] uppercase tracking-[0.2em] text-white/75 ring-1 ring-white/20">Sample</span>}

          {/* PB REWARDS with the crown and gold rules either side */}
          <div className={`absolute left-[6%] w-[44%] ${print ? "top-[66%]" : "top-[57.5%]"}`}>
            <div className="flex items-center gap-[1.5cqw]">
              <span className="h-[0.35cqw] flex-1 bg-gradient-to-r from-transparent to-gold" />
              <svg viewBox="0 0 24 16" className="w-[3.4cqw] text-gold drop-shadow-[0_0_4px_rgba(217,166,46,.8)]" fill="currentColor" aria-hidden>
                <path d="M2 14h20l-1.6-10-5.2 4.6L12 1 8.8 8.6 3.6 4 2 14Z" />
              </svg>
              <span className="h-[0.35cqw] flex-1 bg-gradient-to-l from-transparent to-gold" />
            </div>
            <p className="display mt-[0.8cqw] whitespace-nowrap text-center text-[8.4cqw] leading-none tracking-[-0.01em] drop-shadow-[0_3px_4px_rgba(0,0,0,.6)]">
              <span className="bg-gradient-to-b from-[#fff3c4] via-[#e5b43e] to-[#8a6414] bg-clip-text text-transparent">PB </span>
              <span className="bg-gradient-to-b from-white via-[#d9dde3] to-[#8b939e] bg-clip-text text-transparent">REWARDS</span>
            </p>
          </div>

          {/* Live points balance — digital card only (never printed) */}
          {!print && (
            <div className="absolute left-[6%] top-[76%] flex w-[44%] items-center gap-[2.4cqw] rounded-full border-[0.4cqw] border-gold/90 bg-[#050b1c]/85 py-[0.9cqw] pl-[0.9cqw] pr-[3cqw] shadow-[0_0_14px_rgba(217,166,46,.45),inset_0_0_10px_rgba(217,166,46,.2)]">
              <span className="grid aspect-square w-[8cqw] shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] via-gold to-[#7a560f] text-[#5a3d06] shadow-[0_0_12px_rgba(217,166,46,.6)] ring-[0.4cqw] ring-[#fff1c1]/60">
                <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor" aria-hidden>
                  <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 text-center leading-none">
                <span className="display block truncate bg-gradient-to-b from-[#fff3c4] via-[#e5b43e] to-[#9a7016] bg-clip-text text-[6.4cqw] text-transparent">{shown}</span>
                <span className="mt-[0.6cqw] block font-semibold uppercase tracking-[0.18em] text-[#dfe3e8] text-[2.3cqw]">Points</span>
              </span>
            </div>
          )}

          {/* Card holder + unique ID */}
          <div className="absolute bottom-[8%] right-[6%] max-w-[42%] text-right font-mono uppercase leading-tight">
            {expires && !print && <p className="mb-[1cqw] text-[2.1cqw] tracking-[0.2em] text-gold/90">Valid thru {expires}</p>}
            <p className="truncate text-[2.6cqw] tracking-[0.12em] text-white/85">{name ?? "PB Rewards member"}</p>
            <p className="mt-[0.8cqw] text-[3.1cqw] font-bold tracking-[0.14em] text-gold">{number ?? "PBM-0000"}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Swoosh geometry (card units, 1586 × 1000).
const BLUE_TOP = "M0 545 C470 520 960 390 1260 0";
const BLUE_LOW = "M1345 0 C1040 430 520 585 0 600";
const BLUE = `${BLUE_TOP} H1345 C1040 430 520 585 0 600 Z`;
const RED_LOW = "M560 585 C930 560 1270 450 1586 340";
const RED = "M560 585 C900 520 1160 330 1345 0 H1586 V340 C1270 450 930 560 560 585 Z";

/** Vector artwork for the card front (scales cleanly for print). viewBox matches the card's 1.586 ratio. */
function CardFrontArt() {
  // Unique ids: the same card can appear twice on a page (screen + print), and one copy may be hidden.
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden viewBox="0 0 1586 1000" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id={`${id}-bg`} cx="35%" cy="30%" r="90%">
          <stop offset="0" stopColor="#0f2a63" />
          <stop offset="0.55" stopColor="#081638" />
          <stop offset="1" stopColor="#040a1c" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0b0" />
          <stop offset="0.3" stopColor="#d9a62e" />
          <stop offset="0.55" stopColor="#fbe08c" />
          <stop offset="0.8" stopColor="#a8771a" />
          <stop offset="1" stopColor="#f3cf6c" />
        </linearGradient>
        <linearGradient id={`${id}-red`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6d070b" />
          <stop offset="0.45" stopColor="#d3141c" />
          <stop offset="0.75" stopColor="#ff3a3f" />
          <stop offset="1" stopColor="#9c0c12" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0a2f8a" stopOpacity="0.2" />
          <stop offset="0.35" stopColor="#1463e6" />
          <stop offset="0.7" stopColor="#4aa3ff" />
          <stop offset="1" stopColor="#0c4fd0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="1586" height="1000" fill={`url(#${id}-bg)`} />
      {/* Brushed texture */}
      <g opacity="0.06" stroke="#fff">
        {Array.from({ length: 40 }, (_, i) => (
          <path key={i} d={`M0 ${i * 25 + 6} H1586`} strokeWidth="1" />
        ))}
      </g>

      {/* Gold circuit lines */}
      <g fill="none" stroke="#d9a62e" strokeWidth="3" opacity="0.75">
        <path d="M820 40 V130 L870 180 H960 L1010 230 V300" />
        <path d="M880 40 V110 L920 150 H1010 L1060 200 V250" />
        <path d="M1060 40 V90 L1110 140 H1180" />
        <path d="M1380 470 H1460 L1510 420 V380" />
        <path d="M1330 520 H1470 L1530 560 V600" />
        <path d="M40 960 H150 L200 910" />
        
      </g>
      <g fill="#0b1633" stroke="#d9a62e" strokeWidth="3" opacity="0.85">
        {[[1010, 300], [1060, 250], [1180, 140], [1510, 380], [1530, 600], [200, 910]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="9" />
        ))}
      </g>

      {/* Swoosh: a blue ribbon rising to the top edge, with the red sweep below / right of it, gold edges */}
      <path d={RED} fill={`url(#${id}-red)`} />
      <path d="M760 560 C1020 470 1220 300 1360 70 L1400 0 H1470 C1330 250 1110 450 760 560 Z" fill="#ffffff" opacity="0.09" />
      <path d={BLUE} fill={`url(#${id}-blue)`} />
      <path d={BLUE_TOP} fill="none" stroke="#9fd0ff" strokeWidth="3" opacity="0.8" />
      <path d={BLUE_LOW} fill="none" stroke={`url(#${id}-gold)`} strokeWidth="9" filter={`url(#${id}-glow)`} opacity="0.7" />
      <path d={BLUE_LOW} fill="none" stroke={`url(#${id}-gold)`} strokeWidth="5" />
      <path d={RED_LOW} fill="none" stroke={`url(#${id}-gold)`} strokeWidth="5" />

      {/* Gold border */}
      <rect x="16" y="16" width="1554" height="968" rx="58" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="10" />
      <rect x="34" y="34" width="1518" height="932" rx="44" fill="none" stroke="#d9a62e" strokeOpacity="0.35" strokeWidth="2" />
    </svg>
  );
}
