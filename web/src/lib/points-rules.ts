/**
 * Standard PB Points awarding criteria (Passport requirements v4 §3). Pure — used on the server and in
 * the browser (product page / checkout estimates).
 *
 *   Repairs & accessories   1 point per Rs 100 spent (spare parts sold at the till count as accessories)
 *   Phone Rs 10,000–29,999   50 points
 *   Phone Rs 30,000–49,999  100 points
 *   Phone Rs 50,000–79,999  150 points
 *   Phone Rs 80,000+        200 points
 *   Installment phones      same phone tiers, on the phone's value
 *
 * The tiers and the spend rate are owner-editable in Admin → Settings (Setting "passport").
 * Tablets aren't listed in the criteria, so they earn nothing (unchanged).
 */

export type PointsRules = { rupeesPerPoint: number; phoneTiers: string };

export type Tier = { from: number; points: number };

/**
 * "10000:50, 30000:100" → [{from: 10000, points: 50}, …] sorted by price. Prices may be typed with
 * thousands commas ("80,000:200"); malformed entries are ignored.
 */
export function parseTiers(spec: string): Tier[] {
  return [...(spec ?? "").matchAll(/(\d[\d,]*)\s*:\s*(\d+)/g)]
    .map((m) => ({ from: Number(m[1].replace(/,/g, "")), points: Number(m[2]) }))
    .filter((t) => Number.isFinite(t.from) && Number.isFinite(t.points))
    .sort((a, b) => a.from - b.from);
}

/** Points for one phone at this price (the highest tier it reaches; 0 below the lowest tier). */
export function phoneTierPoints(price: number, tiers: Tier[] | string) {
  const list = typeof tiers === "string" ? parseTiers(tiers) : tiers;
  let pts = 0;
  for (const t of list) if (price >= t.from) pts = t.points;
  return pts;
}

/** 1 point per Rs 100 spent (rate configurable), whole points only. */
export function spendPoints(amount: number, rupeesPerPoint: number) {
  if (rupeesPerPoint <= 0 || amount <= 0) return 0;
  return Math.floor(amount / rupeesPerPoint);
}

/** Readable tier list for customer pages: "Rs 10,000–29,999 → 50". */
export function describeTiers(tiers: Tier[] | string) {
  const list = typeof tiers === "string" ? parseTiers(tiers) : tiers;
  const rs = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
  return list.map((t, i) => ({ label: list[i + 1] ? `${rs(t.from)}–${(list[i + 1].from - 1).toLocaleString("en-PK")}` : `${rs(t.from)}+`, points: t.points }));
}
