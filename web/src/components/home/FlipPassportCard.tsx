"use client";

import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { PassportCard } from "./PassportCard";
import { PassportCardBack } from "./PassportCardBack";
import { Icon } from "../ui/Icon";

/**
 * 3D PB Rewards card: tap / click (or Enter / Space) to flip it over to the barcode side,
 * drag sideways to spin it, and it tilts towards the mouse on desktop.
 */
export function FlipPassportCard({ name, number, points, phone, since, className = "" }: { name?: string; number?: string; points?: number; phone?: string; since?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rot = useMotionValue(0); // rotateY in degrees; 0 = front, 180 = back
  const [back, setBack] = useState(false);
  const dragged = useRef(false);
  const start = useRef(0);
  const tiltX = useMotionValue(0);
  const rx = useSpring(tiltX, { stiffness: 150, damping: 18 });
  // Light sweep that follows the spin.
  const sheen = useTransform(rot, (r) => `linear-gradient(${105 + (r % 360) / 4}deg, transparent 30%, rgba(255,255,255,${0.1 + 0.12 * Math.abs(Math.sin((r * Math.PI) / 180))}) 50%, transparent 70%)`);

  const settle = (target: number) => {
    animate(rot, target, { type: "spring", stiffness: 120, damping: 16 });
    setBack(Math.round(target / 180) % 2 !== 0);
  };
  const flip = () => settle((Math.round(rot.get() / 180) + 1) * 180);

  return (
    <div className={`mx-auto w-full max-w-[460px] ${className}`}>
      <div
        ref={ref}
        style={{ perspective: 1400 }}
        className="touch-pan-y select-none"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = ref.current!.getBoundingClientRect();
          tiltX.set(((e.clientY - r.top) / r.height - 0.5) * -16);
        }}
        onPointerLeave={() => tiltX.set(0)}
      >
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={back ? "PB Rewards card, back — tap to see the front" : "PB Rewards card — tap to flip"}
          aria-pressed={back}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ rotateY: rot, rotateX: rx, transformStyle: "preserve-3d" }}
          className="relative grid cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-black [border-radius:1.4rem]"
          onPanStart={() => {
            dragged.current = true;
            start.current = rot.get();
          }}
          onPan={(_, info) => rot.set(start.current + info.offset.x * 0.6)}
          onPanEnd={(_, info) => {
            // A quick flick flips; otherwise snap to the nearest face.
            const r = rot.get() + info.velocity.x * 0.15;
            settle(Math.round(r / 180) * 180);
            setTimeout(() => (dragged.current = false), 0);
          }}
          onTap={() => !dragged.current && flip()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              flip();
            }
          }}
        >
          <div className="[grid-area:1/1]" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <PassportCard still name={name} number={number} points={points} />
          </div>
          <div className="[grid-area:1/1]" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <PassportCardBack number={number} phone={phone} since={since} />
          </div>
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.4rem] mix-blend-overlay [grid-area:1/1]" style={{ background: sheen, transform: "translateZ(1px)" }} />
        </motion.div>
      </div>
      <button type="button" onClick={flip} className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-gold/40 px-4 py-2 text-xs text-gold transition hover:bg-gold/10">
        <Icon name="rotate" className="h-3.5 w-3.5" /> {back ? "Show front" : "Flip card"}
      </button>
    </div>
  );
}
