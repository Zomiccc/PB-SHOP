"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LiveBroadcast } from "@/lib/broadcasts";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

/**
 * Broadcasts on the homepage, centred directly beneath Shop Phones (v6 §1): text with the admin's pictures and
 * videos. Several live broadcasts become a swipeable carousel with dots and arrows. Also used as the admin preview.
 */
export function BroadcastShowcase({ broadcasts, className = "", preview = false }: { broadcasts: LiveBroadcast[]; className?: string; preview?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = broadcasts.length;

  // Keep the dots in step with swiping.
  useEffect(() => {
    const el = track.current;
    if (!el || count < 2) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  if (!count) return null;
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };

  return (
    <section aria-label="Announcements" aria-roledescription={count > 1 ? "carousel" : undefined} className={cn("mx-auto w-full min-w-0 max-w-2xl", className)}>
      <div className="relative min-w-0">
        <div ref={track} className="flex snap-x snap-mandatory overflow-x-auto rounded-[1.4rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {broadcasts.map((b, i) => (
            <article key={b.id} aria-roledescription={count > 1 ? "slide" : undefined} aria-label={count > 1 ? `${i + 1} of ${count}` : undefined} className="w-full shrink-0 snap-center">
              <Card b={b} preview={preview} />
            </article>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous announcement" className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/15 hover:bg-black/80 sm:grid">
              <Icon name="arrow-left" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next announcement" className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/15 hover:bg-black/80 sm:grid">
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {broadcasts.map((b, i) => (
            <button key={b.id} type="button" onClick={() => go(i)} aria-label={`Show announcement ${i + 1}`} aria-current={i === index} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-gold" : "w-1.5 bg-white/30 hover:bg-white/60")} />
          ))}
        </div>
      )}
    </section>
  );
}

function Card({ b, preview }: { b: LiveBroadcast; preview: boolean }) {
  const [shown, setShown] = useState(0);
  const media = b.media;
  const m = media[shown];
  const external = b.ctaHref?.startsWith("http");
  const cta = b.ctaHref ? (
    external ? (
      <a href={b.ctaHref} target="_blank" rel="noreferrer" className="btn btn-gold !py-2.5 !text-sm">{b.ctaLabel || "Learn more"} <Icon name="arrow-right" className="h-4 w-4" /></a>
    ) : (
      <Link href={b.ctaHref} onClick={preview ? (e) => e.preventDefault() : undefined} className="btn btn-gold !py-2.5 !text-sm">{b.ctaLabel || "Learn more"} <Icon name="arrow-right" className="h-4 w-4" /></Link>
    )
  ) : null;

  return (
    <div className="overflow-hidden rounded-[1.4rem] bg-card text-center ring-1 ring-gold/30">
      {m && (
        <div className="relative bg-black">
          {m.type === "VIDEO" ? (
            <video key={m.url} src={m.url} controls playsInline preload="metadata" className="mx-auto max-h-[60svh] w-full bg-black object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- admin uploads of any size; served from our own media route
            <img src={m.url} alt="" className="mx-auto max-h-[60svh] w-full object-contain" loading="lazy" />
          )}
          {media.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {media.map((x, i) => (
                <button key={x.url} type="button" onClick={() => setShown(i)} aria-label={`${x.type === "VIDEO" ? "Video" : "Picture"} ${i + 1}`} className={cn("h-2 w-2 rounded-full ring-1 ring-black/40", i === shown ? "bg-gold" : "bg-white/60")} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="px-5 py-4">
        <p className="flex items-center justify-center gap-2 text-[0.95rem] leading-snug text-white">
          <Icon name="megaphone" className="h-4 w-4 shrink-0 text-gold" />
          <span>{b.message}</span>
        </p>
        {cta && <div className="mt-3 flex justify-center">{cta}</div>}
      </div>
    </div>
  );
}
