import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/demo";
import { startStaffSession } from "@/lib/staff";

/** Demo mode only: signs the visitor in as the owner (default) or an employee, no password. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!isDemoMode()) return NextResponse.redirect(new URL("/admin/login", url), 303);
  const role = url.searchParams.get("role") === "employee" ? "ADMIN" : "SUPER_ADMIN";
  const staff = await db.staff.findFirst({ where: { role, active: true }, orderBy: { email: "asc" } });
  if (!staff) return NextResponse.redirect(new URL("/admin/login", url), 303);
  await db.staffLoginEvent.create({ data: { staffId: staff.id, type: "LOGIN", ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null, userAgent: "demo-mode" } });
  await startStaffSession(staff.id);
  const next = url.searchParams.get("next");
  return NextResponse.redirect(new URL(next && next.startsWith("/admin") ? next : "/admin", url), 303);
}
