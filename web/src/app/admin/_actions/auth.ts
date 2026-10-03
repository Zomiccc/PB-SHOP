"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, endStaffSession, getStaff, startStaffSession } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { headers } from "next/headers";
import { ADMIN_SECURITY_KEY, isDemoMode } from "@/lib/demo";

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

/**
 * Admin security (client request): the owner sets their own sign-in email and password. While the site is in
 * demo mode the owner never had a password, so the current one isn't asked for; saving switches demo mode
 * off for good — from then on the admin always needs email + password.
 */
export async function setupAdminPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (staff.role !== "SUPER_ADMIN") return { error: "Only the owner can do this" };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address" };
  if (next.length < 10) return { error: "Password must be at least 10 characters" };
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return { error: "Use letters and at least one number" };
  if (next !== confirm) return { error: "Passwords don't match" };
  const row = await db.staff.findUniqueOrThrow({ where: { id: staff.id } });
  if (!(await isDemoMode()) && !(await bcrypt.compare(current, row.passwordHash))) return { error: "Current password is incorrect" };
  const taken = await db.staff.findUnique({ where: { email } });
  if (taken && taken.id !== staff.id) return { error: "Another staff account already uses that email" };
  await db.$transaction([
    db.staff.update({ where: { id: staff.id }, data: { email, passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false } }),
    db.setting.upsert({ where: { key: ADMIN_SECURITY_KEY }, create: { key: ADMIN_SECURITY_KEY, value: JSON.stringify({ passwordSetAt: new Date().toISOString(), by: staff.id }) }, update: { value: JSON.stringify({ passwordSetAt: new Date().toISOString(), by: staff.id }) } }),
  ]);
  await audit({ staffId: staff.id, action: "ADMIN_PASSWORD_SET", entityType: "STAFF", entityId: staff.id, recordLabel: staff.name, before: { email: row.email }, after: { email }, ip: await clientIp() });
  return { ok: true, message: `Saved. From now on sign in with ${email} and your new password.` };
}
