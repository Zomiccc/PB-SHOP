"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { replaceSkinImageAction } from "@/app/admin/_actions/skins";
import { cleanSkinImage } from "@/lib/clean-skin-image";
import { shrinkImage } from "../ui/FileField";

type Design = { id: string; name: string; imageUrl: string; fullImageUrl: string | null };

/**
 * One click to clean designs uploaded before automatic cleaning existed: removes the white background and the
 * peel-off strip from each picture (in this browser) and saves the cleaned copy. Pictures without either are left alone.
 */
export function CleanExistingSkins({ designs }: { designs: Design[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function run() {
    setBusy(true);
    setLog([]);
    let fixed = 0;
    for (const d of designs) {
      for (const [which, url] of [["image", d.imageUrl], ["full", d.fullImageUrl]] as const) {
        if (!url || url.endsWith(".svg")) continue; // built-in sample artwork is already clean
        try {
          const blob = await (await fetch(url)).blob();
          const res = await cleanSkinImage(new File([blob], `${d.name}.jpg`, { type: blob.type || "image/jpeg" }));
          if (!res.changed) continue;
          const fd = new FormData();
          fd.set("id", d.id);
          fd.set("which", which);
          fd.set("image", await shrinkImage(res.file));
          const out = await replaceSkinImageAction(null, fd);
          if (out?.ok) {
            fixed++;
            setLog((l) => [...l, `✓ ${d.name}${which === "full" ? " (full artwork)" : ""}: removed ${res.removed.join(" and ")}`]);
          } else setLog((l) => [...l, `✗ ${d.name}: ${out?.error ?? "failed"}`]);
        } catch {
          setLog((l) => [...l, `✗ ${d.name}: couldn't load the picture`]);
        }
      }
    }
    setLog((l) => [...l, fixed ? `Done — ${fixed} picture(s) cleaned.` : "Done — nothing needed cleaning."]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={busy || !designs.length} className="btn btn-gold !py-2.5 !text-sm disabled:opacity-50">
          {busy ? "Cleaning…" : "Clean existing designs"}
        </button>
        <span className="text-xs text-muted">Removes white backgrounds and peel-off strips from designs uploaded earlier. New uploads are cleaned automatically.</span>
      </div>
      {log.length > 0 && <ul className="max-h-48 overflow-y-auto rounded-xl bg-cream/40 p-3 text-xs">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </div>
  );
}
