import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const statics = ["", "/new-phones", "/used-phones", "/tablets", "/accessories", "/repair", "/about", "/contact", "/loyalty", "/installments", "/custom-skins", "/terms", "/privacy", "/returns"];
  const products = await db.product.findMany({ where: { active: true, type: { not: "PART" } }, select: { slug: true, updatedAt: true } });
  const skinModels = await db.phoneModel.findMany({ where: { active: true, brand: { active: true } }, select: { slug: true, updatedAt: true, brand: { select: { slug: true } } } });
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...skinModels.map((m) => ({ url: `${base}/custom-skins/${m.brand.slug}/${m.slug}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
