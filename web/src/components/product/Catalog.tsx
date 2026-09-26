"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { CatalogItem } from "@/lib/catalog";
import { ACCESSORY_TYPES, USED_GRADES, type AccessoryType } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { ProductCard } from "./ProductCard";
import { Icon } from "../ui/Icon";

type Mode = "new" | "used" | "tablets" | "accessories";

const SORTS = {
  featured: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A–Z",
} as const;
type Sort = keyof typeof SORTS;

/**
 * Searchable / filterable / sortable catalogue (brief §2, §10).
 * Filter state is mirrored into the URL so filtered views are shareable and crawlable.
 */
export function Catalog({ items, mode }: { items: CatalogItem[]; mode: Mode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const list = (k: string) => params.get(k)?.split(",").filter(Boolean) ?? [];
  const [q, setQ] = useState(params.get("q") ?? "");
  const [brands, setBrands] = useState<string[]>(list("brand"));
  const [storages, setStorages] = useState<string[]>(list("storage"));
  const [rams, setRams] = useState<string[]>(list("ram"));
  const [colors, setColors] = useState<string[]>(list("color"));
  const [grades, setGrades] = useState<string[]>(list("grade"));
  const [types, setTypes] = useState<string[]>(list("type"));
  const [inStock, setInStock] = useState(params.get("stock") === "1");
  const [minBattery, setMinBattery] = useState(Number(params.get("battery") ?? 0));
  const [maxPrice, setMaxPrice] = useState<number | null>(params.get("max") ? Number(params.get("max")) : null);
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "featured");
  const [panel, setPanel] = useState(false);

  const facets = useMemo(() => {
    const count = <T extends string>(get: (i: CatalogItem) => T[]) => {
      const m = new Map<T, number>();
      items.forEach((i) => get(i).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1)));
      return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }));
    };
    const colorHex = new Map<string, string | null>();
    items.forEach((i) => i.colors.forEach((c) => colorHex.set(c.name, c.hex)));
    return {
      brands: count((i) => [i.brand]),
      storages: count((i) => i.storages),
      colors: count((i) => i.colors.map((c) => c.name)).map(([n, c]) => ({ name: n, count: c, hex: colorHex.get(n) ?? null })),
      grades: count((i) => (i.grade ? [i.grade] : [])),
      rams: count((i) => i.rams),
      types: count((i) => (i.accessoryType ? [i.accessoryType] : [])),
      priceCeil: Math.max(0, ...items.map((i) => i.fromPrice)),
    };
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = items.filter((i) => {
      if (needle && !`${i.brand} ${i.name} ${i.storages.join(" ")} ${i.colors.map((c) => c.name).join(" ")}`.toLowerCase().includes(needle)) return false;
      if (brands.length && !brands.includes(i.brand)) return false;
      if (storages.length && !i.storages.some((s) => storages.includes(s))) return false;
      if (colors.length && !i.colors.some((c) => colors.includes(c.name))) return false;
      if (grades.length && !(i.grade && grades.includes(i.grade))) return false;
      if (rams.length && !i.rams.some((r) => rams.includes(r))) return false;
      if (types.length && !(i.accessoryType && types.includes(i.accessoryType))) return false;
      if (inStock && i.totalStock <= 0) return false;
      if (minBattery && (i.bestBattery ?? 0) < minBattery) return false;
      if (maxPrice != null && i.fromPrice > maxPrice) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.fromPrice - b.fromPrice;
        case "price-desc":
          return b.fromPrice - a.fromPrice;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return Number(b.featured) - Number(a.featured) || Number(b.totalStock > 0) - Number(a.totalStock > 0) || a.createdOrder - b.createdOrder;
      }
    });
    return out;
  }, [items, q, brands, storages, rams, colors, grades, types, inStock, minBattery, maxPrice, sort]);

  function sync(next: Record<string, string | string[] | number | boolean | null>) {
    const p = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      const s = Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? (v ? "1" : "") : v == null || v === 0 ? "" : String(v);
      if (s) p.set(k, s);
      else p.delete(k);
    });
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
  }

  const toggle = (arr: string[], set: (v: string[]) => void, key: string, value: string) => {
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    set(next);
    sync({ [key]: next });
  };

  const activeCount = brands.length + storages.length + rams.length + colors.length + grades.length + types.length + (inStock ? 1 : 0) + (minBattery ? 1 : 0) + (maxPrice != null ? 1 : 0);

  const reset = () => {
    setBrands([]);
    setStorages([]);
    setRams([]);
    setColors([]);
    setGrades([]);
    setTypes([]);
    setInStock(false);
    setMinBattery(0);
    setMaxPrice(null);
    setQ("");
    router.replace(pathname, { scroll: false });
  };

  const filters = (
    <div className="space-y-8">
      {mode === "accessories" && facets.types.length > 0 && (
        <FilterGroup title="Category">
          {facets.types.map(([t, c]) => (
            <Check key={t} label={ACCESSORY_TYPES[t as AccessoryType] ?? t} count={c} checked={types.includes(t)} onChange={() => toggle(types, setTypes, "type", t)} />
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Brand">
        {facets.brands.map(([b, c]) => (
          <Check key={b} label={b} count={c} checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, "brand", b)} />
        ))}
      </FilterGroup>
      {facets.grades.length > 0 && (
        <FilterGroup title="Condition grade">
          {facets.grades.map(([g, c]) => (
            <Check key={g} label={`Grade ${g}`} hint={USED_GRADES[g as keyof typeof USED_GRADES]} count={c} checked={grades.includes(g)} onChange={() => toggle(grades, setGrades, "grade", g)} />
          ))}
        </FilterGroup>
      )}
      {facets.grades.length > 0 && (
        <FilterGroup title={`Battery health ${minBattery ? `≥ ${minBattery}%` : ""}`}>
          <div className="flex flex-wrap gap-2">
            {[0, 80, 85, 90].map((b) => (
              <button
                key={b}
                onClick={() => {
                  setMinBattery(b);
                  sync({ battery: b });
                }}
                className={cn("rounded-full border px-3 py-1.5 text-sm", minBattery === b ? "border-gold bg-gold text-[#120d02]" : "border-ink/15 hover:border-ink/40")}
              >
                {b === 0 ? "Any" : `${b}%+`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Shown where the manufacturer reports battery health.</p>
        </FilterGroup>
      )}
      {facets.storages.length > 0 && (
        <FilterGroup title="Storage">
          <div className="flex flex-wrap gap-2">
            {facets.storages.map(([s]) => (
              <button
                key={s}
                onClick={() => toggle(storages, setStorages, "storage", s)}
                aria-pressed={storages.includes(s)}
                className={cn("rounded-full border px-3 py-1.5 text-sm", storages.includes(s) ? "border-gold bg-gold text-[#120d02]" : "border-ink/15 hover:border-ink/40")}
              >
                {s}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
      {facets.rams.length > 0 && (
        <FilterGroup title="RAM">
          <div className="flex flex-wrap gap-2">
            {facets.rams.map(([r]) => (
              <button
                key={r}
                onClick={() => toggle(rams, setRams, "ram", r)}
                aria-pressed={rams.includes(r)}
                className={cn("rounded-full border px-3 py-1.5 text-sm", rams.includes(r) ? "border-gold bg-gold text-[#120d02]" : "border-ink/15 hover:border-ink/40")}
              >
                {r}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
      {facets.colors.length > 0 && (
        <FilterGroup title="Colour">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                aria-label={c.name}
                aria-pressed={colors.includes(c.name)}
                onClick={() => toggle(colors, setColors, "color", c.name)}
                className={cn("h-8 w-8 rounded-full ring-1 ring-black/10 transition", colors.includes(c.name) && "ring-2 ring-blue ring-offset-2 ring-offset-cream")}
                style={{ background: c.hex ?? "#ccc" }}
              />
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title={`Max price${maxPrice != null ? `: ${pkr(maxPrice)}` : ""}`}>
        <input
          type="range"
          min={0}
          max={facets.priceCeil}
          step={facets.priceCeil > 100000 ? 5000 : 500}
          value={maxPrice ?? facets.priceCeil}
          onChange={(e) => setMaxPrice(Number(e.target.value) >= facets.priceCeil ? null : Number(e.target.value))}
          onPointerUp={() => sync({ max: maxPrice })}
          onKeyUp={() => sync({ max: maxPrice })}
          className="w-full accent-[var(--color-red)]"
          aria-label="Maximum price"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>Rs 0</span>
          <span>{pkr(facets.priceCeil)}</span>
        </div>
      </FilterGroup>
      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-card)]">
        <span className="text-sm font-medium">In stock only</span>
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => {
            setInStock(e.target.checked);
            sync({ stock: e.target.checked });
          }}
          className="h-5 w-5 accent-[var(--color-blue)]"
        />
      </label>
    </div>
  );

  return (
    <div className="container-pb pb-24">
      {/* Toolbar */}
      <div className="sticky top-[var(--header-h)] z-30 -mx-5 mb-8 border-b border-ink/10 bg-cream/90 px-5 py-3 backdrop-blur-xl md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-60">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <label htmlFor="catalog-search" className="sr-only">Search</label>
            <input
              id="catalog-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => sync({ q })}
              placeholder={mode === "accessories" ? "Search cases, chargers, earbuds…" : "Search brand, model, storage…"}
              className="field !rounded-full !py-2.5 !pl-10"
            />
          </div>
          <button onClick={() => setPanel(true)} className="btn btn-ghost !rounded-full !py-2.5 text-ink lg:hidden">
            <span className="flex items-center gap-2">
              <Icon name="filter" className="h-4 w-4" /> Filters {activeCount > 0 && `(${activeCount})`}
            </span>
          </button>
          <label className="sr-only" htmlFor="catalog-sort">Sort</label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              sync({ sort: e.target.value === "featured" ? null : e.target.value });
            }}
            className="field !w-auto !rounded-full !py-2.5"
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+6rem)] max-h-[calc(100vh-var(--header-h)-7rem)] overflow-y-auto pb-6 pr-2" data-lenis-prevent>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              {activeCount > 0 && (
                <button onClick={reset} className="text-sm text-red hover:underline">Clear all</button>
              )}
            </div>
            {filters}
          </div>
        </aside>

        <div>
          <p className="mb-5 text-sm text-muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
          </p>
          {filtered.length === 0 ? (
            <div className="card grid place-items-center gap-3 px-6 py-20 text-center">
              <Icon name="search" className="h-8 w-8 text-muted" />
              <p className="font-semibold">Nothing matches those filters.</p>
              <p className="max-w-sm text-sm text-muted">Try removing a filter, or ask us on chat — new stock arrives regularly.</p>
              <button onClick={reset} className="btn btn-primary mt-2">Clear filters</button>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3 }}>
                    <ProductCard item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {panel && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-navy-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanel(false)} />
            <motion.div
              role="dialog"
              aria-label="Filters"
              className="fixed inset-x-0 bottom-0 z-[71] max-h-[85svh] overflow-y-auto rounded-t-3xl bg-cream p-6"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              data-lenis-prevent
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="display text-2xl">Filters</h2>
                <button onClick={() => setPanel(false)} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
                  <Icon name="close" />
                </button>
              </div>
              {filters}
              <div className="sticky bottom-0 mt-8 flex gap-3 bg-cream pt-3">
                <button onClick={reset} className="btn btn-ghost flex-1 text-ink"><span>Clear</span></button>
                <button onClick={() => setPanel(false)} className="btn btn-primary flex-1">Show {filtered.length}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="label !mb-3">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Check({ label, count, checked, onChange, hint }: { label: string; count: number; checked: boolean; onChange: () => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 accent-[var(--color-blue)]" />
      <span className="flex-1">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="text-xs text-muted">{count}</span>
    </label>
  );
}
