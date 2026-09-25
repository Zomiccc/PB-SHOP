import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { authSecret } from "./secret";

/**
 * Minimal signed-cookie sessions. Customers and staff use separate cookies so a staff login
 * never leaks into the storefront. Staff login, role checks and login/logout audit events are
 * built on the same helpers in the admin phase.
 */

const secret = () => new TextEncoder().encode(authSecret());

export const CUSTOMER_COOKIE = "pb_customer";
export const STAFF_COOKIE = "pb_staff";

export async function signSession(payload: Record<string, unknown>, expiresIn = "30d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifySession<T = Record<string, unknown>>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

export async function setCustomerSession(customerId: string) {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, await signSession({ sub: customerId, kind: "customer" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getCurrentCustomer() {
  const session = await verifySession<{ sub: string; kind: string }>((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!session || session.kind !== "customer") return null;
  return db.customer.findUnique({ where: { id: session.sub } });
}

export function newPassportNo() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `PBP-${n}`;
}
