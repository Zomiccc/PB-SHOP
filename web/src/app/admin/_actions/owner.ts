"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { SETTING_DEFAULTS, getSetting, type SettingKey } from "@/lib/settings";
import type { FormState } from "./auth";
import { bool, diff, int, run, str } from "./util";

/** Super-admin-only configuration (§16, §18). Every change is audited with before/after. */

export async function saveSettingAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const key = str(f, "key") as SettingKey;
    if (!(key in SETTING_DEFAULTS)) throw new Error("Unknown setting");
    const before = await getSetting(key);
    const next: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(SETTING_DEFAULTS[key])) {
      if (typeof def === "boolean") next[k] = bool(f, k);
      else if (typeof def === "number") {
        const n = int(f, k);
        if (n == null || n < 0) throw new Error(`${k} must be a positive number`);
        next[k] = n;
      } else next[k] = str(f, k);
    }
    await db.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } });
    const d = diff(before as Record<string, unknown>, next);
    await audit({ staffId: staff.id, action: "SETTING_CHANGED", entityType: "SETTING", entityId: key, recordLabel: key, before: d.before, after: d.after });
    revalidatePath("/admin/settings");
    return "Settings saved";
  });
}

/** Care Card service definitions — create/edit/reorder/activate (owner only, §18). */
export async function saveCareServiceAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const visitNumber = int(f, "visitNumber");
    if (!visitNumber || visitNumber < 1 || visitNumber > 10) throw new Error("Visit number must be 1–10");
    const name = str(f, "name");
    if (name.length < 3) throw new Error("Service name is required");
    const id = str(f, "id");
    const data = { visitNumber, name, description: str(f, "description") || null, active: bool(f, "active"), configured: true };
    await db.$transaction(async (tx) => {
      if (id) {
        const before = await tx.careCardService.findUniqueOrThrow({ where: { id } });
        if (before.visitNumber !== visitNumber) {
          // Reorder: swap with whichever service holds the target visit number.
          const other = await tx.careCardService.findUnique({ where: { visitNumber } });
          if (other) {
            await tx.careCardService.update({ where: { id: other.id }, data: { visitNumber: -1 } });
            await tx.careCardService.update({ where: { id }, data });
            await tx.careCardService.update({ where: { id: other.id }, data: { visitNumber: before.visitNumber } });
          } else await tx.careCardService.update({ where: { id }, data });
        } else await tx.careCardService.update({ where: { id }, data });
        const d = diff(before as unknown as Record<string, unknown>, data);
        await audit({ staffId: staff.id, action: "CARE_SERVICE_CHANGED", entityType: "CARE_SERVICE", entityId: id, recordLabel: `Visit ${visitNumber}`, before: d.before, after: d.after }, tx);
      } else {
        if (await tx.careCardService.findUnique({ where: { visitNumber } })) throw new Error(`Visit ${visitNumber} already exists — edit it instead`);
        const s = await tx.careCardService.create({ data });
        await audit({ staffId: staff.id, action: "CARE_SERVICE_CREATED", entityType: "CARE_SERVICE", entityId: s.id, recordLabel: `Visit ${visitNumber}`, after: data }, tx);
      }
    });
    revalidatePath("/admin/settings");
    return "Care Card service saved";
  });
}

export async function saveRewardAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const pointsCost = int(f, "pointsCost");
    if (!pointsCost || pointsCost < 1) throw new Error("Points cost is required");
    const data = { name: str(f, "name"), description: str(f, "description") || null, pointsCost, active: bool(f, "active") };
    if (data.name.length < 3) throw new Error("Reward name is required");
    const id = str(f, "id");
    const before = id ? await db.reward.findUnique({ where: { id } }) : null;
    const r = id ? await db.reward.update({ where: { id }, data }) : await db.reward.create({ data });
    await audit({ staffId: staff.id, action: id ? "REWARD_UPDATED" : "REWARD_CREATED", entityType: "LOYALTY", entityId: r.id, recordLabel: r.name, before, after: data });
    revalidatePath("/admin/settings");
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
