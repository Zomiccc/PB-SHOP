/**
 * Demo mode: the staff area opens without a password so a client can explore it.
 * On while the site uses the SANDBOX test gateway (unless ADMIN_DEMO_MODE=0);
 * force it with ADMIN_DEMO_MODE=1. It switches off automatically once real payments
 * (e.g. PAYMENT_PROVIDER=JAZZCASH) are configured — never ship a live shop with it on.
 */
export function isDemoMode() {
  const flag = process.env.ADMIN_DEMO_MODE;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return (process.env.PAYMENT_PROVIDER ?? "SANDBOX") === "SANDBOX";
}
