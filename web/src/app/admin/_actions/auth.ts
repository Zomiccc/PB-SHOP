"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, endStaffSession, getStaff, startStaffSession } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { headers } from "next/headers";

export type FormState = { ok?: boolean; error?: string; message?: string } | null;

/** Staff login with per-IP+email throttling; every attempt is recorded for the super admin (§16). */
export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = await clientIp();
  const ua = (await headers()).get("user-agent");

  const rl = rateLimit(`staff-login:${ip}:${email}`, 5, 15 * 60_000);
  if (!rl.ok) return { error: `Too many attempts. Try again in ${Math.ceil((rl.retryAfter ?? 60) / 60)} minutes.` };

  const staff = await db.staff.findUnique({ where: { email } });
  const valid = staff?.active ? await bcrypt.compare(password, staff.passwordHash) : false;
  if (!staff || !valid) {
    if (staff) await db.staffLoginEvent.create({ data: { staffId: staff.id, type: "LOGIN_FAILED", ip, userAgent: ua } });
    return { error: "Incorrect email or password" };
  }

  await db.$transaction([
    db.staffLoginEvent.create({ data: { staffId: staff.id, type: "LOGIN", ip, userAgent: ua } }),
    db.staff.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } }),
  ]);
  await startStaffSession(staff.id);
  redirect(staff.mustChangePassword ? "/admin/password" : "/admin");
}

export async function logoutAction() {
  const staff = await getStaff();
  if (staff) await db.staffLoginEvent.create({ data: { staffId: staff.id, type: "LOGOUT", ip: await clientIp() } });
  await endStaffSession();
  redirect("/admin/login");
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 10) return { error: "New password must be at least 10 characters" };
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return { error: "Use letters and at least one number" };
  if (next !== confirm) return { error: "Passwords don't match" };
  const row = await db.staff.findUniqueOrThrow({ where: { id: staff.id } });
  if (!(await bcrypt.compare(current, row.passwordHash))) return { error: "Current password is incorrect" };
  if (await bcrypt.compare(next, row.passwordHash)) return { error: "Choose a different password from the current one" };
  await db.staff.update({ where: { id: staff.id }, data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false } });
  await audit({ staffId: staff.id, action: "PASSWORD_CHANGED", entityType: "STAFF", entityId: staff.id, recordLabel: staff.name, ip: await clientIp() });
  redirect("/admin");
}
