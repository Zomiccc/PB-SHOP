"use server";

import { redirect } from "next/navigation";
import { normalizePhone } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { USED_WARRANTY } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { nextRewardsId } from "@/lib/rewards-id";
import { suggestCodes } from "@/lib/barcode";
import { assertVariantGrade } from "@/lib/grade";
import { assertImeiFree, receiveStock } from "@/lib/inventory";
import { HANDED_OVER, awardInstallmentPoints, formatCnic, maskCnic, monthlyPayment, reverseInstallmentPoints } from "@/lib/installments";
import { filesFrom, inspectUpload, MAX_FILES_PER_FORM, saveAttachment, type AttachmentKind } from "@/lib/attachments";
import { slugify } from "@/lib/format";
import type { FormState } from "./auth";
import { bool, int, optStr, run, str } from "./util";

const PHONE_RX = /^(\+92|0)?3\d{9}$/;
const CNIC_RX = /^\d{5}-?\d{7}-?\d$/;


/** CNIC front + back are mandatory; "other documents" optional. All are validated before anything is saved. */
async function collectIdDocuments(f: FormData) {
  if (!bool(f, "idConsent")) throw new Error("Show the customer the ID privacy notice and tick their agreement before taking their CNIC");
  const front = filesFrom(f, "cnicFront")[0];
  const back = filesFrom(f, "cnicBack")[0];
  if (!front) throw new Error("Upload the ID card — front");
  if (!back) throw new Error("Upload the ID card — back");
  const others = filesFrom(f, "attachments").slice(0, MAX_FILES_PER_FORM);
  const all: { file: File; kind: AttachmentKind }[] = [{ file: front, kind: "CNIC_FRONT" }, { file: back, kind: "CNIC_BACK" }, ...others.map((file) => ({ file, kind: "OTHER" as const }))];
  for (const a of all) await inspectUpload(a.file, a.kind);
  return all;
}

// ─────────────── New phone on installments (master brief §5) ───────────────

export async function createInstallmentSaleAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let createdId: string | null = null;
  const res = await run(async () => {
    const phone = normalizePhone(str(f, "customerPhone"));
    const cnic = str(f, "cnicNumber");
    if (str(f, "customerName").length < 2) throw new Error("Enter the customer's full name");
    if (!PHONE_RX.test(phone)) throw new Error("Enter a valid mobile number, e.g. 0300 1234567");
    if (!CNIC_RX.test(cnic)) throw new Error("Enter the 13-digit CNIC number, e.g. 35202-1234567-1");
    const listing = optStr(f, "listingId") ? await db.installmentListing.findUnique({ where: { id: str(f, "listingId") } }) : null;
    const plan = {
      phoneModel: str(f, "phoneModel") || listing?.model || "",
      totalPrice: int(f, "totalPrice") ?? listing?.installmentTotal ?? 0,
      phoneValue: int(f, "phoneValue") ?? listing?.regularPrice ?? null,
      downPayment: int(f, "downPayment") ?? listing?.downPayment ?? 0,
      durationMonths: int(f, "durationMonths") ?? listing?.durationMonths ?? 0,
    };
    if (plan.phoneModel.length < 2) throw new Error("Enter the phone model");
    if (plan.totalPrice <= 0 || plan.downPayment < 0 || plan.downPayment >= plan.totalPrice) throw new Error("Check the total and down payment");
    if (plan.durationMonths < 1 || plan.durationMonths > 60) throw new Error("Duration must be 1–60 months");
    if (plan.phoneValue != null && plan.phoneValue <= 0) throw new Error("Phone cash price must be more than 0");
    const docs = await collectIdDocuments(f);

    const sale = await db.$transaction(async (tx) => {
      const customer = (await tx.customer.findUnique({ where: { phone } })) ?? (await tx.customer.create({ data: { name: str(f, "customerName"), phone, passportNo: await nextRewardsId(tx) } }));
      const count = await tx.installmentSale.count();
      const s = await tx.installmentSale.create({
        data: {
          ref: `PBI-${1001 + count}`,
          listingId: listing?.id ?? null,
          customerId: customer.id,
          customerName: str(f, "customerName"),
          customerPhone: phone,
          cnicNumber: formatCnic(cnic),
          address: optStr(f, "address"),
          imei: optStr(f, "imei"),
          ...plan,
          monthlyPayment: monthlyPayment({ installmentTotal: plan.totalPrice, downPayment: plan.downPayment, durationMonths: plan.durationMonths }),
          notes: optStr(f, "notes"),
          idConsentAt: new Date(),
          staffId: staff.id,
        },
      });
      for (const d of docs) await saveAttachment(d.file, { kind: d.kind, installmentSaleId: s.id, uploadedById: staff.id }, tx);
      await audit(
        { staffId: staff.id, action: "INSTALLMENT_SALE_CREATED", entityType: "INSTALLMENT", entityId: s.id, recordLabel: `${s.ref} · ${s.phoneModel}`, after: { customer: s.customerName, cnic: maskCnic(s.cnicNumber), ...plan, documents: docs.length } },
        tx,
      );
      return s;
    });
    createdId = sale.id;
  });
  if (createdId) redirect(`/admin/installments/sales/${createdId}?created=1`);
  return res;
}

const SALE_STATUSES = ["PENDING", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"];

export async function updateInstallmentSaleAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const s = await db.installmentSale.findUniqueOrThrow({ where: { id: str(f, "id") } });
    const status = str(f, "status");
    if (!SALE_STATUSES.includes(status)) throw new Error("Choose a status");
    const data = { status, imei: optStr(f, "imei"), notes: optStr(f, "notes") };
    let points = 0;
    await db.$transaction(async (tx) => {
      await tx.installmentSale.update({ where: { id: s.id }, data });
      // PB Points (v4 §3): given once the phone is handed over; reversed if the sale is then cancelled.
      if (HANDED_OVER.includes(status)) points = await awardInstallmentPoints(tx, s.id, staff.id);
      else if (status === "CANCELLED") points = -(await reverseInstallmentPoints(tx, s.id, staff.id));
      await audit({ staffId: staff.id, action: "INSTALLMENT_SALE_UPDATED", entityType: "INSTALLMENT", entityId: s.id, recordLabel: s.ref, before: { status: s.status, imei: s.imei }, after: { status, imei: data.imei, points: points || undefined } }, tx);
    });
    revalidatePath(`/admin/installments/sales/${s.id}`);
    return points > 0 ? `Saved — ${points} PB Points added to the customer's PB Rewards account` : points < 0 ? `Saved — ${-points} PB Points reversed` : "Saved";
  });
}

// ─────────────── Buying a used phone from a seller (master brief §6) ───────────────

export async function createUsedPurchaseAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let createdId: string | null = null;
  const res = await run(async () => {
    const phone = normalizePhone(str(f, "sellerPhone"));
    const cnic = str(f, "sellerCnic");
    const imei = str(f, "imei").replace(/\s/g, "");
    if (str(f, "sellerName").length < 2) throw new Error("Enter the seller's full name");
    if (!PHONE_RX.test(phone)) throw new Error("Enter a valid mobile number");
    if (!CNIC_RX.test(cnic)) throw new Error("Enter the seller's 13-digit CNIC number");
    if (!str(f, "brand") || !str(f, "model")) throw new Error("Enter the brand and model");
    if (!/^[A-Za-z0-9-]{6,20}$/.test(imei)) throw new Error("Enter the IMEI / serial (dial *#06#)");
    const grade = assertVariantGrade("USED", optStr(f, "grade"))!;
    const agreedPrice = int(f, "agreedPrice");
    if (!agreedPrice || agreedPrice <= 0) throw new Error("Enter the agreed purchase price");
    const addToStock = bool(f, "addToStock");
    const salePrice = int(f, "salePrice");
    if (addToStock && (!salePrice || salePrice <= 0)) throw new Error("Enter the resale price to add it to stock");
    const docs = await collectIdDocuments(f);

    const p = await db.$transaction(async (tx) => {
      await assertImeiFree(tx, imei);
      const count = await tx.usedPhonePurchase.count();
      const purchase = await tx.usedPhonePurchase.create({
        data: {
          ref: `PBU-${1001 + count}`,
          sellerName: str(f, "sellerName"),
          sellerPhone: phone,
          sellerCnic: formatCnic(cnic),
          sellerAddress: optStr(f, "sellerAddress"),
          brand: str(f, "brand"),
          model: str(f, "model"),
          imei,
          storage: optStr(f, "storage"),
          color: optStr(f, "color"),
          grade,
          batteryHealth: int(f, "batteryHealth"),
          agreedPrice,
          idConsentAt: new Date(),
          notes: optStr(f, "notes"),
          staffId: staff.id,
        },
      });
      for (const d of docs) await saveAttachment(d.file, { kind: d.kind, usedPurchaseId: purchase.id, uploadedById: staff.id }, tx);
      await audit(
        { staffId: staff.id, action: "USED_PHONE_BOUGHT", entityType: "USED_PURCHASE", entityId: purchase.id, recordLabel: `${purchase.ref} · ${purchase.brand} ${purchase.model}`, after: { seller: purchase.sellerName, cnic: maskCnic(purchase.sellerCnic), imei, grade, agreedPrice } },
        tx,
      );

      if (addToStock) {
        // One physical device = its own used SKU with a single grade, bought at the agreed price.
        const name = `${purchase.brand === "Apple" || purchase.model.toLowerCase().startsWith(purchase.brand.toLowerCase()) ? "" : `${purchase.brand} `}${purchase.model}`.trim();
        let product = await tx.product.findFirst({ where: { type: "PHONE", condition: "USED", name } });
        if (!product) {
          let slug = slugify(`${name}-used`);
          if (await tx.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
          product = await tx.product.create({ data: { slug, name, brand: purchase.brand, type: "PHONE", condition: "USED", description: `Lab-checked used ${name}.`, active: true } });
        }
        const codes = await suggestCodes(tx);
        const v = await tx.variant.create({
          data: { productId: product.id, sku: codes.sku, barcode: codes.barcode, imei, storage: purchase.storage, color: purchase.color, grade, batteryHealth: purchase.batteryHealth, price: salePrice!, costPrice: agreedPrice, stockQty: 0, lowStockThreshold: 0, warrantyInfo: USED_WARRANTY },
        });
        await receiveStock(tx, { variantId: v.id, qty: 1, unitCost: agreedPrice, staffId: staff.id, reference: purchase.ref, notes: "Bought from seller" });
        await tx.usedPhonePurchase.update({ where: { id: purchase.id }, data: { variantId: v.id } });
        await audit({ staffId: staff.id, action: "USED_PHONE_ADDED_TO_STOCK", entityType: "VARIANT", entityId: v.id, recordLabel: `${product.name} / ${v.sku}`, after: { grade, price: salePrice, costPrice: agreedPrice, from: purchase.ref } }, tx);
      }
      return purchase;
    });
    createdId = p.id;
  });
  if (createdId) redirect(`/admin/used-phones/${createdId}?created=1`);
  return res;
}
