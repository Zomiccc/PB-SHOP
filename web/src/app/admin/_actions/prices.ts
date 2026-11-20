"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { applyPriceChange, type PriceChange } from "@/lib/prices";
import type { FormState } from "./auth";
import { run, str } from "./util";

/**
 * Accessory prices & offers (Nov 2026): raise or lower the price of the ticked accessories by a % or an amount,
 * or add / remove a % off offer. Percentages are rounded to the nearest Rs 10. One audit entry lists every change.
 */
export async function bulkPriceAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const ids = f.getAll("ids").map(String).filter(Boolean);
    if (!ids.length) throw new Error("Tick the items to change");
    const change = str(f, "change") as PriceChange;
    if (!["UP_PCT", "DOWN_PCT", "UP_RS", "DOWN_RS", "OFFER_PCT", "OFFER_OFF"].includes(change)) throw new Error("Choose what to change");
    const value = change === "OFFER_OFF" ? 0 : Number(str(f, "value"));
    if (change !== "OFFER_OFF" && (!Number.isFinite(value) || value <= 0)) throw new Error("Enter the amount or percentage");
    if (change.endsWith("_PCT") && value >= 90) throw new Error("Percentage must be below 90");
    const variants = await db.variant.findMany({ where: { id: { in: ids }, product: { type: "ACCESSORY" } }, include: { product: { select: { name: true } } } });
    const changes: { item: string; sku: string; before: { price: number; salePrice: number | null }; after: { price: number; salePrice: number | null } }[] = [];
    await db.$transaction(async (tx) => {
      for (const v of variants) {
        const next = applyPriceChange(v, change, value);
        if (next.price === v.price && next.salePrice === v.salePrice) continue;
        // The salesman's lowest price can never be above the selling price.
        const sell = next.salePrice ?? next.price;
        await tx.variant.update({ where: { id: v.id }, data: { ...next, floorPrice: v.floorPrice != null ? Math.min(v.floorPrice, sell) : null } });
        changes.push({ item: v.product.name, sku: v.sku, before: { price: v.price, salePrice: v.salePrice }, after: next });
      }
      if (changes.length) await audit({ staffId: staff.id, action: "PRICE_CHANGED", entityType: "VARIANT", recordLabel: `Accessory prices: ${changes.length} item(s) — ${change} ${value || ""}`.trim(), before: { items: changes.map((c) => ({ sku: c.sku, ...c.before })) }, after: { items: changes.map((c) => ({ sku: c.sku, ...c.after })) } }, tx);
    });
    revalidatePath("/admin/accessory-prices");
    revalidatePath("/accessories");
    return changes.length ? `Updated ${changes.length} item${changes.length === 1 ? "" : "s"}` : "No prices changed";
  });
}
