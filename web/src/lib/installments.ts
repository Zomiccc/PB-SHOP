import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { earnPoints, spendPoints, syncBalance } from "./loyalty";
import { getSetting } from "./settings";
import { phoneTierPoints } from "./points-rules";
import { firstTransactionRewards } from "./passport";

/**
 * Installment phones (master brief §3). Informational only: there is no online "buy on installment"
 * or checkout — customers complete the purchase in store and must bring their CNIC / ID card.
 */

export const AVAILABILITY = {
  AVAILABLE: "Available",
  LIMITED: "Limited stock",
  OUT_OF_STOCK: "Out of stock",
} as const;
export type Availability = keyof typeof AVAILABILITY;

export const STORE_VISIT_NOTICE = "Installment purchases are completed in store only. Please visit PB Mobiles and bring your original CNIC / ID card.";

/** Monthly payment after the down payment, rounded up to the rupee. */
export function monthlyPayment(l: { installmentTotal: number; downPayment: number; durationMonths: number }) {
  if (l.durationMonths <= 0) return 0;
  return Math.ceil(Math.max(0, l.installmentTotal - l.downPayment) / l.durationMonths);
}

/** Validates an admin-entered plan; returns an error message or null. */
export function planProblem(l: { regularPrice: number; installmentTotal: number; downPayment: number; durationMonths: number; interestPercent: number }) {
  if (l.regularPrice <= 0) return "Regular price must be more than 0";
  if (l.installmentTotal <= 0) return "Installment total must be more than 0";
  if (l.downPayment < 0 || l.downPayment >= l.installmentTotal) return "Down payment must be less than the installment total";
  if (!Number.isInteger(l.durationMonths) || l.durationMonths < 1 || l.durationMonths > 60) return "Duration must be 1–60 months";
  if (l.interestPercent < 0 || l.interestPercent > 200) return "Interest must be between 0% and 200%";
  return null;
}

export function activeListings() {
  return db.installmentListing.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

/** 12345-1234567-1 */
export function formatCnic(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : raw;
}

/** CNIC shown in lists and audit entries: 35202-*******-1 */
export const maskCnic = (c: string) => `${c.slice(0, 5)}-*******-${c.slice(-1)}`;

/** Statuses where the customer has the phone: the sale counts as a purchase for PB Points. */
export const HANDED_OVER = ["ACTIVE", "COMPLETED"];

/** The phone value the points tiers use: the cash price entered, else the listing's regular price, else the plan total. */
export const installmentPhoneValue = (s: { phoneValue: number | null; totalPrice: number; listing?: { regularPrice: number } | null }) =>
  s.phoneValue ?? s.listing?.regularPrice ?? s.totalPrice;

/**
 * PB Points for an installment phone (v4 §3: same phone tiers, on the phone's value), once the phone is
 * handed over. Also counts as the customer's first transaction for the welcome / referral rewards. Idempotent.
 */
export async function awardInstallmentPoints(tx: Prisma.TransactionClient, saleId: string, staffId: string | null) {
  const s = await tx.installmentSale.findUniqueOrThrow({ where: { id: saleId }, include: { listing: true } });
  if (!s.customerId) return 0;
  await firstTransactionRewards(tx, s.customerId, `installment ${s.ref}`, staffId);
  if (await tx.loyaltyTransaction.findFirst({ where: { installmentSaleId: s.id, type: "EARN" } })) return 0;
  const rules = await getSetting("passport", tx);
  const pts = phoneTierPoints(installmentPhoneValue(s), rules.phoneTiers);
  if (pts > 0) await earnPoints(tx, { customerId: s.customerId, points: pts, source: "INSTALLMENT_PHONE", reason: `Installment phone — ${s.ref} · ${s.phoneModel}`, installmentSaleId: s.id, staffId });
  return pts;
}

/** Cancelled after hand-over: reverses the sale's points like an order return (unspent first, then the balance). */
export async function reverseInstallmentPoints(tx: Prisma.TransactionClient, saleId: string, staffId: string | null) {
  const s = await tx.installmentSale.findUniqueOrThrow({ where: { id: saleId } });
  const lots = await tx.loyaltyTransaction.findMany({ where: { installmentSaleId: s.id, type: "EARN", remaining: { gt: 0 } } });
  const all = await tx.loyaltyTransaction.findMany({ where: { installmentSaleId: s.id, type: "EARN" } });
  const pts = all.reduce((n, t) => n + t.points, 0);
  if (!pts || !s.customerId || (await tx.loyaltyTransaction.findFirst({ where: { installmentSaleId: s.id, type: "ADJUST" } }))) return 0;
  for (const lot of lots) await tx.loyaltyTransaction.update({ where: { id: lot.id }, data: { remaining: 0 } });
  const unspent = lots.reduce((n, t) => n + (t.remaining ?? 0), 0);
  await tx.loyaltyTransaction.create({ data: { customerId: s.customerId, type: "ADJUST", points: -unspent, installmentSaleId: s.id, reason: `Cancelled installment ${s.ref}`, staffId } });
  if (pts - unspent > 0) await spendPoints(tx, { customerId: s.customerId, points: pts - unspent, type: "ADJUST", reason: `Cancelled installment ${s.ref} (points already used)`, staffId, allowPartial: true });
  else await syncBalance(tx, s.customerId);
  return pts;
}
