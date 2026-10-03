import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { authSecret } from "./lib/secret";

/**
 * Gatekeeper for the staff area. Pages still re-check the session against the database
 * (see src/lib/staff.ts); this just bounces anonymous visitors before any rendering happens.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get("pb_staff")?.value;
  let ok = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(authSecret()));
      ok = payload.kind === "staff";
    } catch {}
  }
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
