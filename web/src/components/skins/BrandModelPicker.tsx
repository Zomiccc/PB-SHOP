"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

type Brand = { name: string; slug: string; models: { name: string; slug: string; designs: number }[] };

/**
 * Custom Skins step 1–3 (v4 §9): search / pick the phone brand → a model dropdown with that brand's
 * models appears → choosing a model opens its skin page.
 */
export function BrandModelPicker({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const ids = useId();
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState<Brand | null>(null);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? brands.filter((b) => b.name.toLowerCase().includes(s) || b.models.some((m) => m.name.toLowerCase().includes(s))) : brands;
  }, [q, brands]);

  const pick = (b: Brand) => {
    setBrand(b);
    setQ(b.name);
  };

  return (
    <div className="card mx-auto max-w-2xl p-5 md:p-8">
      <label htmlFor={`${ids}-brand`} className="label">1. Search your phone brand</label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={`${ids}-brand`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setBrand(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length) {
              e.preventDefault();
              pick(matches[0]);
            }
          }}
          placeholder="e.g. Xiaomi, Samsung, Apple"
          autoComplete="off"
          role="combobox"
          aria-expanded={!brand}
          aria-controls={`${ids}-list`}
          className="field !pl-11"
        />
      </div>

      {!brand && (
        <ul id={`${ids}-list`} role="listbox" className="mt-3 flex flex-wrap gap-2">
          {matches.map((b) => (
            <li key={b.slug}>
              <button type="button" role="option" aria-selected={false} onClick={() => pick(b)} className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-gold hover:text-gold">
                {b.name} <span className="text-xs text-muted">· {b.models.length}</span>
              </button>
            </li>
          ))}
          {!matches.length && <li className="text-sm text-muted">No brand found — ask us on chat and we&apos;ll add it.</li>}
        </ul>
      )}

      {brand && (
        <div className="mt-6">
          <label htmlFor={`${ids}-model`} className="label">2. Choose your {brand.name} model</label>
          <select
            id={`${ids}-model`}
            defaultValue=""
            autoFocus
            onChange={(e) => e.target.value && router.push(`/custom-skins/${brand.slug}/${e.target.value}`)}
            className="field"
          >
            <option value="" disabled>Select model…</option>
            {brand.models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}{m.designs ? ` — ${m.designs} design${m.designs > 1 ? "s" : ""}` : " — designs coming soon"}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => { setBrand(null); setQ(""); }} className={cn("mt-3 text-sm text-muted hover:text-white")}>
            ← Change brand
          </button>
        </div>
      )}
    </div>
  );
}
