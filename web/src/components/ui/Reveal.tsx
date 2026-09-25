"use client";

import { motion, type HTMLMotionProps } from "motion/react";

const ease = [0.2, 0.8, 0.2, 1] as const;

/**
 * Subtle entrance animation (brief §11: subtle hover/scroll/entrance animations).
 * `immediate` animates on mount — use it for above-the-fold content so it never waits on an observer.
 */
export function Reveal({ delay = 0, y = 28, immediate = false, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number; immediate?: boolean }) {
  const target = { opacity: 1, y: 0 };
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      {...(immediate ? { animate: target } : { whileInView: target, viewport: { once: true, margin: "-60px" } })}
      transition={{ duration: 0.8, ease, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Headline that rises word by word. The in-view observer sits on the wrapper: each word starts fully
 * clipped by its overflow-hidden mask, so observing the words themselves would never report an intersection.
 */
export function SplitHeadline({ text, className, delay = 0, immediate = false }: { text: string; className?: string; delay?: number; immediate?: boolean }) {
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true } })}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "110%" }, show: { y: 0 } }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.06 }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
