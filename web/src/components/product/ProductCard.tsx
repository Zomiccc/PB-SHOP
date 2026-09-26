"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { CatalogItem } from "@/lib/catalog";
import { ACCESSORY_TYPES, type AccessoryType } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { ProductArt } from "./ProductArt";
import { Icon } from "../ui/Icon";

/** Premium rounded card with a gentle 3D tilt on hover (desktop only). */
export function ProductCard({ item, dark = false }: { item: CatalogItem; dark?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 18 });
  const artX = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 150, damping: 20 });

  const out = item.totalStock <= 0;
  const low = !out && item.totalStock <= 2;
  const tag =
    item.type === "ACCESSORY"
      ? ACCESSORY_TYPES[(item.accessoryType ?? "OTHER") as AccessoryType]
      : item.condition === "USED"
        ? `${item.type === "TABLET" ? "Used tablet" : "Used"} · Grade ${item.grade ?? "—"}`
        : item.type === "TABLET"
          ? "New tablet"
          : "New";

  return (
    <motion.div style={{ perspective: 900 }} className="h-full">
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="h-full">
        <Link
          ref={ref}
          href={item.href}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || !ref.current) return;
            const r = ref.current.getBoundingClientRect();
            mx.set((e.clientX - r.left) / r.width);
            my.set((e.clientY - r.top) / r.height);
          }}
          onPointerLeave={() => {
            mx.set(0.5);
            my.set(0.5);
          }}
          className={cn(
            "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] transition-shadow duration-500",
            dark ? "bg-navy-900/70 ring-1 ring-white/10 hover:ring-gold/40" : "bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]",
          )}
        >
          <div className={cn("relative aspect-[5/5.2] overflow-hidden", dark ? "bg-gradient-to-b from-navy-800 to-navy-950" : "bg-gradient-to-b from-cream to-cream-200")}>
            <div
              aria-hidden
              className="absolute inset-x-8 bottom-6 h-10 rounded-[50%] blur-2xl transition-opacity duration-500 group-hover:opacity-90"
              style={{ background: item.finishHex ?? "#0077d9", opacity: 0.35 }}
            />
            <motion.div style={{ x: artX }} className="absolute inset-4 transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-[1.06]">
              <ProductArt kind={item.type} accessoryType={item.accessoryType} colorHex={item.finishHex} brand={item.brand} name={item.name} />
            </motion.div>
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <span className={cn("rounded-full px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em]", dark ? "bg-white/10 text-white/80" : "bg-black/60 text-white/85 backdrop-blur")}>
                {tag}
              </span>
              {item.onSale && <span className="rounded-full bg-red px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-white">Offer</span>}
            </div>
            {(item.type === "PHONE" || item.type === "TABLET") && (
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-navy-950/80 text-gold opacity-0 transition-opacity group-hover:opacity-100" title="3D view available">
                <Icon name="rotate" className="h-4 w-4" />
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-1 p-5">
            <p className={cn("font-mono text-[0.62rem] uppercase tracking-[0.2em]", dark ? "text-gold" : "text-blue")}>{item.brand}</p>
            <h3 className={cn("text-[1.05rem] font-semibold leading-snug", dark ? "text-white" : "text-ink")}>{item.name}</h3>
            {(item.storages.length > 0 || item.rams.length > 0 || item.bestBattery) && (
              <p className={cn("text-xs", dark ? "text-white/50" : "text-muted")}>
                {[...item.storages, ...item.rams.map((r) => `${r} RAM`)].join(" · ")}
                {item.bestBattery ? ` · Battery ${item.bestBattery}%` : ""}
              </p>
            )}
            {item.colors.length > 1 && (
              <div className="mt-1 flex gap-1.5">
                {item.colors.map((c) => (
                  <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c.hex ?? "#ccc" }} />
                ))}
              </div>
            )}
            <div className="mt-auto flex items-end justify-between pt-4">
              <div>
                <p className={cn("text-[0.7rem]", dark ? "text-white/40" : "text-muted")}>{item.storages.length > 1 || item.colors.length > 1 ? "From" : "Price"}</p>
                <p className={cn("text-lg font-bold", dark ? "text-white" : "text-ink")}>{pkr(item.fromPrice)}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.68rem] font-semibold",
                  out ? "bg-ink/10 text-muted" : low ? "bg-gold/20 text-gold-soft" : "bg-emerald-500/10 text-emerald-400",
                  dark && !out && !low && "text-emerald-300",
                )}
              >
                {out ? "Out of stock" : low ? `Only ${item.totalStock} left` : "In stock"}
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
