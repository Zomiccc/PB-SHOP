"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { parseMedia, parsePkt, safeHref } from "@/lib/broadcasts";
import { notifyVisitorsBroadcast } from "@/lib/push";
import { AVAILABILITY, planProblem } from "@/lib/installments";
import { termList } from "@/lib/finance";
import { getSetting } from "@/lib/settings";
import { brandSlugFor } from "@/lib/brands";
import type { FormState } from "./auth";
import { bool, diff, int, optStr, run, str } from "./util";

const date = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const d = parsePkt(v);
  if (!d) throw new Error(`${k === "startsAt" ? "Start" : "End"} date is not valid`);
  return d;
};

// ─────────────── Broadcasts (master brief §9) ───────────────

/** Create or edit a broadcast. Admins and the Super Admin can manage broadcasts; every change is audited. */
export async function saveBroadcastAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const message = str(f, "message");
    if (message.length < 3) throw new Error("Write the announcement text");
    if (message.length > 400) throw new Error("Keep the announcement under 400 characters");
    const rawHref = optStr(f, "ctaHref");
    const ctaHref = safeHref(rawHref);
    if (rawHref && !ctaHref) throw new Error("Link must be a page on this site (e.g. /used-phones) or an https:// address");
    // Pictures / videos (v6 §2) — only files uploaded through the dashboard are accepted.
    const media = JSON.stringify(parseMedia(str(f, "media")));
    const data = { message, media, ctaLabel: optStr(f, "ctaLabel"), ctaHref, startsAt: date(f, "startsAt"), endsAt: date(f, "endsAt"), active: bool(f, "active") };
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) throw new Error("End must be after start");
    const id = str(f, "id");
    let published = false;
    await db.$transaction(async (tx) => {
      if (id) {
        const before = await tx.broadcast.findUniqueOrThrow({ where: { id } });
        published = !before.active && data.active;
        const d = diff(before as unknown as Record<string, unknown>, data);
        if (!d.changed) return;
        await tx.broadcast.update({ where: { id }, data });
        const action = before.active !== data.active ? (data.active ? "BROADCAST_PUBLISHED" : "BROADCAST_UNPUBLISHED") : "BROADCAST_UPDATED";
        await audit({ staffId: staff.id, action, entityType: "BROADCAST", entityId: id, recordLabel: message.slice(0, 80), before: d.before, after: d.after }, tx);
      } else {
        const b = await tx.broadcast.create({ data: { ...data, createdById: staff.id } });
        published = data.active;
        await audit({ staffId: staff.id, action: data.active ? "BROADCAST_PUBLISHED" : "BROADCAST_CREATED", entityType: "BROADCAST", entityId: b.id, recordLabel: message.slice(0, 80), after: data }, tx);
      }
    });
    revalidatePath("/admin/broadcasts");
    revalidatePath("/");
    // Customers who tapped "Enable Notifications" hear about newly published broadcasts (v6 §9).
    if (published && (!data.startsAt || data.startsAt <= new Date())) await notifyVisitorsBroadcast(message).catch(() => 0);
    return id ? "Broadcast saved" : data.active ? "Broadcast published" : "Broadcast saved as draft";
  });
}

export async function toggleBroadcastAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const b = await db.broadcast.findUniqueOrThrow({ where: { id: str(f, "id") } });
    await db.$transaction(async (tx) => {
      await tx.broadcast.update({ where: { id: b.id }, data: { active: !b.active } });
      await audit({ staffId: staff.id, action: b.active ? "BROADCAST_UNPUBLISHED" : "BROADCAST_PUBLISHED", entityType: "BROADCAST", entityId: b.id, recordLabel: b.message.slice(0, 80), before: { active: b.active }, after: { active: !b.active } }, tx);
    });
    revalidatePath("/admin/broadcasts");
    revalidatePath("/");
    if (!b.active) await notifyVisitorsBroadcast(b.message).catch(() => 0);
    return b.active ? "Unpublished" : "Published";
  });
}

export async function deleteBroadcastAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const b = await db.broadcast.findUniqueOrThrow({ where: { id: str(f, "id") } });
    await db.$transaction(async (tx) => {
      await tx.broadcast.delete({ where: { id: b.id } });
      await audit({ staffId: staff.id, action: "BROADCAST_DELETED", entityType: "BROADCAST", entityId: b.id, recordLabel: b.message.slice(0, 80), before: { message: b.message, active: b.active, ctaHref: b.ctaHref } }, tx);
    });
    revalidatePath("/admin/broadcasts");
    revalidatePath("/");
    return "Broadcast deleted";
  });
}

// ─────────────── Installment phone listings (master brief §3) ───────────────

function listingData(f: FormData) {
  const model = str(f, "model");
  if (model.length < 2) throw new Error("Enter the phone model");
  const interest = Number(str(f, "interestPercent") || "0");
  const data = {
    brand: optStr(f, "brand") ?? brandSlugFor(null, model),
    model,
    productId: optStr(f, "productId"),
    imageUrl: optStr(f, "imageUrl"),
    regularPrice: int(f, "regularPrice") ?? 0,
    installmentTotal: int(f, "installmentTotal") ?? 0,
    interestPercent: Number.isFinite(interest) ? Math.round(interest * 100) / 100 : -1,
    downPayment: int(f, "downPayment") ?? 0,
    durationMonths: int(f, "durationMonths") ?? 0,
    planLabel: optStr(f, "planLabel"),
    availability: str(f, "availability") in AVAILABILITY ? str(f, "availability") : "AVAILABLE",
    active: bool(f, "active"),
  };
  const problem = planProblem(data);
  if (problem) throw new Error(problem);
  if (data.imageUrl && !safeHref(data.imageUrl)) throw new Error("Image must be an https:// address or a /path on this site");
  return data;
}

/** Add or edit an installment phone. Changes show on the homepage immediately. */
export async function saveListingAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const data = listingData(f);
    // Only the plan lengths offered on the website (Settings → Installment calculator), e.g. 3 / 6 / 9 months.
    const terms = termList(await getSetting("installmentCalc"));
    if (terms.length && !terms.includes(data.durationMonths)) throw new Error(`Duration must be one of the offered plans: ${terms.join(", ")} months`);
    const id = str(f, "id");
    await db.$transaction(async (tx) => {
      if (id) {
        const before = await tx.installmentListing.findUniqueOrThrow({ where: { id } });
        const d = diff(before as unknown as Record<string, unknown>, data);
        if (!d.changed) return;
        await tx.installmentListing.update({ where: { id }, data });
        await audit({ staffId: staff.id, action: "INSTALLMENT_LISTING_UPDATED", entityType: "INSTALLMENT", entityId: id, recordLabel: data.model, before: d.before, after: d.after }, tx);
      } else {
        const last = await tx.installmentListing.aggregate({ _max: { sortOrder: true } });
        const l = await tx.installmentListing.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 10 } });
        await audit({ staffId: staff.id, action: "INSTALLMENT_LISTING_CREATED", entityType: "INSTALLMENT", entityId: l.id, recordLabel: data.model, after: data }, tx);
      }
    });
    revalidatePath("/admin/installments");
    revalidatePath("/");
    revalidatePath("/installments");
    return id ? "Listing saved" : "Installment phone added";
  });
}

/** Move a listing up or down on the homepage. */
export async function moveListingAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const all = await db.installmentListing.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const i = all.findIndex((l) => l.id === str(f, "id"));
    const j = str(f, "dir") === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return "Already at the end";
    [all[i], all[j]] = [all[j], all[i]];
    await db.$transaction(async (tx) => {
      for (const [n, l] of all.entries()) await tx.installmentListing.update({ where: { id: l.id }, data: { sortOrder: (n + 1) * 10 } });
      await audit({ staffId: staff.id, action: "INSTALLMENT_LISTING_MOVED", entityType: "INSTALLMENT", entityId: all[j].id, recordLabel: all[j].model, before: { position: i + 1 }, after: { position: j + 1 } }, tx);
    });
    revalidatePath("/admin/installments");
    revalidatePath("/");
    return "Order updated";
  });
}

export async function deleteListingAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const l = await db.installmentListing.findUniqueOrThrow({ where: { id: str(f, "id") }, include: { _count: { select: { sales: true } } } });
    await db.$transaction(async (tx) => {
      // Keep the history of sales made on this plan: detach, then remove the listing.
      if (l._count.sales) await tx.installmentSale.updateMany({ where: { listingId: l.id }, data: { listingId: null } });
      await tx.installmentListing.delete({ where: { id: l.id } });
      await audit({ staffId: staff.id, action: "INSTALLMENT_LISTING_DELETED", entityType: "INSTALLMENT", entityId: l.id, recordLabel: l.model, before: { model: l.model, regularPrice: l.regularPrice, installmentTotal: l.installmentTotal } }, tx);
    });
    revalidatePath("/admin/installments");
    revalidatePath("/");
    return "Listing removed";
  });
}

// ─────────────── Installment requests & appointments (v6 §7) ───────────────

const REQUEST_STATUSES = ["NEW", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];

export async function installmentRequestStatusAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const status = str(f, "status");
    if (!REQUEST_STATUSES.includes(status)) throw new Error("Choose a status");
    const r = await db.installmentRequest.findUniqueOrThrow({ where: { id: str(f, "id") } });
    if (r.status === status) return "No change";
    await db.$transaction(async (tx) => {
      await tx.installmentRequest.update({ where: { id: r.id }, data: { status } });
      await audit({ staffId: staff.id, action: "INSTALLMENT_APPOINTMENT_STATUS", entityType: "INSTALLMENT", entityId: r.id, recordLabel: r.ref, before: { status: r.status }, after: { status } }, tx);
    });
    revalidatePath("/admin/installments");
    return status === "CANCELLED" ? "Cancelled — the slot is free again" : "Status updated";
  });
}
