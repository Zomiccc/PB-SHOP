import { NextResponse } from "next/server";
import { getStaff } from "@/lib/staff";

const EDIT_COOKIE = "pb_edit";

/** Turns website edit mode on (owner only) or off, then opens the page to edit. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const on = url.searchParams.get("on") === "1";
  const next = url.searchParams.get("next");
  const dest = new URL(next && next.startsWith("/") && !next.startsWith("//") ? next : "/", url);
  const staff = await getStaff();
  if (on && (!staff || staff.role !== "SUPER_ADMIN" || staff.mustChangePassword)) return NextResponse.redirect(new URL("/admin/login", url), 303);
  const res = NextResponse.redirect(dest, 303);
  if (on) res.cookies.set(EDIT_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: 12 * 3600 });
  else res.cookies.delete(EDIT_COOKIE);
  return res;
}
