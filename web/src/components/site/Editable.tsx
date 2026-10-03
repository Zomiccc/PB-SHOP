"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { uploadMedia } from "@/lib/upload-client";
import { RESET, isReset, safeHref, youtubeId, type Block, type BlockType, type ContentKind, type ContentValue, type MediaValue } from "@/lib/site-content-types";
import { Icon } from "../ui/Icon";
import { SplitHeadline } from "../ui/Reveal";

/**
 * Website editor (client request): the owner edits text, pictures, videos and adds sections right on the live
 * site, then presses Publish. Visitors only ever see published content. Edit mode is switched on from
 * Admin → Edit website (sets the pb_edit cookie); the drafts API only answers the signed-in owner.
 */

type Ctx = {
  published: Record<string, ContentValue>;
  drafts: Record<string, unknown>;
  editing: boolean;
  save: (key: string, kind: ContentKind, value: ContentValue | typeof RESET) => Promise<void>;
};
const SiteCtx = createContext<Ctx>({ published: {}, drafts: {}, editing: false, save: async () => {} });

/** The value a spot shows: the draft while editing, otherwise what's published (undefined = built-in default). */
function useValue(key: string): { value: unknown; edited: boolean; editing: boolean; save: Ctx["save"] } {
  const c = useContext(SiteCtx);
  const hasDraft = c.editing && key in c.drafts;
  const raw = hasDraft ? c.drafts[key] : c.published[key];
  return { value: isReset(raw) ? undefined : raw, edited: raw !== undefined && !isReset(raw), editing: c.editing, save: c.save };
}

export function SiteContentProvider({ published, children }: { published: Record<string, ContentValue>; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!document.cookie.split("; ").includes("pb_edit=1")) return;
    fetch("/api/admin/site-content", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          document.cookie = "pb_edit=; Max-Age=0; path=/";
          return;
        }
        const d = await r.json();
        setDrafts(d.drafts ?? {});
        setEditing(true);
      })
      .catch(() => {});
  }, []);

  const save = useCallback(async (key: string, kind: ContentKind, value: ContentValue | typeof RESET) => {
    setDrafts((d) => ({ ...d, [key]: value }));
    const res = await fetch("/api/admin/site-content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isReset(value) ? { key, kind, reset: true } : { key, kind, value }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      window.alert(d.error ?? "Couldn't save that change — please try again.");
    }
  }, []);

  const ctx = useMemo(() => ({ published, drafts, editing, save }), [published, drafts, editing, save]);
  return (
    <SiteCtx.Provider value={ctx}>
      {children}
      {editing && <EditBar count={Object.keys(drafts).length} onDiscarded={() => setDrafts({})} />}
    </SiteCtx.Provider>
  );
}

/** Text of a spot as a plain string (for headlines with animation, labels, placeholders…). */
export function useText(key: string, fallback: string) {
  const { value } = useValue(key);
  return typeof value === "string" ? value : fallback;
}

/** Whether the owner is editing the website right now. */
export function useEditing() {
  return useContext(SiteCtx).editing;
}

/**
 * Editable text. Visitors get plain text (exactly the built-in text until the owner changes it); in edit mode
 * it's outlined and editable in place — Enter or clicking away saves a draft, Esc cancels. Clearing it hides
 * the text on the site.
 */
export function T({ k, d, multiline = false }: { k: string; d: string; multiline?: boolean }) {
  const { value, editing, save } = useValue(k);
  const text = typeof value === "string" ? value : d;
  if (!editing) return text.includes("\n") ? <span className="whitespace-pre-line">{text}</span> : <>{text}</>;
  return (
    <span
      key={text}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      title="Click to edit · Enter to save · Esc to cancel"
      data-edit-key={k}
      className="cursor-text whitespace-pre-line rounded-sm outline-dashed outline-1 outline-offset-2 outline-gold/70 transition hover:bg-gold/10 hover:outline-2 focus:bg-gold/10 focus:outline-2 focus:outline-gold empty:inline-block empty:min-w-16 empty:before:text-white/40 empty:before:content-['(hidden)']"
      onClick={(e) => {
        // Inside links / buttons: edit instead of navigating.
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.textContent = text;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.innerText ?? "").replace(/\n+$/, "");
        if (next === text) return;
        void save(k, "TEXT", next === d ? RESET : next);
      }}
    >
      {text}
    </span>
  );
}

/** Renders a picture / uploaded video / YouTube video. */
export function MediaView({ media, className }: { media: MediaValue; className?: string }) {
  if (media.kind === "YOUTUBE")
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${media.url}?rel=0`}
        title={media.alt || "Video"}
        className={cn("aspect-video w-full", className)}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    );
  if (media.kind === "VIDEO") return <video src={media.url} className={className} autoPlay muted loop playsInline controls={false} aria-label={media.alt || undefined} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={media.alt ?? ""} className={className} loading="lazy" />;
}

/**
 * A picture / video spot. Shows `fallback` (the built-in artwork) until the owner replaces it; in edit mode a
 * "Replace" button opens the picture / video picker.
 */
export function EditableMedia({ k, fallback, className, mediaClassName, label = "picture or video" }: { k: string; fallback: React.ReactNode; className?: string; mediaClassName?: string; label?: string }) {
  const { value, edited, editing, save } = useValue(k);
  const [open, setOpen] = useState(false);
  const media = value as MediaValue | undefined;
  return (
    <div className={cn("relative", className)}>
      {media ? <MediaView media={media} className={mediaClassName} /> : fallback}
      {editing && (
        <div className="absolute inset-x-2 top-2 z-20 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-[#120d02] shadow-lg"
          >
            <Icon name="upload" className="h-3.5 w-3.5" /> Replace {label}
          </button>
          {edited && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void save(k, "MEDIA", RESET);
              }}
              className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20"
            >
              Use original
            </button>
          )}
        </div>
      )}
      {open && (
        <MediaPicker
          initial={media}
          onClose={() => setOpen(false)}
          onPick={(m) => {
            setOpen(false);
            void save(k, "MEDIA", m);
          }}
        />
      )}
    </div>
  );
}

/** A place where the owner can add their own sections: pictures, videos, text, or picture + text + button. */
export function Zone({ k, className }: { k: string; className?: string }) {
  const { value, editing, save } = useValue(k);
  const blocks = (Array.isArray(value) ? value : []) as Block[];
  const [editingBlock, setEditingBlock] = useState<{ index: number; block: Block } | null>(null);
  if (!blocks.length && !editing) return null;

  const commit = (next: Block[]) => void save(k, "ZONE", next.length ? next : RESET);
  const move = (i: number, by: number) => {
    const next = [...blocks];
    const [b] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + by)), 0, b);
    commit(next);
  };

  return (
    <div className={cn("container-pb space-y-10 py-8", className)}>
      {blocks.map((b, i) => (
        <div key={b.id} className={cn("relative", editing && "rounded-2xl outline-dashed outline-1 outline-offset-8 outline-gold/50")}>
          <BlockView block={b} />
          {editing && (
            <div className="absolute -top-4 right-2 z-20 flex gap-1 rounded-full bg-black/85 p-1 ring-1 ring-gold/50">
              <ToolBtn label="Edit section" onClick={() => setEditingBlock({ index: i, block: b })}>Edit</ToolBtn>
              <ToolBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</ToolBtn>
              <ToolBtn label="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>↓</ToolBtn>
              <ToolBtn label="Delete section" onClick={() => window.confirm("Delete this section?") && commit(blocks.filter((_, j) => j !== i))}>
                <Icon name="trash" className="h-3.5 w-3.5" />
              </ToolBtn>
            </div>
          )}
        </div>
      ))}
      {editing && (
        <button
          type="button"
          onClick={() => setEditingBlock({ index: blocks.length, block: { id: newId(), type: "image" } })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 py-5 text-sm font-semibold text-gold transition hover:bg-gold/10"
        >
          <Icon name="plus" className="h-4 w-4" /> Add a section here — picture, video or text
        </button>
      )}
      {editingBlock && (
        <BlockEditor
          initial={editingBlock.block}
          onClose={() => setEditingBlock(null)}
          onSave={(b) => {
            const next = [...blocks];
            next.splice(editingBlock.index, editingBlock.index < blocks.length ? 1 : 0, b);
            setEditingBlock(null);
            commit(next);
          }}
        />
      )}
    </div>
  );
}

const newId = () => Math.random().toString(36).slice(2, 10);

function ToolBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-semibold text-white transition hover:bg-gold hover:text-[#120d02] disabled:opacity-30">
      {children}
    </button>
  );
}

function BlockView({ block: b }: { block: Block }) {
  const button = b.buttonText && b.buttonHref && (
    <a href={b.buttonHref} className="btn btn-gold mt-5 w-fit" {...(/^https:/i.test(b.buttonHref) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {b.buttonText} <Icon name="arrow-right" className="h-4 w-4" />
    </a>
  );
  const text = (b.title || b.body) && (
    <div>
      {b.title && <h2 className="display text-3xl md:text-5xl">{b.title}</h2>}
      {b.body && <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-white/75">{b.body}</p>}
      {button}
    </div>
  );
  if (b.type === "banner")
    return (
      <section className="grid items-center gap-8 overflow-hidden rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-white/10 md:grid-cols-2 md:p-8">
        {b.media && <MediaView media={b.media} className="w-full rounded-2xl object-cover" />}
        <div>{text}</div>
      </section>
    );
  if (b.type === "text") return <section className="max-w-3xl">{text}</section>;
  return (
    <figure>
      {b.media && <MediaView media={b.media} className="mx-auto w-full rounded-[var(--radius-card)] object-cover" />}
      {(b.title || b.body) && (
        <figcaption className="mt-4">
          {b.title && <p className="text-lg font-semibold">{b.title}</p>}
          {b.body && <p className="mt-1 whitespace-pre-line text-white/70">{b.body}</p>}
          {button}
        </figcaption>
      )}
    </figure>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 text-white ring-1 ring-gold/40 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Choose a picture / video: upload one from the device, or paste a YouTube link. */
function MediaPicker({ initial, onPick, onClose, allowVideo = true }: { initial?: MediaValue; onPick: (m: MediaValue) => void; onClose: () => void; allowVideo?: boolean }) {
  const [media, setMedia] = useState<MediaValue | undefined>(initial);
  return (
    <Modal title="Picture or video" onClose={onClose}>
      <MediaField value={media} onChange={setMedia} allowVideo={allowVideo} />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn border border-white/20 !py-2.5 text-sm">Cancel</button>
        <button type="button" disabled={!media} onClick={() => media && onPick(media)} className="btn btn-gold !py-2.5 text-sm disabled:opacity-40">Use this</button>
      </div>
    </Modal>
  );
}

function MediaField({ value, onChange, allowVideo = true }: { value?: MediaValue; onChange: (m: MediaValue | undefined) => void; allowVideo?: boolean }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yt, setYt] = useState(value?.kind === "YOUTUBE" ? `https://youtu.be/${value.url}` : "");
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setProgress(0);
    try {
      const r = await uploadMedia(file, "site", setProgress);
      onChange({ kind: r.type, url: r.url, alt: value?.alt ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-4">
      {value && (
        <div className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
          <MediaView media={value} className="max-h-56 w-full object-contain" />
        </div>
      )}
      <input ref={input} type="file" accept={allowVideo ? "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif"} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button type="button" disabled={progress !== null} onClick={() => input.current?.click()} className="btn btn-primary w-full !py-3 text-sm">
        <Icon name="upload" className="h-4 w-4" />
        {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : allowVideo ? "Upload a picture or video" : "Upload a picture"}
      </button>
      <p className="text-xs text-muted">Pictures: JPG, PNG, WebP or GIF up to 10 MB. {allowVideo && "Videos: MP4, WebM or MOV up to 60 MB (they play silently on a loop)."}</p>
      {allowVideo && (
        <label className="block">
          <span className="label">…or a YouTube link</span>
          <span className="flex gap-2">
            <input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtu.be/…" className="field" />
            <button
              type="button"
              className="btn border border-white/20 !py-2 text-sm"
              onClick={() => {
                const id = youtubeId(yt);
                if (!id) return setError("That doesn't look like a YouTube link");
                setError(null);
                onChange({ kind: "YOUTUBE", url: id, alt: value?.alt ?? "" });
              }}
            >
              Use
            </button>
          </span>
        </label>
      )}
      {value && (
        <label className="block">
          <span className="label">Description (for screen readers and Google)</span>
          <input value={value.alt ?? ""} onChange={(e) => onChange({ ...value, alt: e.target.value })} placeholder="e.g. Phone with a Spider-Man photo skin" className="field" />
        </label>
      )}
      {error && <p role="alert" className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
    </div>
  );
}

const BLOCK_TYPES: { type: BlockType; label: string; hint: string }[] = [
  { type: "image", label: "Picture", hint: "A picture with an optional caption" },
  { type: "video", label: "Video", hint: "Upload a video or use a YouTube link" },
  { type: "text", label: "Text", hint: "A heading and a paragraph" },
  { type: "banner", label: "Picture + text", hint: "Side by side, with an optional button" },
];

function BlockEditor({ initial, onSave, onClose }: { initial: Block; onSave: (b: Block) => void; onClose: () => void }) {
  const [b, setB] = useState<Block>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Block>) => setB((x) => ({ ...x, ...patch }));
  const needsMedia = b.type !== "text";

  return (
    <Modal title="Section" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_TYPES.map((t) => (
          <button key={t.type} type="button" onClick={() => set({ type: t.type })} className={cn("rounded-xl p-3 text-left text-sm ring-1 transition", b.type === t.type ? "bg-gold/15 ring-gold" : "ring-white/10 hover:ring-gold/50")}>
            <span className="block font-semibold">{t.label}</span>
            <span className="block text-xs text-muted">{t.hint}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-4">
        {needsMedia && <MediaField value={b.media} onChange={(m) => set({ media: m })} allowVideo={b.type !== "image"} />}
        <label className="block">
          <span className="label">{b.type === "text" || b.type === "banner" ? "Heading" : "Caption (optional)"}</span>
          <input value={b.title ?? ""} onChange={(e) => set({ title: e.target.value })} className="field" />
        </label>
        <label className="block">
          <span className="label">Text (optional)</span>
          <textarea value={b.body ?? ""} onChange={(e) => set({ body: e.target.value })} rows={4} className="field" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Button text (optional)</span>
            <input value={b.buttonText ?? ""} onChange={(e) => set({ buttonText: e.target.value })} placeholder="Shop now" className="field" />
          </label>
          <label className="block">
            <span className="label">Button link</span>
            <input value={b.buttonHref ?? ""} onChange={(e) => set({ buttonHref: e.target.value })} placeholder="/new-phones or https://…" className="field" />
          </label>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn border border-white/20 !py-2.5 text-sm">Cancel</button>
        <button
          type="button"
          className="btn btn-gold !py-2.5 text-sm"
          onClick={() => {
            if (needsMedia && !b.media) return setError(b.type === "video" ? "Add a video first" : "Add a picture first");
            if (b.type === "text" && !b.title && !b.body) return setError("Write a heading or some text");
            if (b.buttonText && !(b.buttonHref && safeHref(b.buttonHref))) return setError("Add a link for the button: a page like /new-phones, or an https:// link");
            const clean: Block = { id: b.id, type: b.type, ...(needsMedia ? { media: b.media } : {}), title: b.title || undefined, body: b.body || undefined, ...(b.buttonText ? { buttonText: b.buttonText, buttonHref: safeHref(b.buttonHref ?? "") ?? undefined } : {}) };
            onSave(clean);
          }}
        >
          Save section
        </button>
      </div>
    </Modal>
  );
}

/** Floating bar while editing: unpublished count, Publish, Discard, Exit. */
function EditBar({ count, onDiscarded }: { count: number; onDiscarded: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const exitHref = `/api/admin/site-content/edit?on=0&next=${encodeURIComponent(typeof location !== "undefined" ? location.pathname : "/")}`;
  return (
    <div className="fixed inset-x-2 bottom-3 z-[110] mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl bg-black/90 p-2.5 pl-4 text-sm text-white shadow-2xl ring-1 ring-gold/60 backdrop-blur">
      <span className="flex items-center gap-2 font-semibold text-gold">
        <Icon name="sparkle" className="h-4 w-4" /> Editing website
      </span>
      <span className="text-white/70">{done ?? (count ? `${count} unpublished change${count === 1 ? "" : "s"}` : "Click any outlined text to change it")}</span>
      <span className="ml-auto flex gap-1.5">
        {count > 0 && (
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              if (!window.confirm("Throw away all unpublished changes?")) return;
              setBusy("discard");
              await fetch("/api/admin/site-content", { method: "DELETE" });
              onDiscarded();
              setBusy(null);
            }}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/20 hover:bg-white/10"
          >
            Discard
          </button>
        )}
        <button
          type="button"
          disabled={!count || !!busy}
          onClick={async () => {
            setBusy("publish");
            const r = await fetch("/api/admin/site-content/publish", { method: "POST" });
            setBusy(null);
            if (!r.ok) return window.alert("Couldn't publish — please try again.");
            setDone("Published — everyone sees it now");
            setTimeout(() => location.reload(), 900);
          }}
          className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-[#120d02] disabled:opacity-40"
        >
          {busy === "publish" ? "Publishing…" : "Publish"}
        </button>
        <a href={exitHref} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/20 hover:bg-white/10">Exit</a>
      </span>
    </div>
  );
}

/** An animated (word-by-word) headline that's editable: plain editable text in edit mode. */
export function EditableHeadline({ k, d, className }: { k: string; d: string; className?: string }) {
  const editing = useEditing();
  const text = useText(k, d);
  if (editing) return <span className={className}><T k={k} d={d} /></span>;
  return <SplitHeadline text={text} className={className} />;
}

/**
 * A call / email / WhatsApp link whose number or address the owner can edit (store info is shared by every
 * page, e.g. "store.phone"). The link follows the edited text.
 */
export function StoreLink({ k, d, type, className, children }: { k: string; d: string; type: "tel" | "mailto" | "wa"; className?: string; children: React.ReactNode }) {
  const value = useText(k, d);
  const href = type === "tel" ? `tel:${value.replace(/[^\d+]/g, "")}` : type === "mailto" ? `mailto:${value.trim()}` : `https://wa.me/${value.replace(/\D/g, "")}`;
  return (
    <a href={href} className={className} {...(type === "wa" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}
