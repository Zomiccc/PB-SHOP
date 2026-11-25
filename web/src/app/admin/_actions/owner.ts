"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { SETTING_DEFAULTS, getSetting, type SettingKey } from "@/lib/settings";
import { parseTiers } from "@/lib/points-rules";
import type { CompanyPolicy } from "@/lib/finance";
import type { FormState } from "./auth";
import { bool, diff, int, run, str } from "./util";

/** Super-admin-only configuration. Every change is audited with before/after values (master brief §14). */

/** The smallest number in "20,30,40" (0–99), or null. */
function lowestChoice(v: string) {
  const nums = v.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n < 100);
  return nums.length ? Math.min(...nums) : null;
}

export async function saveSettingAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const key = str(f, "key") as SettingKey;
    if (!(key in SETTING_DEFAULTS)) throw new Error("Unknown setting");
    const before = await getSetting(key);
    // Follow-up (25 Nov): no separate "Min. down payment" box — the lowest down-payment choice is the minimum.
    if (key === "installmentCalc") {
      const low = lowestChoice(str(f, "downPaymentOptions"));
      if (low == null) throw new Error("Enter the down-payment choices, e.g. 20,30,40");
      f.set("minDownPaymentPercent", String(low));
    }
    const next: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(SETTING_DEFAULTS[key])) {
      // Structured values (e.g. per-company installment policies) have their own form: keep them as they are.
      if (def !== null && typeof def === "object") next[k] = (before as Record<string, unknown>)[k];
      else if (typeof def === "boolean") next[k] = bool(f, k);
      else if (typeof def === "number") {
        // Decimals allowed (e.g. 2.5% fees), kept to 2 places.
        const n = Number(str(f, k).replace(/,/g, ""));
        if (!Number.isFinite(n) || n < 0 || str(f, k) === "") throw new Error(`${k} must be a positive number`);
        next[k] = Math.round(n * 100) / 100;
      } else next[k] = str(f, k);
    }
    if (key === "passport" && Number(next.expiryMonths) < 1) throw new Error("Points must last at least 1 month");
    if (key === "passport" && Number(next.rupeesPerPoint) < 1) throw new Error("Rs per point must be at least 1");
    if (key === "passport" && !parseTiers(String(next.phoneTiers)).length) throw new Error("Enter the phone tiers as price:points, e.g. 10000:50, 30000:100");
    await db.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
    const d = diff(before as Record<string, unknown>, next);
    await audit({ staffId: staff.id, action: "SETTING_CHANGED", entityType: "SETTING", entityId: key, recordLabel: key, before: d.before, after: d.after });
    revalidatePath("/admin/settings");
    return "Settings saved";
  });
}

/**
 * Phone Passport rewards (master brief §4): the Super Admin creates, edits, enables/disables rewards and
 * changes points, descriptions and exclusions. Every change is audited with before/after values.
 */
export async function saveRewardAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const pointsCost = int(f, "pointsCost");
    if (!pointsCost || pointsCost < 1) throw new Error("Points required must be at least 1");
    const kind = str(f, "kind") === "REPAIR_DISCOUNT" ? "REPAIR_DISCOUNT" : "ITEM";
    const discountPercent = kind === "REPAIR_DISCOUNT" ? int(f, "discountPercent") : null;
    if (kind === "REPAIR_DISCOUNT" && (!discountPercent || discountPercent < 1 || discountPercent > 100)) throw new Error("Discount must be 1–100%");
    const data = {
      name: str(f, "name"),
      description: str(f, "description") || null,
      pointsCost,
      kind,
      appliesTo: kind === "REPAIR_DISCOUNT" ? "REPAIR" : str(f, "appliesTo") === "REPAIR" ? "REPAIR" : "ACCESSORY",
      discountPercent,
      exclusions: str(f, "exclusions") || null,
      sortOrder: int(f, "sortOrder") ?? 0,
      active: bool(f, "active"),
    };
    if (data.name.length < 3) throw new Error("Reward name is required");
    const id = str(f, "id");
    if (id) {
      const before = await db.reward.findUniqueOrThrow({ where: { id } });
      const d = diff(before as unknown as Record<string, unknown>, data);
      if (!d.changed) return "No changes";
      await db.$transaction(async (tx) => {
        await tx.reward.update({ where: { id }, data });
        await audit({ staffId: staff.id, action: before.active !== data.active ? (data.active ? "REWARD_ENABLED" : "REWARD_DISABLED") : "REWARD_UPDATED", entityType: "REWARD", entityId: id, recordLabel: data.name, before: d.before, after: d.after }, tx);
      });
    } else {
      await db.$transaction(async (tx) => {
        const r = await tx.reward.create({ data });
        await audit({ staffId: staff.id, action: "REWARD_CREATED", entityType: "REWARD", entityId: r.id, recordLabel: r.name, after: data }, tx);
      });
    }
    revalidatePath("/admin/settings");
    revalidatePath("/loyalty");
    return "Reward saved";
  });
}

// ─────────────── Staff accounts (6 employees + 1 owner) ───────────────

export async function saveStaffAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const id = str(f, "id");
    const email = str(f, "email").toLowerCase();
    const name = str(f, "name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Valid email required");
    if (name.length < 2) throw new Error("Name required");
    const role = str(f, "role") === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
    const active = bool(f, "active");
    if (id === staff.id && (!active || role !== "SUPER_ADMIN")) throw new Error("You can't deactivate or demote your own owner account");
    const clash = await db.staff.findFirst({ where: { email, NOT: id ? { id } : undefined } });
    if (clash) throw new Error("Email already used by another account");
    if (id) {
      const before = await db.staff.findUniqueOrThrow({ where: { id } });
      await db.staff.update({ where: { id }, data: { name, email, role, active } });
      await audit({ staffId: staff.id, action: "STAFF_UPDATED", entityType: "STAFF", entityId: id, recordLabel: name, before: { name: before.name, email: before.email, role: before.role, active: before.active }, after: { name, email, role, active } });
      revalidatePath("/admin/staff");
      return "Account updated";
    }
    const temp = crypto.randomBytes(6).toString("base64url");
    const s = await db.staff.create({ data: { name, email, role, active: true, passwordHash: await bcrypt.hash(temp, 10), mustChangePassword: true } });
    await audit({ staffId: staff.id, action: "STAFF_CREATED", entityType: "STAFF", entityId: s.id, recordLabel: name, after: { email, role } });
    revalidatePath("/admin/staff");
    return `Account created. Temporary password: ${temp} (they must change it on first login)`;
  });
}

export async function resetStaffPasswordAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const s = await db.staff.findUniqueOrThrow({ where: { id: str(f, "id") } });
    const temp = crypto.randomBytes(6).toString("base64url");
    await db.staff.update({ where: { id: s.id }, data: { passwordHash: await bcrypt.hash(temp, 10), mustChangePassword: true } });
    await audit({ staffId: staff.id, action: "STAFF_PASSWORD_RESET", entityType: "STAFF", entityId: s.id, recordLabel: s.name });
    return `Temporary password for ${s.name}: ${temp}`;
  });
}

/**
 * Installment policy per company (Nov 2026): minimum down payment, down-payment choices, plan lengths and markup
 * for each brand. An empty box means "same as the main calculator settings". Audited like other settings.
 */
export async function saveCompanyPoliciesAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const before = await getSetting("installmentCalc");
    const slugs = str(f, "brands").split(",").filter(Boolean);
    const companies: Record<string, CompanyPolicy> = {};
    const list = (v: string, name: string) => {
      if (!v) return undefined;
      const parts = v.split(/[,\s]+/).filter(Boolean).map(Number);
      if (!parts.length || parts.some((n) => !Number.isFinite(n) || n <= 0)) throw new Error(`${name}: use numbers separated by commas, e.g. 20,30,40`);
      return parts.join(",");
    };
    for (const slug of slugs) {
      const num = (k: string) => {
        const v = str(f, `${slug}.${k}`);
        if (v === "") return undefined;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n >= 100) throw new Error(`${slug}: ${k} must be a number from 0 to 99`);
        return Math.round(n * 100) / 100;
      };
      const options = list(str(f, `${slug}.downPaymentOptions`), `${slug} down payments`);
      const p: CompanyPolicy = {
        // The lowest down-payment choice is that company's minimum (no separate box).
        minDownPaymentPercent: options ? lowestChoice(options) ?? undefined : undefined,
        downPaymentOptions: options,
        termOptions: list(str(f, `${slug}.termOptions`), `${slug} plans`),
        markupPercentPerMonth: num("markupPercentPerMonth"),
      };
      const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as CompanyPolicy;
      if (Object.keys(clean).length) companies[slug] = clean;
    }
    const next = { ...before, companies };
    await db.setting.upsert({ where: { key: "installmentCalc" }, create: { key: "installmentCalc", value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
    await audit({ staffId: staff.id, action: "SETTING_CHANGED", entityType: "SETTING", entityId: "installmentCalc", recordLabel: "Installment policies per company", before: { companies: before.companies }, after: { companies } });
    revalidatePath("/admin/settings");
    revalidatePath("/installments");
    return "Company policies saved";
  });
}
