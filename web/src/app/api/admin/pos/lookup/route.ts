import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/staff";

/** Barcode / SKU lookup for the POS (§6, §19): exact match, instant. */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });
  const v = await db.variant.findFirst({
    where: { OR: [{ barcode: code }, { sku: code.toUpperCase() }] },
    include: { product: true },
  });
  if (!v) return NextResponse.json({ error: `No product with barcode/SKU “${code}”` }, { status: 404 });
  return NextResponse.json({
    variantId: v.id,
    name: `${v.product.name}${v.product.condition === "USED" ? " (Used)" : ""}`,
    detail: [v.storage, v.color, v.grade ? `Grade ${v.grade}` : null].filter(Boolean).join(" · "),
    sku: v.sku,
    barcode: v.barcode,
    price: v.salePrice ?? v.price,
    stock: v.stockQty,
    active: v.active && v.product.active,
    allowBackorder: v.allowBackorder,
  });
}
