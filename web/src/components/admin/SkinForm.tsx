"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionForm, Submit } from "./ui";
import { saveSkinAction } from "@/app/admin/_actions/skins";
import { SKIN_FOCUS, type SkinTemplate } from "@/lib/skin-template";
import { SkinPreview } from "../skins/SkinPreview";

type Model = { id: string; name: string; template: SkinTemplate };
type Brand = { id: string; name: string; models: Model[] };
type Skin = { id: string; name: string; description: string | null; imageUrl: string; fullImageUrl: string | null; focus: string; price: number; allModels: boolean; active: boolean; sortOrder: number; modelIds: string[] };

/**
 * Create / edit a design (v4 §10): artwork upload, optional extra charge, crop focus, and where it's
 * available — every phone model (incl. models added later), or chosen brands / models. The artwork is previewed live on the assigned models, fitted exactly as customers see it.
 */
export function SkinForm({ brands, skin }: { brands: Brand[]; skin?: Skin }) {
  const [picked, setPicked] = useState<Set<string>>(new Set(skin?.modelIds ?? []));
  const [allModels, setAllModels] = useState(skin?.allModels ?? true);
  const [focus, setFocus] = useState(skin?.focus ?? "xMidYMid");
  const [local, setLocal] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  const all = useMemo(() => brands.flatMap((b) => b.models.map((m) => ({ ...m, brand: b.name }))), [brands]);
  const chosen = allModels ? all : all.filter((m) => picked.has(m.id));
  const show = chosen.find((m) => m.id === previewId) ?? chosen[0] ?? all[0];
  const image = local ?? skin?.imageUrl ?? null;

  const toggle = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  return (
    <ActionForm action={saveSkinAction} className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {skin && <input type="hidden" name="id" value={skin.id} />}
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_100px]">
          <label className="block"><span className="label">Design name</span><input name="name" required defaultValue={skin?.name} className="field" /></label>
          <label className="block"><span className="label">Extra charge (Rs)</span><input name="price" type="number" min={0} defaultValue={skin?.price ?? 0} title="Added to the skin type's price — usually 0" className="field" /></label>
          <label className="block"><span className="label">Order</span><input name="sortOrder" type="number" defaultValue={skin?.sortOrder ?? 0} className="field" /></label>
        </div>
        <label className="block"><span className="label">Description (optional)</span><input name="description" defaultValue={skin?.description ?? ""} className="field" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">{skin ? "Replace artwork (optional)" : "Skin artwork"}</span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!skin}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setLocal(f ? URL.createObjectURL(f) : null);
              }}
              className="field file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#120d02]"
            />
            <span className="mt-1 block text-xs text-muted">Portrait artwork works best (about 1:2). JPG, PNG or WebP, max 4 MB.</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Full / uncut artwork (optional)</span>
            <input name="fullImage" type="file" accept="image/jpeg,image/png,image/webp" className="field file:mr-3 file:rounded-full file:border-0 file:bg-white/15 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white" />
            <span className="mt-1 block text-xs text-muted">The complete design without any phone cut-outs — customers can switch to “Full artwork” to see it. If empty, the artwork above is shown.</span>
            {skin?.fullImageUrl && (
              <span className="mt-2 flex items-center gap-3 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                <img src={skin.fullImageUrl} alt="" className="h-12 w-12 rounded object-cover" />
                <label className="flex items-center gap-1.5"><input type="checkbox" name="removeFull" className="h-4 w-4" /> Remove full artwork</label>
              </span>
            )}
          </label>
          <label className="block">
            <span className="label">Keep in view when cropped</span>
            <select name="focus" value={focus} onChange={(e) => setFocus(e.target.value)} className="field">
              {Object.entries(SKIN_FOCUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        <p className="-mt-2 text-xs text-muted">The price comes from the skin type the customer picks (3D, Leather…). Add an extra charge only for premium designs.</p>
        <fieldset className="rounded-2xl border border-ink/10 p-4">
          <legend className="px-2 text-sm font-semibold">Available for</legend>
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="allModels" checked={allModels} onChange={(e) => setAllModels(e.target.checked)} className="h-4 w-4" />
            All phone models — including new models added later
          </label>
          {brands.length === 0 && <p className="text-sm text-muted">Add brands and models first (Brands & models).</p>}
          <div className={allModels ? "hidden" : "grid gap-4 md:grid-cols-2"}>
            {brands.map((b) => {
              const ids = b.models.map((m) => m.id);
              const allOn = ids.length > 0 && ids.every((id) => picked.has(id));
              return (
                <div key={b.id}>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={allOn} onChange={(e) => toggle(ids, e.target.checked)} disabled={!ids.length} className="h-4 w-4" />
                    {b.name} <span className="font-normal text-muted">— all models</span>
                  </label>
                  <ul className="mt-1.5 space-y-1 pl-6">
                    {b.models.map((m) => (
                      <li key={m.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="modelIds" value={m.id} checked={picked.has(m.id)} onChange={(e) => toggle([m.id], e.target.checked)} className="h-4 w-4" />
                          {m.name}
                        </label>
                      </li>
                    ))}
                    {!b.models.length && <li className="text-xs text-muted">No models yet</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={skin?.active ?? true} className="h-4 w-4" /> Enabled (customers can see it)</label>
          <Submit variant="gold">{skin ? "Save skin" : "Create skin"}</Submit>
        </div>
      </div>

      <aside className="rounded-2xl bg-navy-950 p-4 text-white">
        <p className="text-sm font-semibold">Preview</p>
        {show ? (
          <>
            <select value={show.id} onChange={(e) => setPreviewId(e.target.value)} className="field mt-2 !py-2 !text-sm" aria-label="Preview on model">
              {(chosen.length ? chosen : all).map((m) => <option key={m.id} value={m.id}>{m.brand} {m.name}</option>)}
            </select>
            <SkinPreview template={show.template} imageUrl={image} focus={focus} className="mx-auto mt-3 h-[420px] w-full" label={`Preview on ${show.brand} ${show.name}`} />
            <p className="mt-2 text-xs text-white/50">Fitted automatically to each model&apos;s template — this is what customers see.</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/50">Add a phone model to preview.</p>
        )}
      </aside>
    </ActionForm>
  );
}
