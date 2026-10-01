"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { slugify } from "@/lib/format";
import { saveUpload } from "@/lib/storage";
import { DESIGN_MODES, SKIN_FOCUS, SKIN_LOOKS, templateProblem, type SkinTemplate } from "@/lib/skin-template";
import type { FormState } from "./auth";
import { bool, int, run, str } from "./util";

/**
 * Custom Skins admin (v4 §10): skin types with prices, brands, phone models with their preview templates,
 * and skin designs (for all models or chosen ones). Built so staff can keep adding designs and new phone
 * models themselves: bulk upload, duplicate, "all models" designs, and copy-a-template. Every change is audited.
 */

const SKIN_IMAGE = { maxBytes: 4 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] };

// ─────────────── Skin types (material + price) ───────────────

export async function saveSkinTypeAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const id = str(f, "id");
    const name = str(f, "name");
    const price = int(f, "price");
    if (name.length < 2) throw new Error("Enter the skin type name");
    if (price == null || price < 0) throw new Error("Enter the price");
    const look = str(f, "look") in SKIN_LOOKS ? str(f, "look") : "MATTE";
    const designMode = str(f, "designMode") in DESIGN_MODES ? str(f, "designMode") : "DESIGN";
    const data = { name, price, look, designMode, description: str(f, "description") || null, active: id ? bool(f, "active") : true, sortOrder: int(f, "sortOrder") ?? 0 };
    if (id) {
      const before = await db.skinType.findUniqueOrThrow({ where: { id } });
      await db.skinType.update({ where: { id }, data });
      await audit({ staffId: staff.id, action: before.price !== price ? "SKIN_TYPE_PRICE_CHANGED" : "SKIN_TYPE_UPDATED", entityType: "SKIN_TYPE", entityId: id, recordLabel: name, before: { name: before.name, price: before.price, look: before.look, designMode: before.designMode, active: before.active }, after: data });
    } else {
      const t = await db.skinType.create({ data });
      await audit({ staffId: staff.id, action: "SKIN_TYPE_CREATED", entityType: "SKIN_TYPE", entityId: t.id, recordLabel: name, after: data });
    }
    refresh();
    return id ? "Saved" : `${name} added`;
  });
}

export async function deleteSkinTypeAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const t = await db.skinType.findUniqueOrThrow({ where: { id: str(f, "id") } });
    await db.skinType.delete({ where: { id: t.id } });
    await audit({ staffId: staff.id, action: "SKIN_TYPE_DELETED", entityType: "SKIN_TYPE", entityId: t.id, recordLabel: t.name, before: { price: t.price } });
    refresh();
    return `${t.name} deleted`;
  });
}

const refresh = () => {
  revalidatePath("/admin/skins");
  revalidatePath("/custom-skins", "layout");
};

// ─────────────── Brands ───────────────

export async function saveSkinBrandAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const name = str(f, "name");
    if (name.length < 2) throw new Error("Enter the brand name");
    const slug = slugify(name);
    const id = str(f, "id");
    const data = { name, slug, active: id ? bool(f, "active") : true, sortOrder: int(f, "sortOrder") ?? 0 };
    const clash = await db.skinBrand.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
    if (clash) throw new Error(`${clash.name} already exists`);
    const b = id ? await db.skinBrand.update({ where: { id }, data }) : await db.skinBrand.create({ data });
    await audit({ staffId: staff.id, action: id ? "SKIN_BRAND_UPDATED" : "SKIN_BRAND_CREATED", entityType: "SKIN_BRAND", entityId: b.id, recordLabel: b.name, after: data });
    refresh();
    return id ? "Brand saved" : `${b.name} added — now add its models`;
  });
}

// ─────────────── Phone models + templates ───────────────

const num = (f: FormData, k: string) => {
  const n = Number(str(f, k));
  if (str(f, k) === "" || !Number.isFinite(n)) throw new Error(`Enter ${k}`);
  return Math.round(n * 10) / 10;
};

function templateFrom(f: FormData): SkinTemplate {
  const t: SkinTemplate = {
    widthMm: num(f, "widthMm"),
    heightMm: num(f, "heightMm"),
    cornerMm: num(f, "cornerMm"),
    cameraX: num(f, "cameraX"),
    cameraY: num(f, "cameraY"),
    cameraW: num(f, "cameraW"),
    cameraH: num(f, "cameraH"),
    cameraCornerMm: num(f, "cameraCornerMm"),
    lenses: Math.round(num(f, "lenses")),
    bodyHex: str(f, "bodyHex") || "#2b2f36",
  };
  const problem = templateProblem(t);
  if (problem) throw new Error(problem);
  return t;
}

export async function savePhoneModelAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let createdId: string | null = null;
  const res = await run(async () => {
    const name = str(f, "name");
    const brandId = str(f, "brandId");
    if (name.length < 2) throw new Error("Enter the model name");
    const brand = await db.skinBrand.findUniqueOrThrow({ where: { id: brandId } });
    const slug = slugify(name);
    const id = str(f, "id");
    const clash = await db.phoneModel.findFirst({ where: { brandId, slug, NOT: id ? { id } : undefined } });
    if (clash) throw new Error(`${brand.name} ${name} already exists`);
    const data = { name, slug, brandId, active: id ? bool(f, "active") : true, sortOrder: int(f, "sortOrder") ?? 0, ...templateFrom(f) };
    if (id) {
      const before = await db.phoneModel.findUniqueOrThrow({ where: { id } });
      await db.phoneModel.update({ where: { id }, data });
      await audit({ staffId: staff.id, action: "PHONE_MODEL_UPDATED", entityType: "PHONE_MODEL", entityId: id, recordLabel: `${brand.name} ${name}`, before, after: data });
    } else {
      const m = await db.phoneModel.create({ data });
      createdId = m.id;
      await audit({ staffId: staff.id, action: "PHONE_MODEL_CREATED", entityType: "PHONE_MODEL", entityId: m.id, recordLabel: `${brand.name} ${name}`, after: data });
    }
    refresh();
    return "Model saved";
  });
  if (createdId) redirect(`/admin/skins/models/${createdId}?created=1`);
  return res;
}

export async function deletePhoneModelAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const res = await run(async () => {
    const m = await db.phoneModel.findUniqueOrThrow({ where: { id: str(f, "id") }, include: { brand: true, _count: { select: { skins: true } } } });
    await db.phoneModel.update({ where: { id: m.id }, data: { skins: { set: [] } } });
    await db.phoneModel.delete({ where: { id: m.id } });
    await audit({ staffId: staff.id, action: "PHONE_MODEL_DELETED", entityType: "PHONE_MODEL", entityId: m.id, recordLabel: `${m.brand.name} ${m.name}`, before: { skinsAssigned: m._count.skins } });
    refresh();
  });
  if (res?.ok) redirect("/admin/skins/models?deleted=1");
  return res;
}

// ─────────────── Skins ───────────────

export async function saveSkinAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let createdId: string | null = null;
  const res = await run(async () => {
    const id = str(f, "id");
    const name = str(f, "name");
    const price = int(f, "price") ?? 0; // optional extra charge for this design
    if (name.length < 2) throw new Error("Enter the design name");
    if (price < 0) throw new Error("The extra charge can't be negative");
    const focus = str(f, "focus") in SKIN_FOCUS ? str(f, "focus") : "xMidYMid";
    const allModels = bool(f, "allModels");
    const modelIds = allModels ? [] : [...new Set(f.getAll("modelIds").map(String).filter(Boolean))];
    const found = await db.phoneModel.count({ where: { id: { in: modelIds } } });
    if (found !== modelIds.length) throw new Error("A selected model no longer exists — reload the page");
    const file = f.get("image");
    const upload = file instanceof File && file.size > 0 ? file : null;
    if (!id && !upload) throw new Error("Upload the skin artwork");
    const imageUrl = upload ? await saveUpload(upload, "skins", SKIN_IMAGE) : null;
    const data = { name, price, focus, allModels, description: str(f, "description") || null, active: bool(f, "active"), sortOrder: int(f, "sortOrder") ?? 0, ...(imageUrl ? { imageUrl } : {}) };
    if (id) {
      const before = await db.skin.findUniqueOrThrow({ where: { id }, include: { models: { select: { id: true } } } });
      await db.skin.update({ where: { id }, data: { ...data, models: { set: modelIds.map((m) => ({ id: m })) } } });
      await audit({ staffId: staff.id, action: before.active !== data.active ? (data.active ? "SKIN_ENABLED" : "SKIN_DISABLED") : "SKIN_UPDATED", entityType: "SKIN", entityId: id, recordLabel: name, before: { ...before, models: before.models.length }, after: { ...data, models: modelIds.length } });
    } else {
      const s = await db.skin.create({ data: { ...data, imageUrl: imageUrl!, models: { connect: modelIds.map((m) => ({ id: m })) } } });
      createdId = s.id;
      await audit({ staffId: staff.id, action: "SKIN_CREATED", entityType: "SKIN", entityId: s.id, recordLabel: name, after: { ...data, models: modelIds.length } });
    }
    refresh();
    return allModels || modelIds.length ? "Design saved" : "Design saved — choose 'all models' or tick some models so customers can see it";
  });
  if (createdId) redirect(`/admin/skins/${createdId}?created=1`);
  return res;
}

export async function toggleSkinAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const s = await db.skin.findUniqueOrThrow({ where: { id: str(f, "id") } });
    await db.skin.update({ where: { id: s.id }, data: { active: !s.active } });
    await audit({ staffId: staff.id, action: s.active ? "SKIN_DISABLED" : "SKIN_ENABLED", entityType: "SKIN", entityId: s.id, recordLabel: s.name });
    refresh();
    return s.active ? "Disabled" : "Enabled";
  });
}

export async function deleteSkinAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const res = await run(async () => {
    const s = await db.skin.findUniqueOrThrow({ where: { id: str(f, "id") }, include: { _count: { select: { models: true } } } });
    await db.skin.update({ where: { id: s.id }, data: { models: { set: [] } } });
    await db.skin.delete({ where: { id: s.id } });
    await audit({ staffId: staff.id, action: "SKIN_DELETED", entityType: "SKIN", entityId: s.id, recordLabel: s.name, before: { price: s.price, imageUrl: s.imageUrl, models: s._count.models } });
    refresh();
  });
  if (res?.ok) redirect("/admin/skins?deleted=1");
  return res;
}

/**
 * Bulk upload (client request: "add more skins … so we don't have to do it again and again"): the browser
 * sends one image per call (keeps every request small), each becoming its own design with the same settings.
 * The design name comes from the file name ("gold-marble_2.jpg" → "Gold Marble 2").
 */
export async function bulkAddSkinAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const file = f.get("image");
    if (!(file instanceof File) || !file.size) throw new Error("No image");
    const price = int(f, "price") ?? 0;
    if (price < 0) throw new Error("The extra charge can't be negative");
    const brandId = str(f, "brandId");
    const modelIds = brandId ? (await db.phoneModel.findMany({ where: { brandId }, select: { id: true } })).map((m) => m.id) : [];
    const allModels = !brandId;
    const name = designName(str(f, "name") || file.name);
    const imageUrl = await saveUpload(file, "skins", SKIN_IMAGE);
    const s = await db.skin.create({ data: { name, imageUrl, price, allModels, active: bool(f, "active"), models: { connect: modelIds.map((id) => ({ id })) } } });
    await audit({ staffId: staff.id, action: "SKIN_CREATED", entityType: "SKIN", entityId: s.id, recordLabel: name, after: { bulk: true, price, allModels, models: modelIds.length } });
    refresh();
    return name;
  });
}

/** "gold-marble_2.jpg" → "Gold Marble 2". */
function designName(fileName: string) {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return base ? base.replace(/\b\w/g, (c) => c.toUpperCase()) : "New design";
}

/** Duplicate a design (same artwork, settings and models) to make a variant quickly. */
export async function duplicateSkinAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let createdId: string | null = null;
  const res = await run(async () => {
    const s = await db.skin.findUniqueOrThrow({ where: { id: str(f, "id") }, include: { models: { select: { id: true } } } });
    const copy = await db.skin.create({
      data: { name: `${s.name} (copy)`, description: s.description, imageUrl: s.imageUrl, focus: s.focus, price: s.price, allModels: s.allModels, active: false, sortOrder: s.sortOrder, models: { connect: s.models } },
    });
    createdId = copy.id;
    await audit({ staffId: staff.id, action: "SKIN_DUPLICATED", entityType: "SKIN", entityId: copy.id, recordLabel: copy.name, after: { from: s.id } });
    refresh();
  });
  if (createdId) redirect(`/admin/skins/${createdId}?copied=1`);
  return res;
}
