import crypto from "node:crypto";
import { authSecret } from "./secret";

/** Unguessable token so order confirmation pages can't be enumerated by order number. */
export function orderToken(orderNumber: string) {
  return crypto.createHmac("sha256", authSecret()).update(`order:${orderNumber}`).digest("hex").slice(0, 24);
}

export function verifyOrderToken(orderNumber: string, token: string | null | undefined) {
  if (!token) return false;
  const expected = orderToken(orderNumber);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
