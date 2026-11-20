/** Accessory bulk price changes (Nov 2026). */
export type PriceChange = "UP_PCT" | "DOWN_PCT" | "UP_RS" | "DOWN_RS" | "OFFER_PCT" | "OFFER_OFF";
const r10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);

/** The new normal price and website offer price for one item. Pure, so it is easy to check. */
export function applyPriceChange(v: { price: number; salePrice: number | null }, change: PriceChange, value: number) {
  let price = v.price;
  let salePrice = v.salePrice;
  if (change === "UP_PCT") price = r10(price * (1 + value / 100));
  if (change === "DOWN_PCT") price = r10(price * (1 - value / 100));
  if (change === "UP_RS") price = Math.round(price + value);
  if (change === "DOWN_RS") price = Math.max(1, Math.round(price - value));
  if (change === "OFFER_PCT") salePrice = r10(price * (1 - value / 100));
  if (change === "OFFER_OFF") salePrice = null;
  // A price change keeps an existing offer at the same % off.
  if (!change.startsWith("OFFER") && v.salePrice != null) salePrice = r10(price * (v.salePrice / v.price));
  if (salePrice != null && salePrice >= price) salePrice = null;
  return { price, salePrice };
}

