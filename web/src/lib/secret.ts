/**
 * Single source for the signing secret (sessions, order tokens, sandbox signatures).
 * Production refuses to run without a strong AUTH_SECRET — the code is public, so any
 * built-in fallback would let anyone forge staff sessions.
 */
export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  }
  return "local-development-secret-not-for-production";
}
