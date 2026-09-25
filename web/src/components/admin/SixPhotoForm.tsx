"use client";

import { startTransition, useActionState, useState } from "react";
import { createModelJobAction } from "@/app/admin/_actions/model3d";
import { cn } from "@/lib/format";

const VIEWS = [
  { key: "front", label: "Front", hint: "Screen facing camera" },
  { key: "back", label: "Back", hint: "Camera module visible" },
  { key: "left", label: "Left edge", hint: "Volume buttons side" },
  { key: "right", label: "Right edge", hint: "Power button side" },
  { key: "top", label: "Top edge", hint: "Looking down at the top" },
  { key: "bottom", label: "Bottom edge", hint: "Charging port" },
] as const;

/**
 * Six-view upload for automatic 3D (§14). Photos are auto-cropped to the phone
 * (plain background removed at the edges) and resized in the browser before upload.
 */
export function SixPhotoForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(createModelJobAction, null);
  const [files, setFiles] = useState<Record<string, { blob: Blob; url: string }>>({});
  const [pipeline, setPipeline] = useState<"TEXTURED" | "AI">("TEXTURED");
  const [busy, setBusy] = useState<string | null>(null);
  const missing = VIEWS.filter((v) => !files[v.key]);

  async function pick(view: string, file: File | undefined) {
    if (!file) return;
    setBusy(view);
    try {
      const blob = await trim(file);
      setFiles((f) => ({ ...f, [view]: { blob, url: URL.createObjectURL(blob) } }));
    } finally {
      setBusy(null);
    }
  }

  function submit() {
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("pipeline", pipeline);
    for (const v of VIEWS) fd.set(v.key, new File([files[v.key].blob], `${v.key}.jpg`, { type: "image/jpeg" }));
    startTransition(() => action(fd));
  }

  return (
    <div className="rounded-xl bg-navy-950 p-5 text-white">
      <p className="font-semibold">Create 3D from six photos</p>
      <p className="mt-1 text-xs text-white/60">Shoot on a plain, contrasting background with even light. Each photo is auto-cropped to the phone.</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {VIEWS.map((v) => (
          <label key={v.key} className={cn("group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border text-center text-xs", files[v.key] ? "border-gold/60" : "border-dashed border-white/25 hover:border-gold")}>
            {files[v.key] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={files[v.key].url} alt={v.label} className="absolute inset-0 h-full w-full object-contain p-2" />
            ) : (
              <>
                <span className="font-semibold">{v.label}</span>
                <span className="mt-1 px-1 text-white/50">{v.hint}</span>
              </>
            )}
            {busy === v.key && <span className="absolute inset-0 grid place-items-center bg-navy-950/70">Cropping…</span>}
            <span className="absolute bottom-1 left-1 rounded bg-navy-950/80 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider">{v.label}</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(v.key, e.target.files?.[0])} />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {(["TEXTURED", "AI"] as const).map((p) => (
          <label key={p} className={cn("cursor-pointer rounded-xl border p-3", pipeline === p ? "border-gold bg-white/5" : "border-white/15")}>
            <input type="radio" name="pipeline-ui" checked={pipeline === p} onChange={() => setPipeline(p)} className="mr-2 accent-[var(--color-gold)]" />
            <b>{p === "TEXTURED" ? "Textured model (recommended)" : "AI reconstruction"}</b>
            <span className="mt-1 block text-xs text-white/55">{p === "TEXTURED" ? "Instant, free, always crisp. Photos wrap a precise phone body." : "Sends photos to the image-to-3D provider. Takes minutes; review before publishing."}</span>
          </label>
        ))}
      </div>
      <button onClick={submit} disabled={missing.length > 0 || pending} className="btn btn-gold mt-4 w-full disabled:opacity-40">
        {pending ? "Uploading…" : missing.length ? `Add ${missing.length} more photo${missing.length > 1 ? "s" : ""}` : "Generate 3D model"}
      </button>
      {state?.error && <p role="alert" className="mt-3 rounded-lg bg-red/20 px-3 py-2 text-sm">{state.error}</p>}
      {state?.ok && <p role="status" className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm">{state.message}</p>}
    </div>
  );
}

/** Crops uniform background from the edges (sampled from the corners) and caps size at 1600px. */
async function trim(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  const { data } = g.getImageData(0, 0, w, h);
  const px = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [px(2, 2), px(w - 3, 2), px(2, h - 3), px(w - 3, h - 3)];
  const bg = [0, 1, 2].map((k) => corners.reduce((s, p) => s + p[k], 0) / 4);
  const isBg = (x: number, y: number) => {
    const p = px(x, y);
    return Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) < 60;
  };
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (!isBg(x, y)) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const cw = maxX - minX;
  const ch = maxY - minY;
  const out = document.createElement("canvas");
  if (cw < w * 0.05 || ch < h * 0.05 || (cw > w * 0.98 && ch > h * 0.98)) {
    out.width = w;
    out.height = h;
    out.getContext("2d")!.drawImage(c, 0, 0);
  } else {
    out.width = cw + 4;
    out.height = ch + 4;
    out.getContext("2d")!.drawImage(c, minX - 2, minY - 2, cw + 4, ch + 4, 0, 0, cw + 4, ch + 4);
  }
  return new Promise((resolve) => out.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
}
