"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff, clientIp } from "@/lib/staff";
import { adjustStock } from "@/lib/inventory";
import { saveUpload } from "@/lib/storage";
import { slugify, parseJson } from "@/lib/format";
import type { FormState } from "./auth";
import { bool, diff, int, optStr, run, str } from "./util";

function productData(f: FormData) {
  const type = str(f, "type") === "ACCESSORY" ? "ACCESSORY" : "PHONE";
  const specsText = str(f, "specs");
  const specs: Record<string, string> = {};
  for (const line of specsText.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const name = str(f, "name");
  if (name.length < 2) throw new Error("Product name is required");
  if (!str(f, "brand")) throw new Error("Brand is required");
  return {
    name,
    brand: str(f, "brand"),
    type,
    condition: type === "ACCESSORY" ? "NEW" : str(f, "condition") === "USED" ? "USED" : "NEW",
    accessoryType: type === "ACCESSORY" ? str(f, "accessoryType") || "OTHER" : null,
    description: str(f, "description"),
    specs: JSON.stringify(specs),
    finishHex: optStr(f, "finishHex"),
    featured: bool(f, "featured"),
    careCardEligible: bool(f, "careCardEligible"),
    loyaltyEligible: bool(f, "loyaltyEligible"),
    sketchfabUid: optStr(f, "sketchfabUid"),
    metaTitle: optStr(f, "metaTitle"),
    metaDescription: optStr(f, "metaDescription"),
  };
}

/** Create or update a product (§5). Every change is audited with before/after values (§16). */
export async function saveProductAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const id = str(f, "id");
  let createdId: string | null = null;
  const res = await run(async () => {
    const data = productData(f);
    if (id) {
      const before = await db.product.findUniqueOrThrow({ where: { id } });
      const d = diff(before as unknown as Record<string, unknown>, data);
      if (!d.changed) return "No changes";
      await db.$transaction(async (tx) => {
        await tx.product.update({ where: { id }, data });
        await audit({ staffId: staff.id, action: "PRODUCT_UPDATED", entityType: "PRODUCT", entityId: id, recordLabel: data.name, before: d.before, after: d.after, ip: await clientIp() }, tx);
      });
      revalidatePath(`/admin/products/${id}`);
      return "Product saved";
    }
    let slug = slugify(`${data.name}${data.condition === "USED" ? "-used" : ""}`);
    if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const p = await db.$transaction(async (tx) => {
      const p = await tx.product.create({ data: { ...data, slug } });
      await audit({ staffId: staff.id, action: "PRODUCT_CREATED", entityType: "PRODUCT", entityId: p.id, recordLabel: p.name, after: data, ip: await clientIp() }, tx);
      return p;
    });
    createdId = p.id;
  });
  if (createdId) redirect(`/admin/products/${createdId}?created=1`);
  return res;
}

export async function toggleProductActiveAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const p = await db.product.findUniqueOrThrow({ where: { id: str(f, "id") } });
    await db.product.update({ where: { id: p.id }, data: { active: !p.active } });
    await audit({ staffId: staff.id, action: p.active ? "PRODUCT_DEACTIVATED" : "PRODUCT_ACTIVATED", entityType: "PRODUCT", entityId: p.id, recordLabel: p.name, before: { active: p.active }, after: { active: !p.active } });
    revalidatePath(`/admin/products/${p.id}`);
    return p.active ? "Product hidden from the shop" : "Product is live";
  });
}

/** Create/update a sellable variant with unique SKU + barcode (§6). Price changes are audited. */
export async function saveVariantAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const id = str(f, "variantId");
    const productId = str(f, "productId");
    const sku = str(f, "sku").toUpperCase();
    const barcode = str(f, "barcode");
    const price = int(f, "price");
    if (!sku) throw new Error("SKU is required");
    if (!barcode) throw new Error("Barcode is required (use Generate)");
    if (price == null || price <= 0) throw new Error("Price must be greater than 0");
    const salePrice = int(f, "salePrice");
    if (salePrice != null && salePrice >= price) throw new Error("Sale price must be lower than the price");
    const existing = id ? await db.variant.findUnique({ where: { id } }) : null;
    // Zero-stock selling is an owner-only switch; employees' edits keep whatever the owner set.
    const allowBackorder = staff.role === "SUPER_ADMIN" ? bool(f, "allowBackorder") : (existing?.allowBackorder ?? false);

    const data = {
      sku,
      barcode,
      storage: optStr(f, "storage"),
      color: optStr(f, "color"),
      colorHex: optStr(f, "colorHex"),
      price,
      salePrice,
      lowStockThreshold: int(f, "lowStockThreshold") ?? 2,
      grade: optStr(f, "grade"),
      batteryHealth: int(f, "batteryHealth"),
      conditionNotes: optStr(f, "conditionNotes"),
      warrantyInfo: optStr(f, "warrantyInfo"),
      returnInfo: optStr(f, "returnInfo"),
      allowBackorder,
      active: !bool(f, "inactive"),
    };
    const clash = await db.variant.findFirst({ where: { OR: [{ sku }, { barcode }], NOT: id ? { id } : undefined } });
    if (clash) throw new Error(clash.sku === sku ? `SKU ${sku} is already used` : `Barcode ${barcode} is already used`);

    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    if (id) {
      const before = await db.variant.findUniqueOrThrow({ where: { id } });
      const d = diff(before as unknown as Record<string, unknown>, data);
      if (!d.changed) return "No changes";
      const priceChanged = "price" in d.after || "salePrice" in d.after;
      await db.$transaction(async (tx) => {
        await tx.variant.update({ where: { id }, data });
        await audit({ staffId: staff.id, action: priceChanged ? "PRICE_CHANGED" : "VARIANT_UPDATED", entityType: "VARIANT", entityId: id, recordLabel: `${product.name} / ${sku}`, before: d.before, after: d.after, ip: await clientIp() }, tx);
      });
    } else {
      const opening = int(f, "openingStock") ?? 0;
      await db.$transaction(async (tx) => {
        const v = await tx.variant.create({ data: { ...data, productId, stockQty: 0 } });
        await audit({ staffId: staff.id, action: "VARIANT_CREATED", entityType: "VARIANT", entityId: v.id, recordLabel: `${product.name} / ${sku}`, after: data }, tx);
        if (opening > 0) await adjustStock(tx, v.id, opening, staff.id, "Opening stock");
      });
    }
    revalidatePath(`/admin/products/${productId}`);
    return id ? "Variant saved" : "Variant added";
  });
}

export async function adjustStockAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const qty = int(f, "qty");
    const reason = str(f, "reason");
    if (!qty) throw new Error("Enter a quantity (use a minus sign to remove stock)");
    if (reason.length < 3) throw new Error("A reason is required for every stock adjustment");
    const v = await db.$transaction((tx) => adjustStock(tx, str(f, "variantId"), qty, staff.id, reason));
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${v.productId}`);
    return `Stock is now ${v.stockQty}`;
  });
}

export async function uploadImagesAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const p = await db.product.findUniqueOrThrow({ where: { id: str(f, "productId") } });
    const files = f.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
    if (!files.length) throw new Error("Choose at least one image");
    const urls: string[] = [];
    for (const file of files.slice(0, 10)) urls.push(await saveUpload(file, `products/${p.id}`));
    const images = [...parseJson<string[]>(p.images, []), ...urls];
    await db.product.update({ where: { id: p.id }, data: { images: JSON.stringify(images) } });
    await audit({ staffId: staff.id, action: "PRODUCT_IMAGES_ADDED", entityType: "PRODUCT", entityId: p.id, recordLabel: p.name, after: { added: urls.length } });
    revalidatePath(`/admin/products/${p.id}`);
    return `${urls.length} image(s) uploaded`;
  });
}

export async function removeImageAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const p = await db.product.findUniqueOrThrow({ where: { id: str(f, "productId") } });
    const url = str(f, "url");
    const images = parseJson<string[]>(p.images, []).filter((u) => u !== url);
    await db.product.update({ where: { id: p.id }, data: { images: JSON.stringify(images) } });
    await audit({ staffId: staff.id, action: "PRODUCT_IMAGE_REMOVED", entityType: "PRODUCT", entityId: p.id, recordLabel: p.name, before: { url } });
    revalidatePath(`/admin/products/${p.id}`);
    return "Image removed";
  });
}

/** Direct upload of an approved GLB/GLTF model (§5 "3D model"). */
export async function uploadModelAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const p = await db.product.findUniqueOrThrow({ where: { id: str(f, "productId") } });
    const file = f.get("model");
    if (!(file instanceof File) || !file.size) throw new Error("Choose a .glb file");
    if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("Upload a binary glTF (.glb) file");
    const url = await saveUpload(new File([file], file.name, { type: "model/gltf-binary" }), `models/${p.id}`, { types: ["model/gltf-binary"], maxBytes: 25 * 1024 * 1024 });
    await db.product.update({ where: { id: p.id }, data: { model3dUrl: url, model3dKind: "GLB" } });
    await audit({ staffId: staff.id, action: "MODEL_3D_UPLOADED", entityType: "PRODUCT", entityId: p.id, recordLabel: p.name, before: { model3dUrl: p.model3dUrl }, after: { model3dUrl: url } });
    revalidatePath(`/admin/products/${p.id}`);
    return "3D model attached";
  });
}

export async function clearModelAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const p = await db.product.findUniqueOrThrow({ where: { id: str(f, "productId") } });
    await db.product.update({ where: { id: p.id }, data: { model3dUrl: null, model3dKind: null, model3dTextures: null } });
    await audit({ staffId: staff.id, action: "MODEL_3D_REMOVED", entityType: "PRODUCT", entityId: p.id, recordLabel: p.name, before: { model3dUrl: p.model3dUrl, model3dKind: p.model3dKind } });
    revalidatePath(`/admin/products/${p.id}`);
    return "3D model removed — the default 3D preview is shown";
  });
}
