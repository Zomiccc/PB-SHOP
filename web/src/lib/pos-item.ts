export type PosItemRow = { id: string; sku: string; barcode: string; storage: string | null; ram: string | null; color: string | null; grade: string | null; price: number; salePrice: number | null; floorPrice: number | null; stockQty: number; active: boolean; allowBackorder: boolean; product: { name: string; condition: string } };

/** One sellable line for the till: the normal price, and the lowest a salesman may go to (owner: no limit). */
export function toPosItem(v: PosItemRow & { product: { active?: boolean } }, owner: boolean) {
  const price = v.salePrice ?? v.price;
  return {
    variantId: v.id,
    name: `${v.product.name}${v.product.condition === "USED" ? " (Used)" : ""}`,
    detail: [v.storage, v.ram ? `${v.ram} RAM` : null, v.color, v.grade ? `Grade ${v.grade}` : null].filter(Boolean).join(" · "),
    sku: v.sku,
    barcode: v.barcode,
    price,
    floor: owner ? 0 : Math.min(price, v.floorPrice ?? price),
    stock: v.stockQty,
    active: v.active && v.product.active !== false,
    allowBackorder: v.allowBackorder,
  };
}
