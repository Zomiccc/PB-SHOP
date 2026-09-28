import { db } from "./db";

/** The broadcast to show right now: published, and inside its start/end dates (master brief §9). */
export async function activeBroadcast(now = new Date()) {
  return db.broadcast.findFirst({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: [{ startsAt: "desc" }, { updatedAt: "desc" }],
    select: { id: true, message: true, ctaLabel: true, ctaHref: true },
  });
}

/** Only on-site paths or https links may be used as a broadcast button. */
export function safeHref(href: string | null | undefined) {
  if (!href) return null;
  const h = href.trim();
  if (/^\/(?!\/)/.test(h) || /^#[\w-]+$/.test(h)) return h;
  try {
    const u = new URL(h);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** The shop runs on Pakistan time (UTC+5, no DST): admin date inputs are read and shown in PKT. */
export function parsePkt(local: string) {
  const d = new Date(`${local.length === 16 ? `${local}:00` : local}+05:00`);
  return isNaN(d.getTime()) ? null : d;
}
export function toPktInput(d: Date | null | undefined) {
  return d ? new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16) : "";
}
