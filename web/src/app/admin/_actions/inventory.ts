"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { suggestCodes } from "@/lib/barcode";
import { assertVariantGrade } from "@/lib/grade";
import { assertImeiFree, receiveStock } from "@/lib/inventory";
import { saveUpload, StorageUnavailableError } from "@/lib/storage";
import { slugify } from "@/lib/format";
import { ACCESSORY_TYPES, ACCESSORY_WARRANTY, PART_TYPES, USED_WARRANTY } from "@/lib/constants";
import type { FormState } from "./auth";
import { int, optStr, run, str } from "./util";

export type ItemCategory = "PHONE" | "TABLET" | "PART" | "ACCESSORY";

/**
 * "Add Item" (master brief §10): one form per category creates the product (or adds a SKU to an
 * existing one), assigns the Item Number / SKU + barcode, records the purchase price, and books the
 * opening quantity as a PURCHASE movement with the employee and time.
 */
export async function createItemAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let productId: string | null = null;
  let photosSkipped = false;
  const res = await run(async () => {
    const category = str(f, "category") as ItemCategory;
    if (!["PHONE", "TABLET", "PART", "ACCESSORY"].includes(category)) throw new Error("Choose a category");
    const device = category === "PHONE" || category === "TABLET";
    const condition = device && str(f, "condition") === "USED" ? "USED" : "NEW";

    const name = str(f, "name");
    const brand = str(f, "brand") || (category === "PART" ? "Generic" : "");
    if (name.length < 2) throw new Error(category === "PART" ? "Enter the part name" : category === "ACCESSORY" ? "Enter the article / item name" : "Enter the model");
    if (!brand) throw new Error("Enter the company / brand");

    const salePrice = int(f, "salePrice");
    const costPrice = int(f, "costPrice");
    if (!salePrice || salePrice <= 0) throw new Error("Enter the sale price");
    if (costPrice == null || costPrice < 0) throw new Error("Enter the purchase price");
    const imei = device ? optStr(f, "imei")?.replace(/\s/g, "") ?? null : null;
    if (imei && !/^[A-Za-z0-9-]{6,20}$/.test(imei)) throw new Error("IMEI should be 6–20 letters or digits");
    const grade = device ? assertVariantGrade(condition, optStr(f, "grade")) : null;
    // A used device (or anything with an IMEI) is one physical unit.
    const qty = condition === "USED" || imei ? 1 : int(f, "quantity") ?? 0;
    if (qty < 0) throw new Error("Quantity can't be negative");

    const files = f.getAll("images").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 6);
    const images: string[] = [];
    for (const file of files) {
      try {
        images.push(await saveUpload(file, "products"));
      } catch (e) {
        // Demo servers without object storage: save the item, skip the photos (they can be added later).
        if (!(e instanceof StorageUnavailableError)) throw e;
        photosSkipped = true;
        break;
      }
    }

    const partType = category === "PART" ? (str(f, "partType") in PART_TYPES ? str(f, "partType") : "OTHER") : null;
    const accessoryType = category === "ACCESSORY" ? (str(f, "accessoryType") in ACCESSORY_TYPES ? str(f, "accessoryType") : "OTHER") : null;

    productId = await db.$transaction(async (tx) => {
      await assertImeiFree(tx, imei);
      const codes = await suggestCodes(tx);
      const sku = (str(f, "sku") || codes.sku).toUpperCase();
      const barcode = str(f, "barcode") || codes.barcode;
      const clash = await tx.variant.findFirst({ where: { OR: [{ sku }, { barcode }] } });
      if (clash) throw new Error(clash.sku === sku ? `Item Number ${sku} is already used` : `Barcode ${barcode} is already used`);

      // Same model + condition → add a SKU to the existing product instead of a duplicate listing.
      let product = await tx.product.findFirst({ where: { type: category, condition, name, brand } });
      if (!product) {
        let slug = slugify(`${name}${condition === "USED" ? "-used" : ""}`);
        if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
        product = await tx.product.create({
          data: {
            slug,
            name,
            brand,
            type: category,
            condition,
            accessoryType,
            partType,
            compatibleModel: category === "PART" ? optStr(f, "compatibleModel") : null,
            description: str(f, "description"),
            images: JSON.stringify(images),
            loyaltyEligible: category === "PHONE",
            // New devices go live straight away; the 3D model and photos can follow.
            active: true,
          },
        });
        await audit({ staffId: staff.id, action: "ITEM_CREATED", entityType: "PRODUCT", entityId: product.id, recordLabel: `${product.name} (${category})`, after: { category, condition, brand, name } }, tx);
      } else if (images.length) {
        const prev = JSON.parse(product.images || "[]") as string[];
        await tx.product.update({ where: { id: product.id }, data: { images: JSON.stringify([...prev, ...images]) } });
      }

      const v = await tx.variant.create({
        data: {
          productId: product.id,
          sku,
          barcode,
          imei,
          partNumber: optStr(f, "partNumber"),
          storage: device ? optStr(f, "storage") : null,
          ram: category === "TABLET" ? optStr(f, "ram") : null,
          color: optStr(f, "color"),
          price: salePrice,
          costPrice,
          grade,
          batteryHealth: device ? int(f, "batteryHealth") : null,
          conditionNotes: optStr(f, "notes"),
          lowStockThreshold: condition === "USED" ? 0 : int(f, "lowStockThreshold") ?? (category === "PART" || category === "ACCESSORY" ? 3 : 2),
          warrantyInfo: condition === "USED" ? USED_WARRANTY : category === "ACCESSORY" ? ACCESSORY_WARRANTY : null,
          stockQty: 0,
        },
      });
      await audit({ staffId: staff.id, action: "VARIANT_CREATED", entityType: "VARIANT", entityId: v.id, recordLabel: `${product.name} / ${sku}`, after: { sku, imei, grade, price: salePrice, costPrice } }, tx);
      if (qty > 0) await receiveStock(tx, { variantId: v.id, qty, unitCost: costPrice, staffId: staff.id, reference: optStr(f, "reference"), notes: "Opening purchase" });
      return product.id;
    });
  });
  if (productId) {
    revalidatePath("/admin/inventory");
    redirect(`/admin/products/${productId}?created=1${photosSkipped ? "&photos=skipped" : ""}${str(f, "needs3d") === "on" ? "#model-3d" : ""}`);
  }
  return res;
}

/** Stock bought in for an existing item: quantity, purchase price, supplier reference. */
export async function receiveStockAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const qty = int(f, "qty");
    if (!qty || qty <= 0) throw new Error("Enter how many were purchased");
    const v = await db.$transaction((tx) => receiveStock(tx, { variantId: str(f, "variantId"), qty, unitCost: int(f, "unitCost"), staffId: staff.id, reference: optStr(f, "reference"), notes: optStr(f, "notes") }));
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${v.productId}`);
    return `Received ${qty} — stock is now ${v.stockQty}`;
  });
}
