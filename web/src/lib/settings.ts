import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Defaults are used until the super admin saves a value in the dashboard. */
export const SETTING_DEFAULTS = {
  socialProof: { enabled: true, intervalSeconds: 25, displaySeconds: 6, lookbackDays: 14, maxItems: 20 },
  // PB Phone Passport (master brief §4). Stored under a new key so older saved loyalty rules can't override these.
  passport: {
    repairPoints: 10, // per completed repair
    newPhonePoints: 20, // per new phone bought
    usedPhonePoints: 15, // per used phone bought
    expiryMonths: 6, // each earning event expires six months after it was earned
    exclusions: "Points are earned on repairs and phone purchases only — not on accessories, delivery fees, or orders that are cancelled or returned. Repair rewards exclude the cost of parts.",
  },
  shipping: { flatFee: 250, freeOver: 50000 },
  // SAMPLE rates — replace with the financing partner's real rates in Admin → Settings.
  financing: {
    enabled: true,
    partnerName: "our financing partner",
    minDownPaymentPercent: 30,
    termOptions: "3,6,9,12",
    period: "MONTHLY",
    markupPercentPerMonth: 3,
    serviceFeePercent: 2,
    riskFeePercent: 1,
    guaranteeDeposit: 0,
    minPrice: 20000,
    disclaimer: "Estimate only. Final installment, fees and approval are confirmed by the financing partner after KYC.",
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
