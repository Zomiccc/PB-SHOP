"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { ProductDTO } from "@/lib/catalog";
import { ACCESSORY_TYPES, USED_GRADES, type AccessoryType } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { ProductArt } from "./ProductArt";
import { FinanceCalculator } from "../FinanceCalculator";
import { lowestInstallment, type FinancingConfig } from "@/lib/finance";
import { Icon } from "../ui/Icon";

const ProductViewer = dynamic(() => import("../three/ProductViewer"), {
  ssr: false,
  loading: () => <div className="aspect-square animate-pulse rounded-[var(--radius-card)] bg-navy-900" />,
});

export function ProductDetail({ product, pointsPerRupees, financing }: { product: ProductDTO; pointsPerRupees: number; financing: FinancingConfig }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const isPhone = product.type === "PHONE";
  const [variantId, setVariantId] = useState(() => (product.variants.find((v) => v.stockQty > 0) ?? product.variants[0])?.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"3d" | "photos">(isPhone ? "3d" : "photos");
  const [added, setAdded] = useState(false);

  const storages = useMemo(() => [...new Set(product.variants.map((v) => v.storage).filter(Boolean))] as string[], [product.variants]);
  const colors = useMemo(() => [...new Map(product.variants.filter((v) => v.color).map((v) => [v.color, v])).values()], [product.variants]);

  const pick = (by: { storage?: string | null; color?: string | null }) => {
    const storage = by.storage !== undefined ? by.storage : variant.storage;
    const color = by.color !== undefined ? by.color : variant.color;
    const exact = product.variants.find((v) => v.storage === storage && v.color === color);
    const fallback = product.variants.find((v) => (by.storage !== undefined ? v.storage === storage : v.color === color));
    const next = exact ?? fallback;
    if (next) {
      setVariantId(next.id);
      setQty(1);
    }
  };

  const price = variant.salePrice ?? variant.price;
  const out = variant.stockQty <= 0;
  const low = !out && variant.stockQty <= Math.max(variant.lowStockThreshold, 2);
  const points = Math.floor((price * qty) / pointsPerRupees);
  const label = [variant.storage, variant.color, variant.grade ? `Grade ${variant.grade}` : null].filter(Boolean).join(" · ") || "Standard";

  const toCart = (buyNow = false) => {
    add({
      variantId: variant.id,
      slug: product.slug,
      name: product.name + (product.condition === "USED" ? " (Used)" : ""),
      variantLabel: label,
      sku: variant.sku,
      price,
      qty,
      maxQty: variant.stockQty,
      colorHex: variant.colorHex ?? product.finishHex,
      kind: product.type,
      accessoryType: product.accessoryType,
    });
    if (buyNow) {
      useCart.getState().setOpen(false);
      router.push("/checkout");
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };

  return (
    <div className="container-pb grid gap-10 pb-20 pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      {/* Gallery / 3D */}
      <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
        {isPhone && (
          <div className="mb-4 inline-flex rounded-full bg-white p-1 shadow-[var(--shadow-card)]" role="tablist">
            {(["3d", "photos"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn("rounded-full px-4 py-2 text-sm font-medium transition", view === v ? "bg-navy-950 text-white" : "text-muted hover:text-ink")}
              >
                {v === "3d" ? "3D view" : "Gallery"}
              </button>
            ))}
          </div>
        )}
        {view === "3d" && isPhone ? (
          <ProductViewer color={variant.colorHex ?? product.finishHex ?? "#1c3552"} modelUrl={product.model3dUrl} textures={product.model3dTextures} sketchfabUid={product.sketchfabUid} name={product.name} brand={product.brand} />
        ) : (
          <div className="grid gap-3">
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-b from-white to-cream-200">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain p-8" />
              ) : (
                <motion.div key={variant.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-10">
                  <ProductArt kind={product.type} accessoryType={product.accessoryType} colorHex={variant.colorHex ?? product.finishHex} brand={product.brand} name={product.name} />
                </motion.div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="aspect-square rounded-xl bg-white object-contain p-2" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buy box */}
      <div>
        <nav aria-label="Breadcrumb" className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
          <Link href="/" className="hover:text-ink">Home</Link> /{" "}
          <Link href={isPhone ? (product.condition === "USED" ? "/used-phones" : "/new-phones") : "/accessories"} className="hover:text-ink">
            {isPhone ? (product.condition === "USED" ? "Used phones" : "New phones") : "Accessories"}
          </Link>
        </nav>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-blue">{product.brand}</p>
        <h1 className="display mt-2 text-4xl md:text-6xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", product.condition === "USED" ? "bg-gold/20 text-[#7a570c]" : "bg-blue/10 text-blue")}>
            {isPhone ? (product.condition === "USED" ? "Used · lab tested" : "Brand new") : ACCESSORY_TYPES[(product.accessoryType ?? "OTHER") as AccessoryType]}
          </span>
          {product.careCardEligible && <span className="rounded-full bg-navy-950 px-3 py-1 text-xs font-semibold text-gold">Includes PB Care Card</span>}
        </div>
        <p className="mt-5 text-lg text-muted">{product.description}</p>

        <div className="mt-6 flex items-end gap-3">
          <p className="display text-4xl text-navy-950">{pkr(price)}</p>
          {variant.salePrice && <p className="pb-1 text-lg text-muted line-through">{pkr(variant.price)}</p>}
        </div>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">SKU {variant.sku}</p>

        {/* Variant pickers */}
        {storages.length > 0 && (
          <fieldset className="mt-8">
            <legend className="label">Storage</legend>
            <div className="flex flex-wrap gap-2">
              {storages.map((s) => {
                const v = product.variants.find((x) => x.storage === s);
                return (
                  <button
                    key={s}
                    onClick={() => pick({ storage: s })}
                    aria-pressed={variant.storage === s}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-sm transition",
                      variant.storage === s ? "border-navy-950 bg-navy-950 text-white" : "border-ink/15 bg-white hover:border-ink/40",
                    )}
                  >
                    <span className="block font-semibold">{s}</span>
                    {v && <span className={cn("text-xs", variant.storage === s ? "text-white/60" : "text-muted")}>{pkr(v.salePrice ?? v.price)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        {colors.length > 0 && (
          <fieldset className="mt-6">
            <legend className="label">Colour — {variant.color}</legend>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => (
                <button
                  key={c.color}
                  onClick={() => pick({ color: c.color })}
                  aria-label={c.color ?? ""}
                  aria-pressed={variant.color === c.color}
                  title={c.color ?? ""}
                  className={cn("h-10 w-10 rounded-full ring-1 ring-black/10 transition", variant.color === c.color && "ring-2 ring-blue ring-offset-4 ring-offset-cream")}
                  style={{ background: c.colorHex ?? "#ccc" }}
                />
              ))}
            </div>
          </fieldset>
        )}

        {/* Used-device condition panel */}
        {product.condition === "USED" && (
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink/10">
            <Info label="Condition grade" value={variant.grade ? `Grade ${variant.grade}` : "—"} hint={variant.grade ? USED_GRADES[variant.grade as keyof typeof USED_GRADES] : undefined} />
            <Info label="Battery health" value={variant.batteryHealth != null ? `${variant.batteryHealth}%` : "Not reported"} hint={variant.batteryHealth != null ? undefined : "Shown where the device reports it"} />
            <Info label="Warranty" value={variant.warrantyInfo ?? "—"} />
            <Info label="Returns" value={variant.returnInfo ?? "—"} />
            {variant.conditionNotes && (
              <div className="col-span-2 bg-white p-4">
                <p className="label !mb-1">Lab notes</p>
                <p className="text-sm">{variant.conditionNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Stock + quantity + actions */}
        <div className="mt-8 flex items-center gap-3 text-sm">
          <span className={cn("h-2.5 w-2.5 rounded-full", out ? "bg-muted" : low ? "bg-gold" : "bg-emerald-500")} />
          <span className="font-medium">{out ? "Out of stock" : low ? `Only ${variant.stockQty} left in stock` : "In stock — ready to ship or collect"}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="flex items-center rounded-xl border border-ink/15 bg-white">
            <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} className="grid h-[52px] w-12 place-items-center disabled:opacity-30">
              <Icon name="minus" className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-semibold" aria-live="polite">{qty}</span>
            <button aria-label="Increase quantity" disabled={out || qty >= variant.stockQty} onClick={() => setQty((q) => q + 1)} className="grid h-[52px] w-12 place-items-center disabled:opacity-30">
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          <button disabled={out} onClick={() => toCart(false)} className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40">
            {added ? (
              <>
                <Icon name="check" className="h-4 w-4" /> Added to bag
              </>
            ) : (
              <>
                <Icon name="bag" className="h-4 w-4" /> Add to bag
              </>
            )}
          </button>
          <button disabled={out} onClick={() => toCart(true)} className="btn btn-red flex-1 disabled:cursor-not-allowed disabled:opacity-40">
            Buy now
          </button>
        </div>
        {out && (
          <Link href={`/contact?subject=${encodeURIComponent(`Notify me: ${product.name}`)}`} className="mt-3 inline-block text-sm text-blue hover:underline">
            Ask us when it&apos;s back in stock →
          </Link>
        )}

        {isPhone && (() => {
          const low = lowestInstallment(price, financing);
          if (!low) return null;
          return (
            <details className="group mt-6 rounded-2xl bg-white shadow-[var(--shadow-card)] open:shadow-[var(--shadow-lift)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                <span>
                  <span className="block text-xs text-muted">Or pay in installments</span>
                  <span className="font-semibold">From <b className="text-red">{pkr(low.perInstallment)}</b>/{financing.period === "WEEKLY" ? "week" : "month"}</span>
                </span>
                <span className="rounded-full bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white group-open:bg-gold group-open:text-navy-950">Calculate</span>
              </summary>
              <div className="p-2 pt-0">
                <FinanceCalculator key={variant.id} config={financing} initialPrice={price} productName={`${product.name}${variant.storage ? ` ${variant.storage}` : ""}`} compact />
              </div>
            </details>
          );
        })()}

        <ul className="mt-8 space-y-3 border-t border-ink/10 pt-6 text-sm">
          <li className="flex gap-3"><Icon name="gift" className="h-5 w-5 shrink-0 text-gold" /> Earn about <b>{points} Passport points</b> with this purchase.</li>
          <li className="flex gap-3"><Icon name="card" className="h-5 w-5 shrink-0 text-gold" /> Pay by mobile wallet, bank account or card — secure Pakistani gateway.</li>
          <li className="flex gap-3"><Icon name="truck" className="h-5 w-5 shrink-0 text-gold" /> Home delivery or collect in store.</li>
          {product.careCardEligible && <li className="flex gap-3"><Icon name="shield" className="h-5 w-5 shrink-0 text-gold" /> PB Care Card with up to 5 free service visits.</li>}
        </ul>

        {Object.keys(product.specs).length > 0 && (
          <div className="mt-10">
            <h2 className="display text-2xl">Specifications</h2>
            <dl className="mt-4 divide-y divide-ink/10 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-5 py-3.5 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white p-4">
      <p className="label !mb-1">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
