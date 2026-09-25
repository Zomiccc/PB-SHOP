import { db } from "./db";

/** EAN-13 check digit for a 12-digit base. */
export function ean13(base12: string) {
  const digits = base12.split("").map(Number);
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0);
  return base12 + ((10 - (sum % 10)) % 10);
}

/**
 * Next free SKU (PB-0001…) and in-store EAN-13 barcode. Prefix 20–29 is reserved by GS1 for
 * internal/in-store use, so these never collide with manufacturer barcodes (§6). Where a device
 * already has a manufacturer EAN, staff can type or scan it into the barcode field instead.
 */
export async function suggestCodes() {
  const all = await db.variant.findMany({ select: { sku: true, barcode: true } });
  const nums = all.map((v) => Number(v.sku.match(/^PB-(\d+)$/)?.[1] ?? 0));
  const next = Math.max(0, ...nums) + 1;
  const used = new Set(all.map((v) => v.barcode));
  let n = next;
  let barcode = ean13(`21${String(n).padStart(10, "0")}`);
  while (used.has(barcode)) barcode = ean13(`21${String(++n).padStart(10, "0")}`);
  return { sku: `PB-${String(next).padStart(4, "0")}`, barcode };
}
