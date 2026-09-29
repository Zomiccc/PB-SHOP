/**
 * Phone brands for the installment picker. Shown as brand-coloured wordmark tiles. To use an official
 * logo instead, add the file to /public/brands/ (e.g. /brands/infinix.svg) and set `logo` here —
 * use artwork you're licensed to use (normally from the brand's retailer / press kit).
 */
export type Brand = { slug: string; name: string; bg: string; fg: string; logo?: string; italic?: boolean; lower?: boolean };

export const INSTALLMENT_BRANDS: Brand[] = [
  { slug: "infinix", name: "Infinix", bg: "#0b0b0b", fg: "#b6f23c" },
  { slug: "tecno", name: "TECNO", bg: "#0a5bff", fg: "#ffffff" },
  { slug: "itel", name: "itel", bg: "#e60012", fg: "#ffffff", lower: true },
  { slug: "realme", name: "realme", bg: "#ffc915", fg: "#111111", lower: true },
  { slug: "nubia", name: "nubia", bg: "#141414", fg: "#ff2d3c", lower: true },
  { slug: "oppo", name: "OPPO", bg: "#0b8a5b", fg: "#ffffff" },
  { slug: "villaon", name: "Villaon", bg: "#1b1f3b", fg: "#f5c542" },
  { slug: "vivo", name: "vivo", bg: "#415fff", fg: "#ffffff", lower: true },
  { slug: "samsung", name: "SAMSUNG", bg: "#1428a0", fg: "#ffffff" },
  { slug: "xiaomi", name: "Xiaomi", bg: "#ff6900", fg: "#ffffff" },
  { slug: "apple", name: "Apple", bg: "#f2f2f2", fg: "#111111" },
];

export const brandBySlug = (slug?: string | null) => INSTALLMENT_BRANDS.find((b) => b.slug === slug);

/** Brand slug for a stored brand name, or one detected in a model name ("Infinix Hot 50" → "infinix"). */
export function brandSlugFor(brand?: string | null, model?: string | null) {
  const hay = `${brand ?? ""} ${model ?? ""}`.toLowerCase();
  const hit = INSTALLMENT_BRANDS.find((b) => new RegExp(`\\b${b.slug}\\b`).test(hay));
  if (hit) return hit.slug;
  if (/\biphone\b|\bipad\b/.test(hay)) return "apple";
  if (/\bgalaxy\b/.test(hay)) return "samsung";
  if (/\bredmi\b|\bpoco\b/.test(hay)) return "xiaomi";
  if (/\bspark\b|\bcamon\b|\bpova\b/.test(hay)) return "tecno";
  if (/\bhot \d|\bnote \d{2}\b|\bzero \d/.test(hay)) return "infinix";
  return brand ? brand.toLowerCase().replace(/[^a-z0-9]+/g, "-") : null;
}
