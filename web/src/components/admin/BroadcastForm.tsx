"use client";

import { useState } from "react";
import { ActionForm, Submit } from "./ui";
import { saveBroadcastAction } from "@/app/admin/_actions/content";
import type { BroadcastMedia } from "@/lib/broadcasts";
import { uploadMedia } from "@/lib/upload-client";
import { shrinkImage } from "../ui/FileField";
import { BroadcastShowcase } from "../home/BroadcastShowcase";

type Initial = { id: string; message: string; ctaLabel: string | null; ctaHref: string | null; startsAt: string; endsAt: string; active: boolean; media: BroadcastMedia[] };

/**
 * Create / edit a broadcast (v6 §2): text, pictures and videos, start/end dates and a live preview of exactly
 * how it will look beneath Shop Phones. Media upload in pieces, so large videos work on any host.
 */
export function BroadcastForm({ b }: { b?: Initial }) {
  const [message, setMessage] = useState(b?.message ?? "");
  const [ctaLabel, setCtaLabel] = useState(b?.ctaLabel ?? "");
  const [ctaHref, setCtaHref] = useState(b?.ctaHref ?? "");
  const [media, setMedia] = useState<BroadcastMedia[]>(b?.media ?? []);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setProblem(null);
    for (const original of [...files].slice(0, 8 - media.length)) {
      try {
        const file = original.type.startsWith("image/") ? await shrinkImage(original) : original;
        setProgress({ name: original.name, pct: 0 });
        const res = await uploadMedia(file, "broadcasts", (f) => setProgress({ name: original.name, pct: Math.round(f * 100) }));
        setMedia((m) => [...m, { url: res.url, type: res.type }]);
      } catch (e) {
        setProblem(`${original.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    setProgress(null);
  }

  const move = (i: number, d: -1 | 1) => setMedia((m) => {
    const next = [...m];
    const j = i + d;
    if (j < 0 || j >= next.length) return m;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <ActionForm action={saveBroadcastAction} resetOnSuccess={!b} className="space-y-3">
      <input type="hidden" name="id" value={b?.id ?? ""} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      <label className="block">
        <span className="label">Message</span>
        <textarea name="message" rows={2} maxLength={400} value={message} onChange={(e) => setMessage(e.target.value)} required className="field" placeholder="Eid timings: open 2 pm – 11 pm this week" />
        <span className="mt-1 block text-xs text-muted">Short and clear — up to 400 characters.</span>
      </label>

      <div>
        <span className="label">Pictures & videos (optional)</span>
        {media.length > 0 && (
          <ul className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((m, i) => (
              <li key={m.url} className="relative overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
                {m.type === "VIDEO" ? (
                  <video src={m.url} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
                  <img src={m.url} alt="" className="aspect-square w-full object-cover" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[0.6rem] font-semibold text-white">{m.type === "VIDEO" ? "VIDEO" : "PHOTO"}</span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 text-xs text-white">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" className="px-2 py-1 disabled:opacity-30">←</button>
                  <button type="button" onClick={() => setMedia((x) => x.filter((_, k) => k !== i))} aria-label="Remove" className="px-2 py-1 text-red">Remove</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === media.length - 1} aria-label="Move later" className="px-2 py-1 disabled:opacity-30">→</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {media.length < 8 && (
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            disabled={!!progress}
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
            className="field file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#120d02]"
            aria-label="Add pictures or videos"
          />
        )}
        <span className="mt-1 block text-xs text-muted">Pictures up to 10 MB, videos (MP4 / WebM / MOV) up to 60 MB. Up to 8 per broadcast.</span>
        {progress && (
          <div className="mt-2 text-xs text-muted" role="status">
            Uploading {progress.name}… {progress.pct}%
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gold transition-all" style={{ width: `${progress.pct}%` }} /></div>
          </div>
        )}
        {problem && <p role="alert" className="mt-2 rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{problem}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Button text (optional)</span><input name="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Shop the sale" className="field" /></label>
        <label className="block"><span className="label">Button link (optional)</span><input name="ctaHref" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/used-phones or https://…" className="field" /></label>
        <label className="block"><span className="label">Show from (optional, PKT)</span><input name="startsAt" type="datetime-local" defaultValue={b?.startsAt} className="field" /></label>
        <label className="block"><span className="label">Show until (optional, PKT)</span><input name="endsAt" type="datetime-local" defaultValue={b?.endsAt} className="field" /></label>
      </div>

      <div>
        <button type="button" onClick={() => setShowPreview((v) => !v)} className="text-sm font-semibold text-gold hover:underline">{showPreview ? "Hide preview" : "Preview before publishing"}</button>
        {showPreview && (
          <div className="mt-3 rounded-2xl bg-black p-4">
            <p className="mb-3 text-center text-xs uppercase tracking-[0.18em] text-white/40">As shown beneath Shop Phones</p>
            {message.trim().length >= 3 ? <BroadcastShowcase preview broadcasts={[{ id: "preview", message, ctaLabel: ctaLabel || null, ctaHref: ctaHref || null, media }]} /> : <p className="text-center text-sm text-white/50">Write the message to see the preview.</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} className="h-4 w-4" /> Published</label>
        <Submit variant="gold">{progress ? "Uploading…" : b ? "Save" : "Create broadcast"}</Submit>
      </div>
    </ActionForm>
  );
}
