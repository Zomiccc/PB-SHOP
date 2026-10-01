import type { Prisma } from "@prisma/client";
import { getSetting } from "./settings";
import { designMode, skinPrice } from "./skin-template";
import { designsFor } from "./skins";

/**
 * Custom skins in the cart / checkout (client request: "add to cart and checkout everywhere"). Each skin type is
 * backed by a variant of one hidden, made-to-order product (type SKIN), so orders, receipts, payments, points and
 * reports work unchanged. The line's name and price are always rebuilt here from the database — never trusted
 * from the browser. Skins are made to order, so they never touch stock counts (see src/lib/inventory.ts).
 */

type Tx = Prisma.TransactionClient;

export type SkinLineInput = { typeId: string; modelId: string; designId: string | null; cameraCover: boolean; ownImage?: string | null };

export class SkinOrderError extends Error {}

const SKIN_PRODUCT_SLUG = "custom-skins-made-to-order";

/** The hidden variant for a skin type (created the first time it's ordered), kept at the type's price for the till. */
async function skinVariant(tx: Tx, type: { id: string; name: string; price: number }) {
  const product =
    (await tx.product.findUnique({ where: { slug: SKIN_PRODUCT_SLUG } })) ??
    (await tx.product.create({
      data: { slug: SKIN_PRODUCT_SLUG, name: "Custom skin", brand: "PB Mobiles", type: "SKIN", condition: "NEW", description: "Made-to-order custom skins (managed in Admin → Custom skins).", active: false, loyaltyEligible: true },
    }));
  const sku = `SKIN-${type.id}`;
  const existing = await tx.variant.findUnique({ where: { sku } });
  if (existing) {
    if (existing.price !== type.price || existing.color !== type.name) await tx.variant.update({ where: { id: existing.id }, data: { price: type.price, color: type.name } });
    return existing;
  }
  return tx.variant.create({ data: { productId: product.id, sku, barcode: `SKIN${type.id}`.toUpperCase(), color: type.name, price: type.price, stockQty: 0, allowBackorder: true, lowStockThreshold: 0 } });
}

/** Validates a skin line and returns the order line (name, price, variant). */
export async function resolveSkinLine(tx: Tx, input: SkinLineInput) {
  const [type, model, cfg] = await Promise.all([
    tx.skinType.findFirst({ where: { id: input.typeId, active: true } }),
    tx.phoneModel.findFirst({ where: { id: input.modelId, active: true, brand: { active: true } }, include: { brand: true } }),
    getSetting("customSkins", tx),
  ]);
  if (!cfg.enabled) throw new SkinOrderError("Custom skins aren't available right now.");
  if (!type) throw new SkinOrderError("That skin type is no longer available — please choose it again.");
  if (!model) throw new SkinOrderError("That phone model is no longer available — please choose it again.");
  const mode = designMode(type.designMode);
  let design: { id: string; name: string; price: number } | null = null;
  if (mode === "DESIGN" && input.designId) {
    design = await tx.skin.findFirst({ where: { id: input.designId, ...designsFor(model.id) }, select: { id: true, name: true, price: true } });
    if (!design) throw new SkinOrderError("That design is no longer available for your phone — please choose another.");
  }
  const own = mode !== "PLAIN" && !design && !!input.ownImage;
  if (mode === "DESIGN" && !design && !own) throw new SkinOrderError(`Choose a design for the ${type.name}.`);
  const cover = input.cameraCover && mode !== "PLAIN";
  const unitPrice = skinPrice(type, design, cover, cfg.cameraCoverPrice);
  const variant = await skinVariant(tx, type);
  const details = [`${model.brand.name} ${model.name}`, design ? `${design.name} design` : own ? "own design (attached)" : mode === "PHOTO" ? "own photo (to send)" : null, mode === "PLAIN" ? null : cover ? "camera covered" : "camera open"].filter(Boolean).join(" · ");
  return { variantId: variant.id, sku: variant.sku, name: `${type.name} — ${details}`, unitPrice, own };
}

/** "data:image/jpeg;base64,…" → a File (customer's own design, attached privately to the order). */
export function ownImageFile(dataUrl: string, name: string) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  return new File([new Uint8Array(bytes)], `${name}.${m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg"}`, { type: m[1] });
}
