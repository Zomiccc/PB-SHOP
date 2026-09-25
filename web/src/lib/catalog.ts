import { db } from "./db";
import { parseJson } from "./format";

export type VariantDTO = {
  id: string;
  sku: string;
  storage: string | null;
  color: string | null;
  colorHex: string | null;
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
  type: "PHONE" | "ACCESSORY";
  condition: "NEW" | "USED";
  accessoryType: string | null;
  description: string;
  specs: Record<string, string>;
  images: string[];
  finishHex: string | null;
  featured: boolean;
  careCardEligible: boolean;
  model3dUrl: string | null;
  model3dTextures: Record<string, string> | null;
  sketchfabUid: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: VariantDTO[];
  // derived
  fromPrice: number;
  totalStock: number;
};

const include = { variants: { where: { active: true }, orderBy: { price: "asc" as const } } };

type Row = Awaited<ReturnType<typeof db.product.findFirstOrThrow<{ include: typeof include }>>>;

function toDTO(p: Row): ProductDTO {
  const variants: VariantDTO[] = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    storage: v.storage,
    color: v.color,
    colorHex: v.colorHex,
    price: v.price,
    salePrice: v.salePrice,
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
    type: p.type as ProductDTO["type"],
    condition: p.condition as ProductDTO["condition"],
    accessoryType: p.accessoryType,
    description: p.description,
    specs: parseJson(p.specs, {}),
    images: parseJson(p.images, []),
    finishHex: p.finishHex,
    featured: p.featured,
    careCardEligible: p.careCardEligible,
    model3dUrl: p.model3dKind === "GLB" ? p.model3dUrl : null,
    model3dTextures: p.model3dKind === "TEXTURED" ? parseJson<Record<string, string> | null>(p.model3dTextures, null) : null,
    sketchfabUid: p.sketchfabUid,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    variants,
    fromPrice: variants.length ? Math.min(...variants.map((v) => v.salePrice ?? v.price)) : 0,
    totalStock: variants.reduce((s, v) => s + v.stockQty, 0),
  };
}

export async function listProducts(where: { type?: "PHONE" | "ACCESSORY"; condition?: "NEW" | "USED"; featured?: boolean } = {}) {
  const rows = await db.product.findMany({
    where: { active: true, ...where },
    include,
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(toDTO);
}

export async function getProductBySlug(slug: string) {
  const row = await db.product.findFirst({ where: { slug, active: true }, include });
  return row ? toDTO(row) : null;
}

export async function getRelated(p: ProductDTO, take = 4) {
  const rows = await db.product.findMany({
    where: { active: true, id: { not: p.id }, type: p.type, ...(p.type === "PHONE" ? { condition: p.condition } : {}) },
    include,
    take: 12,
  });
  const list = rows.map(toDTO);
  // Same brand first, then the rest.
  return [...list.filter((x) => x.brand === p.brand), ...list.filter((x) => x.brand !== p.brand)].slice(0, take);
}

/** Lightweight shape sent to client components (catalogue grid / filters). */
export type CatalogItem = Pick<ProductDTO, "id" | "slug" | "name" | "brand" | "type" | "condition" | "accessoryType" | "finishHex" | "featured" | "fromPrice" | "totalStock"> & {
  storages: string[];
  colors: { name: string; hex: string | null }[];
  grades: string[];
  bestBattery: number | null;
  onSale: boolean;
  createdOrder: number;
};

export function toCatalogItems(products: ProductDTO[]): CatalogItem[] {
  return products.map((p, i) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    type: p.type,
    condition: p.condition,
    accessoryType: p.accessoryType,
    finishHex: p.finishHex,
    featured: p.featured,
    fromPrice: p.fromPrice,
    totalStock: p.totalStock,
    storages: [...new Set(p.variants.map((v) => v.storage).filter(Boolean) as string[])],
    colors: [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, { name: v.color!, hex: v.colorHex }])).values()],
    grades: [...new Set(p.variants.map((v) => v.grade).filter(Boolean) as string[])],
    bestBattery: p.variants.reduce<number | null>((m, v) => (v.batteryHealth != null && (m == null || v.batteryHealth > m) ? v.batteryHealth : m), null),
    onSale: p.variants.some((v) => v.salePrice != null),
    createdOrder: i,
  }));
}
