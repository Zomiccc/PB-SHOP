import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Defaults are used until the super admin saves a value in the dashboard. */
export const SETTING_DEFAULTS = {
  socialProof: { enabled: true, intervalSeconds: 25, displaySeconds: 6, lookbackDays: 14, maxItems: 20 },
  // PB Phone Passport (master brief §4). Stored under a new key so older saved loyalty rules can't override these.
  passport: {
    // Standard awarding criteria (Passport requirements v4 §3, see src/lib/points-rules.ts):
    rupeesPerPoint: 100, // repairs & accessories: 1 point per Rs 100 spent
    phoneTiers: "10000:50, 30000:100, 50000:150, 80000:200", // phone price from : points (also installment phones)
    expiryMonths: 6, // each earning event expires six months after it was earned
    welcomePoints: 25, // once, when a customer joins PB Rewards (Passport brief §4)
    referralPoints: 25, // to the referrer, once per referred friend's first purchase or repair (Passport brief §3)
    exclusions: "Points can be accumulated until redeemed or expired. Redeemed points cannot be restored. No points are earned on redeemed rewards. Points from refunded or cancelled transactions are reversed. Points are calculated on the eligible / net amount after discounts (not on delivery fees or tablets).",
  },
  // PB Rewards card expiry (Passport brief §1). The expiry is an admin field: it is never printed on the
  // physical card, and shown on the customer's digital card only when `showExpiryOnDigital` is on.
  passportCard: { showExpiryOnDigital: false, validityMonths: 24 },
  // Custom Skins page (v4 §9–§11). Skin types and their prices are managed in Admin → Custom skins → Skin types;
  // the camera-cover add-on is charged on top (0 = included).
  customSkins: { enabled: true, cameraCoverPrice: 0 },
  // Installment appointments (v6 §7): bookable store visits, in Pakistan time. Times are "HH:MM" (24h); a slot
  // takes `perSlot` bookings; `closedDates` = "YYYY-MM-DD, …" (Eid etc.). Shop hours: Mon–Sat 11–9, Sun 2–8.
  installmentAppointments: {
    enabled: true,
    slots: "11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 18:00, 19:00, 20:00",
    sundaySlots: "14:00, 15:00, 16:00, 17:00, 18:00, 19:00",
    perSlot: 2,
    daysAhead: 14,
    leadHours: 2,
    closedDates: "",
  },
  shipping: { flatFee: 250, freeOver: 50000 },
  // Installment calculator — defaults match the partner (Palm) app's standard plan: 6% flat per month,
  // no extra fees. New key so older saved sample rates don't override these.
  installmentCalc: {
    enabled: true,
    partnerName: "our financing partner",
    minDownPaymentPercent: 30, // v6 §6: plans start at 30% — 10% and 20% removed
    downPaymentOptions: "30,40,50",
    termOptions: "3,6,9", // the 12-month plan was removed (client request)
    period: "MONTHLY",
    markupPercentPerMonth: 6,
    serviceFeePercent: 0,
    riskFeePercent: 0,
    guaranteeDeposit: 0,
    minPrice: 10000,
    disclaimer: "The results shown are for estimation purposes only. Your actual repayment plan will be confirmed after approval.",
  },
};

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K];

export async function getSetting<K extends SettingKey>(key: K, client: Prisma.TransactionClient = db): Promise<SettingValue<K>> {
  const base = SETTING_DEFAULTS[key];
  const row = await client.setting.findUnique({ where: { key } });
  if (!row) return { ...base };
  try {
    return { ...base, ...JSON.parse(row.value) };
  } catch {
    return { ...base };
  }
}
