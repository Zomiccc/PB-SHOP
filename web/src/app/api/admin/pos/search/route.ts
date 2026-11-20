import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/staff";
import { toPosItem } from "@/lib/pos-item";

/**
 * POS search by name (Nov 2026: most products have no barcode). Every typed word must appear in the product
 * name, brand, model number, SKU, barcode, storage or colour. In-stock items first, at most 15 results.
 */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const words = (new URL(req.url).searchParams.get("q") ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length || words.join("").length < 2) return NextResponse.json({ results: [] });

  const variants = await db.variant.findMany({
    where: { active: true, product: { active: true, type: { not: "SKIN" } } },
    include: { product: { select: { name: true, brand: true, condition: true, compatibleModel: true, specs: true } } },
  });
  const results = variants
    .filter((v) => {
      const hay = [v.product.name, v.product.brand, v.product.compatibleModel, v.product.specs, v.sku, v.barcode, v.imei, v.partNumber, v.storage, v.ram, v.color, v.product.condition === "USED" ? "used" : "new"].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => Number(b.stockQty > 0) - Number(a.stockQty > 0) || a.product.name.localeCompare(b.product.name))
    .slice(0, 15)
    .map((v) => toPosItem(v, staff.role === "SUPER_ADMIN"));
  return NextResponse.json({ results });
}
