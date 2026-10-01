"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { bulkAddSkinAction } from "@/app/admin/_actions/skins";
import { shrinkImage } from "../ui/FileField";

type Row = { name: string; status: "waiting" | "uploading" | "done" | "error"; message?: string };

/**
 * Add many designs at once (client request): pick several images; each is compressed in the browser and
 * uploaded on its own (so no request is too large), becoming a design named after its file.
 */
export function BulkSkinUpload({ brands }: { brands: { id: string; name: string }[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget; // React clears currentTarget after the first await
    const form = new FormData(formEl);
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return;
    setBusy(true);
    const list: Row[] = files.map((f) => ({ name: f.name, status: "waiting" }));
    setRows([...list]);
    for (let i = 0; i < files.length; i++) {
      list[i] = { ...list[i], status: "uploading" };
      setRows([...list]);
      const fd = new FormData();
      fd.set("image", await shrinkImage(files[i]));
      fd.set("name", files[i].name);
      fd.set("price", String(form.get("price") ?? "0"));
      fd.set("brandId", String(form.get("brandId") ?? ""));
      if (form.get("active")) fd.set("active", "on");
      try {
        const res = await bulkAddSkinAction(null, fd);
        list[i] = res?.ok ? { ...list[i], status: "done", message: res.message } : { ...list[i], status: "error", message: res?.error ?? "Failed" };
      } catch {
        list[i] = { ...list[i], status: "error", message: "Upload failed — try this file again" };
      }
      setRows([...list]);
    }
    setBusy(false);
    formEl.reset();
    router.refresh();
  }

  const done = rows.filter((r) => r.status === "done").length;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_120px]">
        <label className="block">
          <span className="label">Design images</span>
          <input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" required className="field file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#120d02]" />
        </label>
        <label className="block">
          <span className="label">Available for</span>
          <select name="brandId" defaultValue="" className="field">
            <option value="">All phone models (incl. future ones)</option>
            {brands.map((b) => <option key={b.id} value={b.id}>Only {b.name} models</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Extra charge</span>
          <input name="price" type="number" min={0} defaultValue={0} className="field" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Enable straight away</label>
        <button disabled={busy} className="btn btn-gold !py-2.5 !text-sm disabled:opacity-50">{busy ? `Uploading ${done + 1} of ${rows.length}…` : "Upload designs"}</button>
        <span className="text-xs text-muted">Each file becomes a design named after the file (e.g. “gold-marble.jpg” → “Gold Marble”). Rename any later.</span>
      </div>
      {rows.length > 0 && (
        <ul className="divide-y divide-ink/10 rounded-xl bg-cream/40 px-3 text-sm">
          {rows.map((r, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span className="truncate">{r.name}</span>
              <span className={r.status === "done" ? "text-emerald-400" : r.status === "error" ? "text-red" : "text-muted"}>
                {r.status === "done" ? `✓ ${r.message}` : r.status === "error" ? r.message : r.status === "uploading" ? "Uploading…" : "Waiting"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
