import { db } from "./db";

const live = (now: Date) => ({
  active: true,
  AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
});

/** The newest broadcast showing right now: published, and inside its start/end dates (master brief §9). */
export async function activeBroadcast(now = new Date()) {
  return db.broadcast.findFirst({ where: live(now), orderBy: [{ startsAt: "desc" }, { updatedAt: "desc" }], select: { id: true, message: true, ctaLabel: true, ctaHref: true } });
}

export type BroadcastMedia = { url: string; type: "IMAGE" | "VIDEO" };
export type LiveBroadcast = { id: string; message: string; ctaLabel: string | null; ctaHref: string | null; media: BroadcastMedia[] };

/** Every broadcast showing right now, newest first, with its pictures / videos (v6 §1 — shown beneath Shop Phones). */
export async function activeBroadcasts(now = new Date()): Promise<LiveBroadcast[]> {
  const rows = await db.broadcast.findMany({ where: live(now), orderBy: [{ startsAt: "desc" }, { updatedAt: "desc" }], take: 10, select: { id: true, message: true, ctaLabel: true, ctaHref: true, media: true } });
  return rows.map((b) => ({ ...b, ctaHref: safeHref(b.ctaHref), media: parseMedia(b.media) }));
}

/** Broadcast media JSON → only our own uploaded files (database media, local uploads or the storage bucket). */
export function parseMedia(json: string | null | undefined): BroadcastMedia[] {
  let list: unknown;
  try {
    list = JSON.parse(json || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const bucket = (process.env.STORAGE_PUBLIC_URL ?? "").replace(/\/$/, "");
  return list
    .filter((m): m is BroadcastMedia => !!m && typeof m.url === "string" && (m.type === "IMAGE" || m.type === "VIDEO"))
    .filter((m) => /^\/api\/media\/[\w-]+$/.test(m.url) || /^\/uploads\/[\w/.-]+$/.test(m.url) || (!!bucket && m.url.startsWith(`${bucket}/`)))
    .slice(0, 8)
    .map((m) => ({ url: m.url, type: m.type }));
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
