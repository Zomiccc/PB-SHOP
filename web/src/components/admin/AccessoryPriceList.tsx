"use client";

import { useMemo, useState } from "react";
import { pkr } from "@/lib/format";
import { Panel } from "@/components/admin/Primitives";
import { SelectAll } from "@/components/admin/SelectAll";

export type AccessoryRow = { id: string; name: string; sku: string; brand: string; category: string; categoryLabel: string; price: number; salePrice: number | null };

/** Accessory list with live search: results narrow while typing, no Filter button needed. Hidden rows aren't submitted. */
export function AccessoryPriceList({ rows }: { rows: AccessoryRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const categories = useMemo(() => [...new Map(rows.map((r) => [r.category, r.categoryLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows]);
  const brands = useMemo(() => [...new Set(rows.map((r) => r.brand))].sort(), [rows]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = rows.filter((r) => (!cat || r.category === cat) && (!brand || r.brand === brand) && words.every((w) => `${r.name} ${r.sku} ${r.brand} ${r.categoryLabel}`.toLowerCase().includes(w)));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} placeholder="Search name, brand or SKU…" aria-label="Search accessories" className="field !w-64 !py-2" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="field !w-auto !py-2">
          <option value="">All categories</option>
          {categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand" className="field !w-auto !py-2">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <Panel title={`${list.length} accessor${list.length === 1 ? "y" : "ies"}`} action={<SelectAll name="ids" />}>
        {list.length === 0 ? (
          <p className="text-sm text-muted">No accessories match.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {list.map((v) => {
              const pct = v.salePrice != null ? Math.round((1 - v.salePrice / v.price) * 100) : 0;
              return (
                <li key={v.id}>
                  <label className="flex cursor-pointer items-center gap-3 py-3">
                    <input type="checkbox" name="ids" value={v.id} className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{v.name}</span>
                      <span className="block text-xs text-muted">{v.categoryLabel} · {v.brand} · <span className="font-mono">{v.sku}</span></span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      {v.salePrice != null ? (
                        <>
                          <b className="text-gold">{pkr(v.salePrice)}</b> <span className="text-xs text-muted line-through">{pkr(v.price)}</span>
                          <span className="block text-xs font-semibold text-emerald-400">{pct}% off</span>
                        </>
                      ) : (
                        <b>{pkr(v.price)}</b>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
