import { db } from "./db";
import { parseJson } from "./format";
import { devicePhotoList } from "./device-photo-list";

export type ProductType = "PHONE" | "TABLET" | "ACCESSORY" | "PART";
/** Phones and tablets share device features: 3D viewer, grades, installments. */
export const isDevice = (type: string) => type === "PHONE" || type === "TABLET";

export type VariantDTO = {
  id: string;
  sku: string;
  storage: string | null;
  ram: string | null;
  color: string | null;
  colorHex: string | null;
  /** Photo of this colour, shown when it's picked on the product page. */
  imageUrl: string | null;
  /** Used devices: this phone's own six-side photos (front, back, left, right, top, bottom). */
  photos: { side: string; label: string; url: string }[];
  price: number;
  salePrice: number | null;
  stockQty: number;
  lowStockThreshold: number;
  grade: string | null;
  batteryHealth: number | null;
  conditionNotes: string | null;
  warrantyInfo: string | null;
  returnInfo: string | null;
};

export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  type: ProductType;
  condition: "NEW" | "USED";
  accessoryType: string | null;
  description: string;
  specs: Record<string, string>;
  images: string[];
  finishHex: string | null;
  featured: boolean;
  model3dUrl: string | null;
  model3dTextures: Record<string, string> | null;
  sketchfabUid: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: VariantDTO[];
  // derived
  fromPrice: number;
  /** The normal price, crossed out, when the cheapest option is on offer. */
  wasPrice: number | null;
  totalStock: number;
};

const include = { variants: { where: { active: true }, orderBy: { price: "asc" as const } } };

type Row = Awaited<ReturnType<typeof db.product.findFirstOrThrow<{ include: typeof include }>>>;

function toDTO(p: Row): ProductDTO {
  const variants: VariantDTO[] = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    storage: v.storage,
    ram: v.ram,
    color: v.color,
    colorHex: v.colorHex,
    imageUrl: v.imageUrl,
    photos: devicePhotoList(v.photos),
    price: v.price,
    // Only a real offer (below the normal price) counts; removing the offer makes it disappear everywhere.
    salePrice: v.salePrice != null && v.salePrice < v.price ? v.salePrice : null,
    stockQty: v.stockQty,
    lowStockThreshold: v.lowStockThreshold,
    grade: v.grade,
    batteryHealth: v.batteryHealth,
    conditionNotes: v.conditionNotes,
    warrantyInfo: v.warrantyInfo,
    returnInfo: v.returnInfo,
  }));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    type: p.type as ProductType,
    condition: p.condition as ProductDTO["condition"],
    accessoryType: p.accessoryType,
    description: p.description,
    specs: parseJson(p.specs, {}),
    images: parseJson(p.images, []),
    finishHex: p.finishHex,
    featured: p.featured,
    model3dUrl: p.model3dKind === "GLB" ? p.model3dUrl : null,
    model3dTextures: p.model3dKind === "TEXTURED" ? parseJson<Record<string, string> | null>(p.model3dTextures, null) : null,
    sketchfabUid: p.sketchfabUid,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    variants,
    fromPrice: variants.length ? Math.min(...variants.map((v) => v.salePrice ?? v.price)) : 0,
    wasPrice: (() => {
      const cheapest = [...variants].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price))[0];
      return cheapest?.salePrice != null ? cheapest.price : null;
    })(),
    totalStock: variants.reduce((s, v) => s + v.stockQty, 0),
  };
}

/** Spare parts are stock for the repair lab and the till only — never listed in the online shop. */
const SHOP = { active: true, type: { not: "PART" } } as const;

export async function listProducts(where: { type?: ProductType; condition?: "NEW" | "USED"; featured?: boolean } = {}) {
  const rows = await db.product.findMany({
    where: { ...SHOP, ...where },
    include,
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(toDTO);
}

export async function getProductBySlug(slug: string) {
  const row = await db.product.findFirst({ where: { slug, ...SHOP }, include });
  return row ? toDTO(row) : null;
}

export async function getRelated(p: ProductDTO, take = 4) {
  const rows = await db.product.findMany({
    where: { active: true, id: { not: p.id }, type: p.type, ...(isDevice(p.type) ? { condition: p.condition } : {}) },
    include,
    take: 12,
  });
  const list = rows.map(toDTO);
  // Same brand first, then the rest.
  return [...list.filter((x) => x.brand === p.brand), ...list.filter((x) => x.brand !== p.brand)].slice(0, take);
}

/** Lightweight shape sent to client components (catalogue grid / filters). */
export type CatalogItem = Pick<ProductDTO, "slug" | "name" | "brand" | "type" | "condition" | "accessoryType" | "finishHex" | "featured" | "fromPrice" | "wasPrice" | "totalStock"> & {
  /** Unique card key: product id, or product+variant for used devices. */
  id: string;
  /** Deep link to the product page (includes ?v= for a specific used device). */
  href: string;
  storages: string[];
  rams: string[];
  colors: { name: string; hex: string | null }[];
  /** Exactly one grade for a used-device card (master brief §8); null for new items. */
  grade: string | null;
  bestBattery: number | null;
  onSale: boolean;
  /** First product photo, when the product has real photos (otherwise the card draws the device). */
  image: string | null;
  createdOrder: number;
};

// A calm, balanced look for product cards (client feedback, Nov 2026): show each new phone in a neutral finish
// — titanium / silver / grey, then black, then white — when that colour has its own photo. Colours stay accurate:
// the product page still shows every colour's real photo.
const NEUTRAL = [/titanium|silver|grey|gray|glacier|frost|graphite|moonstone|meteor/i, /black|midnight|abyss|night|shadow|sleek|space|rock|torino|bromo|starlit|sandstone/i, /white|pearl|ice|feather|gilded/i];

/** The photo a product card shows. */
export function cardPhoto(p: Pick<ProductDTO, "images" | "condition" | "variants">) {
  if (p.condition !== "USED") {
    for (const rx of NEUTRAL) {
      const v = p.variants.find((x) => x.imageUrl && x.color && rx.test(x.color));
      if (v) return v.imageUrl;
    }
  }
  return p.images[0] ?? null;
}

const uniq = <T,>(xs: (T | null | undefined)[]) => [...new Set(xs.filter((x): x is T => x != null && x !== ""))];

/**
 * New products = one card per product. Used devices = one card per SKU, so every card shows
 * a single grade and links straight to that exact device.
 */
export function toCatalogItems(products: ProductDTO[]): CatalogItem[] {
  const out: CatalogItem[] = [];
  products.forEach((p) => {
    const base = {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      type: p.type,
      condition: p.condition,
      accessoryType: p.accessoryType,
      finishHex: p.finishHex,
      featured: p.featured,
      image: cardPhoto(p),
    };
    if (p.condition === "USED") {
      for (const v of p.variants) {
        out.push({
          ...base,
          id: `${p.id}:${v.id}`,
          href: `/product/${p.slug}?v=${v.id}`,
          finishHex: v.colorHex ?? p.finishHex,
          fromPrice: v.salePrice ?? v.price,
          wasPrice: v.salePrice != null ? v.price : null,
          totalStock: v.stockQty,
          storages: uniq([v.storage]),
          rams: uniq([v.ram]),
          colors: v.color ? [{ name: v.color, hex: v.colorHex }] : [],
          grade: v.grade,
          bestBattery: v.batteryHealth,
          onSale: v.salePrice != null,
          image: v.photos[0]?.url ?? base.image,
          createdOrder: out.length,
        });
      }
      return;
    }
    out.push({
      ...base,
      id: p.id,
      href: `/product/${p.slug}`,
      fromPrice: p.fromPrice,
      wasPrice: p.wasPrice,
      totalStock: p.totalStock,
      storages: uniq(p.variants.map((v) => v.storage)),
      rams: uniq(p.variants.map((v) => v.ram)),
      colors: [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, { name: v.color!, hex: v.colorHex }])).values()],
      grade: null,
      bestBattery: null,
      onSale: p.variants.some((v) => v.salePrice != null),
      createdOrder: out.length,
    });
  });
  return out;
}
