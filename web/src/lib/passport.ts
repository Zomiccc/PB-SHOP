import type { Prisma, PrismaClient } from "@prisma/client";
import { addMonths, earnPoints } from "./loyalty";
import { getSetting } from "./settings";
import { audit } from "./audit";
import { PassportError } from "./passport-rules";

/**
 * PB Phone Passport membership rules (Passport requirements, final v2):
 *  - Birthday: month + day only; the year is never required (§2).
 *  - Welcome reward: 25 points, once, when a customer joins — online sign-up, staff-issued card, or a
 *    walk-in/guest profile claimed as an account (§4).
 *  - Referral reward: 25 points to the referrer, once per referred friend, when that friend's first paid
 *    purchase or completed repair goes through — so a sign-up alone can't farm points (§3).
 *  - Card expiry: an admin field, set from the default validity when the card is issued (§1).
 * All rewards are ordinary points lots, so the existing expiry / redemption / reversal rules apply unchanged.
 */

type Tx = Prisma.TransactionClient | PrismaClient;

export { MONTHS, PassportError, formatBirthday, formatCardExpiry, parseBirthday } from "./passport-rules";

/**
 * Onboards a Passport member: sets the card expiry from the default validity (if none yet) and credits
 * the welcome reward once. Idempotent — safe to call again for the same customer.
 */
export async function welcomeMember(tx: Tx, customerId: string, staffId: string | null = null, now = new Date()) {
  const [rules, card] = await Promise.all([getSetting("passport", tx as Prisma.TransactionClient), getSetting("passportCard", tx as Prisma.TransactionClient)]);
  const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { cardExpiresAt: true } });
  if (!c.cardExpiresAt && card.validityMonths > 0) {
    await tx.customer.update({ where: { id: customerId }, data: { cardExpiresAt: addMonths(now, card.validityMonths) } });
  }
  if (rules.welcomePoints <= 0) return null;
  if (await tx.loyaltyTransaction.findFirst({ where: { customerId, source: "WELCOME" }, select: { id: true } })) return null;
  return earnPoints(tx, { customerId, points: rules.welcomePoints, source: "WELCOME", reason: "Welcome reward — joined PB Phone Passport", staffId, now });
}

/**
 * Finds the referrer for a code typed on the Passport form: their Passport ID (PBP-123456) or mobile number.
 * Returns null for an empty code; throws for an unknown code or a self-referral.
 */
export async function findReferrer(tx: Tx, code: string | null | undefined, selfPhone: string) {
  const raw = (code ?? "").trim();
  if (!raw) return null;
  const phone = raw.replace(/[\s-]/g, "");
  const referrer = /^(\+92|0)?3\d{9}$/.test(phone)
    ? await tx.customer.findUnique({ where: { phone }, select: { id: true, phone: true, name: true } })
    : await tx.customer.findUnique({ where: { passportNo: raw.toUpperCase() }, select: { id: true, phone: true, name: true } });
  if (!referrer) throw new PassportError("We couldn't find that referral code — check the friend's Passport ID or mobile number");
  if (referrer.phone === selfPhone) throw new PassportError("You can't refer yourself");
  return referrer;
}

/**
 * Credits the referral reward to whoever referred this customer — once, on the customer's first paid
 * purchase or completed repair. Call inside the same transaction that confirms the order / repair.
 * The referrer's lot is deliberately not linked to the friend's order, so reversing that order never
 * touches the referrer's points (existing reversal rules unchanged).
 */
export async function creditReferral(tx: Tx, customerId: string, trigger: string, staffId: string | null = null, now = new Date()) {
  const c = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, passportNo: true, referredById: true, referralRewardedAt: true } });
  if (!c?.referredById || c.referralRewardedAt) return null;
  const rules = await getSetting("passport", tx as Prisma.TransactionClient);
  // Mark first (even at 0 points) so it can only ever happen once per referred customer.
  const claimed = await tx.customer.updateMany({ where: { id: c.id, referralRewardedAt: null }, data: { referralRewardedAt: now } });
  if (!claimed.count || rules.referralPoints <= 0) return null;
  const first = c.name.trim().split(/\s+/)[0];
  const lot = await earnPoints(tx, { customerId: c.referredById, points: rules.referralPoints, source: "REFERRAL", reason: `Referral reward — ${first} (${c.passportNo}) ${trigger}`, staffId, now });
  await audit({ staffId, action: "REFERRAL_REWARDED", entityType: "LOYALTY", entityId: c.referredById, recordLabel: `Referral of ${c.name} (${c.passportNo})`, after: { points: rules.referralPoints, trigger } }, tx);
  return lot;
}
