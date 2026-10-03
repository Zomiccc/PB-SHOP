import "server-only";
import { cache } from "react";
import { db } from "./db";

/** Setting row written when the owner sets up the admin password; from then on demo mode is off for good. */
export const ADMIN_SECURITY_KEY = "adminSecurity";

/**
 * Demo mode: the staff area opens without a password so a client can explore it. It is on while the site
 * uses the SANDBOX test gateway, until the owner sets up the admin password (Admin → Security) — after that
 * the admin always needs email + password. ADMIN_DEMO_MODE=0 forces it off; ADMIN_DEMO_MODE=1 forces it on.
 */
export const isDemoMode = cache(async () => {
  const flag = process.env.ADMIN_DEMO_MODE;
  if (flag === "1") return true;
  if (flag === "0") return false;
  if ((process.env.PAYMENT_PROVIDER ?? "SANDBOX") !== "SANDBOX") return false;
  try {
    return !(await db.setting.findUnique({ where: { key: ADMIN_SECURITY_KEY } }));
  } catch {
    return false; // fail closed
  }
});
