"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LiveBroadcast } from "@/lib/broadcasts";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

export type Announcement = Pick<LiveBroadcast, "id" | "title" | "message" | "ctaLabel" | "ctaHref"> & { image: string | null };

const DISMISSED = "pb-ann-dismissed";
const SEEN = "pb-ann-seen";
const read = (k: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "[]");
  } catch {
    return [];
  }
};
const write = (k: string, ids: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(ids.slice(-50)));
    window.dispatchEvent(new Event("pb-ann"));
  } catch {}
};
const subscribe = (cb: () => void) => {
  window.addEventListener("pb-ann", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("pb-ann", cb);
    window.removeEventListener("storage", cb);
  };
};
/** A localStorage id list as a stable string (so useSyncExternalStore compares by value). */
const useIds = (k: string) => JSON.parse(useSyncExternalStore(subscribe, () => JSON.stringify(read(k)), () => "[]")) as string[];

function Go({ a, className, onClick }: { a: Announcement; className?: string; onClick?: () => void }) {
  if (!a.ctaHref) return null;
  const label = a.ctaLabel || "View";
  return a.ctaHref.startsWith("http") ? (
    <a href={a.ctaHref} target="_blank" rel="noreferrer" onClick={onClick} className={className}>{label} →</a>
  ) : (
    <Link href={a.ctaHref} onClick={onClick} className={className}>{label} →</Link>
  );
}

/**
 * Top banner (Nov 2026): the newest live announcement across the top of every page. Customers can close it;
 * a closed one stays closed on this device. Everything live is also in the bell.
 */
export function AnnouncementBanner({ items }: { items: Announcement[] }) {
  const dismissed = useIds(DISMISSED);
  const a = items.find((x) => !dismissed.includes(x.id));
  if (!a) return null;
  return (
    <div role="region" aria-label="Announcement" className="relative z-[52] bg-gold text-[#120d02]">
      <div className="container-pb flex items-center gap-3 py-2 text-sm">
        <Icon name="megaphone" className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 truncate sm:whitespace-normal">
          {a.title && <b className="mr-1.5">{a.title}</b>}
          <span>{a.message}</span>
        </p>
        <Go a={a} className="shrink-0 rounded-full bg-[#120d02] px-3 py-1 text-xs font-semibold text-gold" />
        <button type="button" onClick={() => write(DISMISSED, [...dismissed, a.id])} aria-label="Close announcement" className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-black/10">
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Notification bell in the header: every live announcement, with a dot for ones not opened yet. */
export function AnnouncementBell({ items, dark }: { items: Announcement[]; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const seen = useIds(SEEN);
  const unseen = items.filter((a) => !seen.includes(a.id)).length;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  if (!items.length) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (unseen) write(SEEN, [...seen, ...items.map((a) => a.id)]);
        }}
        aria-expanded={open}
        aria-label={`Announcements${unseen ? `, ${unseen} new` : ""}`}
        className={cn("relative grid h-10 w-10 place-items-center rounded-full", dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/5")}
      >
        <Icon name="bell" className="h-[19px] w-[19px]" />
        {unseen > 0 && <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[0.65rem] font-bold text-white">{unseen}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Announcements" className="absolute right-0 z-[60] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-[#0b0e14] text-white shadow-2xl ring-1 ring-gold/30">
          <p className="border-b border-white/10 px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold">Offers & news</p>
          <ul className="max-h-[70vh] divide-y divide-white/8 overflow-y-auto">
            {items.map((a) => (
              <li key={a.id} className="flex gap-3 p-4">
                {a.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded announcement picture
                  <img src={a.image} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-black object-cover" />
                )}
                <div className="min-w-0 flex-1 text-sm">
                  {a.title && <p className="font-semibold text-gold">{a.title}</p>}
                  <p className="text-white/80">{a.message}</p>
                  <Go a={a} onClick={() => setOpen(false)} className="mt-1.5 inline-block text-xs font-semibold text-gold hover:underline" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
