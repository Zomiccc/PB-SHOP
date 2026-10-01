import { db } from "./db";
import type { SkinTemplate } from "./skin-template";

/**
 * Custom Skins data (v4 §9–§11). Customers only ever see active brands / models, active skin types, and
 * enabled designs that are available for all models or assigned to theirs — there is no customer upload.
 */

export const TEMPLATE_FIELDS = ["widthMm", "heightMm", "cornerMm", "cameraX", "cameraY", "cameraW", "cameraH", "cameraCornerMm", "lenses", "bodyHex"] as const;

export const toTemplate = (m: SkinTemplate): SkinTemplate => Object.fromEntries(TEMPLATE_FIELDS.map((k) => [k, m[k]])) as SkinTemplate;

/** Designs a model can show: enabled, and either for every model or assigned to this one. */
export const designsFor = (modelId: string) => ({ active: true, OR: [{ allModels: true }, { models: { some: { id: modelId } } }] });

/** Brands with at least one active model, each with its active models (for the brand search → model dropdown). */
export async function skinCatalogue() {
  const [brands, forAll] = await Promise.all([
    db.skinBrand.findMany({
      where: { active: true, models: { some: { active: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        models: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true, slug: true, _count: { select: { skins: { where: { active: true, allModels: false } } } } },
        },
      },
    }),
    db.skin.count({ where: { active: true, allModels: true } }),
  ]);
  return brands.map((b) => ({ name: b.name, slug: b.slug, models: b.models.map((m) => ({ name: m.name, slug: m.slug, designs: forAll + m._count.skins })) }));
}

/** One model's page: its template, the designs it can show, and the active skin types with prices. */
export async function skinModelPage(brandSlug: string, modelSlug: string) {
  const brand = await db.skinBrand.findFirst({ where: { slug: brandSlug, active: true } });
  if (!brand) return null;
  const model = await db.phoneModel.findFirst({ where: { brandId: brand.id, slug: modelSlug, active: true } });
  if (!model) return null;
  const [skins, types] = await Promise.all([
    db.skin.findMany({ where: designsFor(model.id), orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    activeSkinTypes(),
  ]);
  return { brand, model, skins, types };
}

export function activeSkinTypes() {
  return db.skinType.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });
}

/** Admin: every brand with its models + templates (for the skin form's model picker and previews). */
export async function adminSkinBrands() {
  const brands = await db.skinBrand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { models: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } });
  return brands.map((b) => ({ id: b.id, name: b.name, models: b.models.map((m) => ({ id: m.id, name: m.name, template: toTemplate(m) })) }));
}
