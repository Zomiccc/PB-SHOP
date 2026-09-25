import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { STAFF_COOKIE, signSession, verifySession } from "./auth";
import type { StaffRole } from "./constants";
import { isDemoMode } from "./demo";

/**
 * Staff sessions (§16): one individual login per person, no shared credentials.
 * The session cookie is re-validated against the database on every request, so deactivating
 * an employee locks them out immediately.
 */

export type StaffUser = { id: string; name: string; email: string; role: StaffRole; mustChangePassword: boolean };

const SESSION_HOURS = 12;

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function startStaffSession(staffId: string) {
  (await cookies()).set(STAFF_COOKIE, await signSession({ sub: staffId, kind: "staff" }, `${SESSION_HOURS}h`), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function getStaff(): Promise<StaffUser | null> {
  const session = await verifySession<{ sub: string; kind: string }>((await cookies()).get(STAFF_COOKIE)?.value);
  if (!session || session.kind !== "staff") return null;
  const s = await db.staff.findUnique({ where: { id: session.sub } });
  if (!s || !s.active) return null;
  return { id: s.id, name: s.name, email: s.email, role: s.role as StaffRole, mustChangePassword: s.mustChangePassword && !isDemoMode() };
}

/** For admin pages: redirects to login, or to the password page if a reset is pending. */
export async function requireStaffPage(opts: { superAdmin?: boolean; allowPasswordChange?: boolean } = {}) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (staff.mustChangePassword && !opts.allowPasswordChange) redirect("/admin/password");
  if (opts.superAdmin && staff.role !== "SUPER_ADMIN") redirect("/admin?denied=1");
  return staff;
}

export class AuthError extends Error {}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireStaff(opts: { superAdmin?: boolean } = {}) {
  const staff = await getStaff();
  if (!staff) throw new AuthError("Not signed in");
  if (staff.mustChangePassword) throw new AuthError("Password change required");
  if (opts.superAdmin && staff.role !== "SUPER_ADMIN") throw new AuthError("Owner (super admin) access required");
  return staff;
}

export const isSuper = (s: StaffUser) => s.role === "SUPER_ADMIN";
