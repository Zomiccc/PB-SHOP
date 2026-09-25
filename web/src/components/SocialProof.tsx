"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./ui/Icon";

type Item = { label: string; product: string; ago: string };
type Feed = { enabled: boolean; intervalSeconds: number; displaySeconds: number; items: Item[] };

/**
 * "Ali K. from Lahore purchased iPhone 13" pop-up (§15).
 * Only real, paid orders from /api/social-proof are shown — if there are none, nothing appears.
 * Frequency, duration and on/off are configured by admin (Setting "socialProof").
 */
export function SocialProof() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [current, setCurrent] = useState<Item | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("pb-sp-off") === "1";
    } catch {}
    if (dismissed) return;
    fetch("/api/social-proof")
      .then((r) => r.json())
      .then((d: Feed) => d.enabled && d.items.length && setFeed(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!feed) return;
    let i = 0;
    let hide: ReturnType<typeof setTimeout>;
    const show = () => {
      setCurrent(feed.items[i % feed.items.length]);
      i++;
      hide = setTimeout(() => setCurrent(null), feed.displaySeconds * 1000);
    };
    const first = setTimeout(show, 8000);
    const loop = setInterval(show, (feed.intervalSeconds + feed.displaySeconds) * 1000);
    return () => {
      clearTimeout(first);
      clearTimeout(hide);
      clearInterval(loop);
    };
  }, [feed]);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[55] sm:bottom-6 sm:left-6" aria-live="polite">
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto flex max-w-[min(20rem,calc(100vw-6.5rem))] items-center gap-3 rounded-2xl bg-white/95 p-3 pr-4 shadow-[var(--shadow-lift)] ring-1 ring-ink/5 backdrop-blur"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-950 text-gold">
              <Icon name="bag" className="h-5 w-5" />
            </span>
            <div className="min-w-0 text-sm leading-snug">
              <p className="truncate">
                <b className="font-semibold">{current.label}</b> purchased
              </p>
              <p className="truncate font-semibold text-blue">{current.product}</p>
              <p className="text-[0.7rem] text-muted">{current.ago} · verified order</p>
            </div>
            <button
              onClick={() => {
                setCurrent(null);
                setFeed(null);
                try {
                  sessionStorage.setItem("pb-sp-off", "1");
                } catch {}
              }}
              aria-label="Hide purchase notifications"
              className="self-start text-muted hover:text-ink"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
