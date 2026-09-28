"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Icon } from "../ui/Icon";

type Broadcast = { id: string; message: string; ctaLabel: string | null; ctaHref: string | null };

const KEY = "pb-broadcast-dismissed";
const listeners = new Set<() => void>();
const readDismissed = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/** Premium dark announcement bar at the very top of the homepage (master brief §9). */
export function BroadcastBar({ broadcast }: { broadcast: Broadcast | null }) {
  const pathname = usePathname();
  const dismissed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readDismissed,
    () => null,
  );
  if (!broadcast || pathname !== "/" || dismissed === broadcast.id) return null;

  const external = broadcast.ctaHref?.startsWith("http");
  return (
    <div role="region" aria-label="Announcement" className="relative z-[51] overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,119,217,.28),transparent_35%,transparent_65%,rgba(215,25,32,.28))]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="container-pb relative flex items-center gap-3 py-2.5 text-sm">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40">
          <Icon name="megaphone" className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 leading-snug">
          {broadcast.message}
          {broadcast.ctaHref && (
            <>
              {" "}
              {external ? (
                <a href={broadcast.ctaHref} target="_blank" rel="noreferrer" className="whitespace-nowrap font-semibold text-gold underline-offset-4 hover:underline">
                  {broadcast.ctaLabel || "Learn more"} →
                </a>
              ) : (
                <Link href={broadcast.ctaHref} className="whitespace-nowrap font-semibold text-gold underline-offset-4 hover:underline">
                  {broadcast.ctaLabel || "Learn more"} →
                </Link>
              )}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(KEY, broadcast.id);
            } catch {}
            listeners.forEach((l) => l());
          }}
          aria-label="Dismiss announcement"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
