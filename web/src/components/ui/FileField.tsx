"use client";

import { useEffect, useRef, useState } from "react";
import { cn, humanSize } from "@/lib/format";
import { Icon } from "./Icon";

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_MAX_EDGE = 1800;

export const ACCEPT = {
  id: "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf",
  photo: "image/jpeg,image/png,image/webp,image/heic,image/heif",
  docs: "image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,application/pdf,.docx,.xlsx",
};

/**
 * Phone photos are often 5–12 MB. Re-encode large JPEG/PNG/WebP images to a 1800px JPEG in the browser
 * so uploads stay fast and inside the 4 MB-per-file limit. PDFs and documents are sent unchanged.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 700 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * File input for documents & attachments (master brief §5–§7): previews, removal, client-side checks,
 * and image compression. It stays a real <input type="file">, so it works in plain forms and FormData.
 */
export function FileField({
  name,
  label,
  hint,
  required,
  multiple,
  maxFiles = 5,
  accept = ACCEPT.docs,
  error,
  capture,
  tone = "dark",
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  error?: string;
  capture?: boolean;
  tone?: "dark" | "panel";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const urls = useRef<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => urls.current.forEach((u) => u && URL.revokeObjectURL(u)), []);

  // Keep the real input's FileList in sync so the form submits exactly what is shown.
  function commit(next: File[]) {
    urls.current.forEach((u) => u && URL.revokeObjectURL(u));
    urls.current = next.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setPreviews(urls.current);
    setFiles(next);
    if (!input.current) return;
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    input.current.files = dt.files;
  }

  async function onChange(list: FileList | null) {
    if (!list) return;
    setProblem(null);
    setBusy(true);
    const picked = [...(multiple ? files : []), ...Array.from(list)].slice(0, multiple ? maxFiles : 1);
    const ready: File[] = [];
    for (const f of picked) {
      const small = await shrinkImage(f);
      if (small.size > MAX_BYTES) {
        setProblem(`"${f.name}" is larger than 4 MB — take a smaller photo or compress the PDF.`);
        continue;
      }
      ready.push(small);
    }
    if (multiple && files.length + list.length > maxFiles) setProblem(`Up to ${maxFiles} files.`);
    commit(ready);
    setBusy(false);
  }

  const id = `ff-${name}`;
  const shown = error ?? problem;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-red">*</span>}
      </label>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3.5 text-sm transition hover:border-gold/70",
          shown ? "border-red/60" : "border-white/15",
          tone === "panel" ? "bg-ink/[0.03]" : "bg-white/[0.03]",
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          <Icon name={accept === ACCEPT.photo ? "camera" : "upload"} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{busy ? "Preparing…" : files.length ? (multiple ? `${files.length} file${files.length > 1 ? "s" : ""} selected — tap to add more` : "Tap to replace") : multiple ? "Tap to choose files" : "Tap to choose a file"}</span>
          <span className="block text-xs text-muted">{hint ?? "Photo, PDF, Word or Excel · up to 4 MB each"}</span>
        </span>
      </label>
      <input
        ref={input}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        {...(capture ? { capture: "environment" as const } : {})}
        onChange={(e) => onChange(e.target.files)}
        aria-invalid={!!shown}
        className="sr-only"
      />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2 text-sm ring-1 ring-white/10">
              {previews[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[i]} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 font-mono text-[0.6rem] uppercase text-muted">{f.name.split(".").pop()}</span>
              )}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted">{humanSize(f.size)}</span>
              <button type="button" onClick={() => commit(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/10">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown && <p role="alert" className="mt-1.5 text-xs text-red">{shown}</p>}
    </div>
  );
}
