"use client";

import { useState } from "react";
import { ActionForm, Submit } from "./ui";
import { savePhoneModelAction } from "@/app/admin/_actions/skins";
import { templateProblem, type SkinTemplate } from "@/lib/skin-template";
import { SkinPreview } from "../skins/SkinPreview";

const DEFAULT: SkinTemplate = { widthMm: 72, heightMm: 150, cornerMm: 9, cameraX: 6, cameraY: 6, cameraW: 28, cameraH: 28, cameraCornerMm: 7, lenses: 3, bodyHex: "#2b2f36" };

const FIELDS: { k: keyof SkinTemplate; label: string; step?: number }[] = [
  { k: "widthMm", label: "Back width (mm)" },
  { k: "heightMm", label: "Back height (mm)" },
  { k: "cornerMm", label: "Corner radius (mm)" },
  { k: "cameraX", label: "Camera — from left (mm)" },
  { k: "cameraY", label: "Camera — from top (mm)" },
  { k: "cameraW", label: "Camera width (mm)" },
  { k: "cameraH", label: "Camera height (mm)" },
  { k: "cameraCornerMm", label: "Camera corner radius (mm)" },
  { k: "lenses", label: "Lenses (1–4)", step: 1 },
];

/**
 * Phone model + its skin template (v4 §10–§11): the back's size and the camera island's placement, in mm
 * as seen from the back (top-left origin). The preview updates live with a sample design.
 */
export function PhoneModelForm({
  brands,
  model,
  sampleImage,
  defaultBrandId,
  copyFrom = [],
  initial,
}: {
  brands: { id: string; name: string }[];
  defaultBrandId?: string;
  /** Existing models whose template can be copied as a starting point (new phones are usually similar). */
  copyFrom?: { id: string; label: string; template: SkinTemplate }[];
  /** Starting template for a new model (e.g. "duplicate this model"). */
  initial?: SkinTemplate;
  model?: { id: string; brandId: string; name: string; active: boolean; sortOrder: number } & SkinTemplate;
  sampleImage?: string | null;
}) {
  const [t, setT] = useState<SkinTemplate>(model ? { ...DEFAULT, ...Object.fromEntries(Object.keys(DEFAULT).map((k) => [k, model[k as keyof SkinTemplate]])) } : (initial ?? DEFAULT));
  const [camera, setCamera] = useState(false);
  const problem = templateProblem(t);
  const set = (k: keyof SkinTemplate, v: string) => setT((p) => ({ ...p, [k]: k === "bodyHex" ? v : Number(v) }));

  return (
    <ActionForm action={savePhoneModelAction} className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {model && <input type="hidden" name="id" value={model.id} />}
        <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_100px]">
          <label className="block">
            <span className="label">Brand</span>
            <select name="brandId" defaultValue={model?.brandId ?? defaultBrandId ?? brands[0]?.id} required className="field">
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Model name</span><input name="name" required defaultValue={model?.name} placeholder="e.g. Mi 12 Pro" className="field" /></label>
          <label className="block"><span className="label">Order</span><input name="sortOrder" type="number" defaultValue={model?.sortOrder ?? 0} className="field" /></label>
        </div>
        <fieldset className="rounded-2xl border border-ink/10 p-4">
          <legend className="px-2 text-sm font-semibold">Preview template</legend>
          {copyFrom.length > 0 && (
            <label className="mb-4 block">
              <span className="label">Start from an existing model&apos;s template</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const src = copyFrom.find((c) => c.id === e.target.value);
                  if (src) setT({ ...src.template });
                }}
                className="field"
              >
                <option value="">— choose a similar phone, then adjust —</option>
                {copyFrom.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f.k} className="block">
                <span className="label">{f.label}</span>
                <input name={f.k} type="number" step={f.step ?? 0.1} min={0} value={t[f.k] as number} onChange={(e) => set(f.k, e.target.value)} required className="field" />
              </label>
            ))}
            <label className="block">
              <span className="label">Phone colour</span>
              <span className="flex gap-2">
                <input type="color" value={t.bodyHex} onChange={(e) => set("bodyHex", e.target.value)} aria-label="Pick phone colour" className="h-11 w-12 shrink-0 cursor-pointer rounded-lg bg-transparent" />
                <input name="bodyHex" value={t.bodyHex} onChange={(e) => set("bodyHex", e.target.value)} className="field font-mono" />
              </span>
            </label>
          </div>
          {problem && <p className="mt-3 text-sm text-red">{problem}</p>}
        </fieldset>
        <div className="flex flex-wrap items-center gap-4">
          {model && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={model.active} className="h-4 w-4" /> Active (shown to customers)</label>}
          <Submit variant="gold">{model ? "Save model" : "Add model"}</Submit>
        </div>
      </div>
      <aside className="rounded-2xl bg-navy-950 p-4 text-white">
        <p className="text-sm font-semibold">Live preview</p>
        {!problem && <SkinPreview template={t} imageUrl={sampleImage} cameraCover={camera} className="mx-auto mt-3 h-[420px] w-full" label="Template preview" />}
        <label className="mt-3 flex items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} className="h-4 w-4" /> Show with camera covered</label>
        <p className="mt-2 text-xs text-white/50">Tip: measure from the phone&apos;s back, top-left corner. Every skin assigned to this model is fitted to this shape.</p>
      </aside>
    </ActionForm>
  );
}
