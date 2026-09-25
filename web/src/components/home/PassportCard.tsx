"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/** Tilting, light-catching PB Phone Passport card (loyalty concept, §7). */
export function PassportCard({ name = "Your phone, looked after", number = "PBP-000000", points }: { name?: string; number?: string; points?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [14, -14]), { stiffness: 160, damping: 16 });
  const ry = useSpring(useTransform(mx, [0, 1], [-18, 18]), { stiffness: 160, damping: 16 });
  const glareX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [0, 1], ["0%", "100%"]);
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,.55), transparent 45%)`);

  return (
    <div
      ref={ref}
      style={{ perspective: 1100 }}
      className="mx-auto w-full max-w-[440px] touch-pan-y"
      onPointerMove={(e) => {
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
        initial={{ rotateZ: -8, y: 40, opacity: 0 }}
        whileInView={{ rotateZ: -4, y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative aspect-[1.58] overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-navy-800 via-navy-950 to-[#02080f] p-6 text-white shadow-[0_40px_80px_-30px_rgba(7,26,43,.8)] ring-1 ring-gold/50"
      >
        <div aria-hidden className="absolute -left-10 top-1/2 h-40 w-40 rounded-full bg-blue/40 blur-3xl" />
        <div aria-hidden className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-red/35 blur-3xl" />
        <svg aria-hidden viewBox="0 0 200 120" className="absolute right-4 top-1/2 h-24 -translate-y-1/2 opacity-40">
          {[20, 40, 60, 80].map((y, i) => (
            <g key={y} stroke="#d9a62e" fill="none" strokeWidth="1.5">
              <path d={`M40 ${y} H${110 + i * 8} L${130 + i * 8} ${y - 10} H190`} />
              <circle cx="190" cy={y - 10} r="3" />
            </g>
          ))}
        </svg>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ background: glare }}
        />
        <div className="relative flex h-full flex-col justify-between" style={{ transform: "translateZ(40px)" }}>
          <div className="flex items-start justify-between">
            <span className="display text-4xl italic">
              <span className="text-blue">P</span>
              <span className="text-red">B</span>
              <sup className="text-gold">•</sup>
            </span>
            <span className="text-right font-mono text-[0.62rem] uppercase leading-tight tracking-[0.25em] text-gold">
              Phone
              <br />
              Passport
            </span>
          </div>
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-white/50">{name}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-white/80">
              {["Battery", "Screen", "Charging", "Storage", "Camera"].map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-gold" />
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between font-mono text-[0.65rem] tracking-[0.2em] text-white/55">
            <span>{number}</span>
            <span>{points != null ? `${points} PTS` : "PB MOBILES"}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
