/**
 * Website editor values (client request): what the owner can put in an editable spot. Pure — shared by the
 * browser editor and the server API, which validates everything before saving.
 *  - TEXT: a string (line breaks kept; "" hides the text)
 *  - MEDIA: a picture, an uploaded video or a YouTube video
 *  - ZONE: a list of extra sections the owner adds (picture, video, text, or picture + text + button)
 */

export type MediaValue = { kind: "IMAGE" | "VIDEO" | "YOUTUBE"; url: string; alt?: string };
export type BlockType = "image" | "video" | "text" | "banner";
export type Block = { id: string; type: BlockType; media?: MediaValue; title?: string; body?: string; buttonText?: string; buttonHref?: string };
export type ContentKind = "TEXT" | "MEDIA" | "ZONE";
export type ContentValue = string | MediaValue | Block[];

/** A draft that puts a spot back to its built-in default. */
export const RESET = { $reset: true } as const;
export const isReset = (v: unknown): v is typeof RESET => !!v && typeof v === "object" && (v as { $reset?: unknown }).$reset === true;

export const KEY_RE = /^[a-z0-9][a-z0-9._-]{1,99}$/i;
const MAX_TEXT = 5000;

/** The 11-character id from a YouTube link (watch, youtu.be, shorts, embed) or a bare id. */
export function youtubeId(input: string) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return /^[\w-]{11}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(u.pathname);
      return m ? m[1] : null;
    }
  } catch {}
  return null;
}

/** Pictures / videos must be our own files (uploads or site images) — the site's security policy blocks others. */
const ownPath = (url: string) => /^\/(?!\/)[\w\-./%]+(\?[\w=&%-]*)?$/.test(url) && !url.includes("..");

/** Button links: a page on this site, or an https / WhatsApp / phone / email link. */
export function safeHref(href: string) {
  const h = href.trim();
  if (ownPath(h) || /^\/(#[\w-]*)?$/.test(h) || /^#[\w-]+$/.test(h)) return h;
  if (/^(https:\/\/|mailto:|tel:)[^\s<>"']+$/i.test(h)) return h;
  return null;
}

export function validText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\r\n?/g, "\n");
  return t.length <= MAX_TEXT ? t : null;
}

export function validMedia(v: unknown): MediaValue | null {
  if (!v || typeof v !== "object") return null;
  const m = v as Partial<MediaValue>;
  const alt = typeof m.alt === "string" ? m.alt.slice(0, 300) : undefined;
  if (m.kind === "YOUTUBE") {
    const id = typeof m.url === "string" ? youtubeId(m.url) : null;
    return id ? { kind: "YOUTUBE", url: id, alt } : null;
  }
  // Own files, or https (uploads land on object storage when STORAGE_BUCKET is set).
  if ((m.kind === "IMAGE" || m.kind === "VIDEO") && typeof m.url === "string" && (ownPath(m.url) || /^https:\/\/[^\s<>"']+$/i.test(m.url))) return { kind: m.kind, url: m.url, alt };
  return null;
}

export function validBlocks(v: unknown): Block[] | null {
  if (!Array.isArray(v) || v.length > 30) return null;
  const out: Block[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return null;
    const b = raw as Partial<Block>;
    if (!["image", "video", "text", "banner"].includes(b.type as string)) return null;
    const id = typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : null;
    if (!id) return null;
    const media = b.media === undefined ? undefined : validMedia(b.media);
    if (b.media !== undefined && !media) return null;
    if ((b.type === "image" || b.type === "video") && !media) return null;
    const title = b.title === undefined ? undefined : validText(b.title);
    const body = b.body === undefined ? undefined : validText(b.body);
    const buttonText = b.buttonText === undefined ? undefined : validText(b.buttonText);
    const buttonHref = b.buttonHref ? safeHref(b.buttonHref) : undefined;
    if (title === null || body === null || buttonText === null || buttonHref === null) return null;
    out.push({ id, type: b.type as BlockType, media: media ?? undefined, title, body, buttonText, buttonHref });
  }
  return out;
}

/** Validates a value for its kind; null when it isn't acceptable. */
export function validValue(kind: ContentKind, v: unknown): ContentValue | null {
  if (kind === "TEXT") return validText(v);
  if (kind === "MEDIA") return validMedia(v);
  if (kind === "ZONE") return validBlocks(v);
  return null;
}
