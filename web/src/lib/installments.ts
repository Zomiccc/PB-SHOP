import { db } from "./db";

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
