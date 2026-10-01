import { describe, expect, it } from "vitest";
import { downPaymentList, lowestInstallment, minDownPayment, quote, termList, type FinancingConfig } from "@/lib/finance";
import { SETTING_DEFAULTS } from "@/lib/settings";

const cfg: FinancingConfig = {
  enabled: true,
  partnerName: "Partner",
  minDownPaymentPercent: 30,
  downPaymentOptions: "30,40,50",
  termOptions: "12, 3,6,9,6",
  period: "MONTHLY",
  markupPercentPerMonth: 3,
  serviceFeePercent: 2,
  riskFeePercent: 1,
  guaranteeDeposit: 1000,
  minPrice: 20000,
  disclaimer: "",
};

describe("Installment calculator", () => {
  it("parses and de-duplicates plans", () => {
    expect(termList(cfg)).toEqual([3, 6, 9, 12]);
  });

  it("computes a monthly plan with markup, fees and deposit", () => {
    const q = quote(100000, 30000, 6, cfg);
    expect(q.financed).toBe(70000);
    expect(q.markup).toBe(12600); // 70,000 × 3% × 6
    expect(q.serviceFee).toBe(1400);
    expect(q.riskFee).toBe(700);
    expect(q.totalRepayable).toBe(84700);
    expect(q.perInstallment).toBe(14117); // 84,700 / 6, rounded
    expect(q.dueToday).toBe(31000); // down payment + deposit
  });

  it("never allows less than the minimum down payment", () => {
    expect(minDownPayment(100000, cfg)).toBe(30000);
    expect(quote(100000, 5000, 6, cfg).downPayment).toBe(30000);
  });

  it("converts weekly plans so the monthly markup applies fairly", () => {
    const weekly = quote(100000, 30000, 26, { ...cfg, period: "WEEKLY" }); // 26 weeks ≈ 6 months
    expect(weekly.markup).toBe(12600);
    expect(weekly.period).toBe("WEEKLY");
  });

  it("offers no installments below the eligible price or when disabled", () => {
    expect(lowestInstallment(15000, cfg)).toBeNull();
    expect(lowestInstallment(100000, { ...cfg, enabled: false })).toBeNull();
    expect(lowestInstallment(100000, cfg)?.terms).toBe(12);
  });
});

describe("Matches the partner (Palm) app exactly", () => {
  const palm = SETTING_DEFAULTS.installmentCalc;

  it("Tecno Spark 40 Pro, Rs 73,999: 30% down, 9 terms → Rs 8,863 per month", () => {
    const q = quote(73999, 22200, 9, palm);
    expect(q.downPayment).toBe(22200);
    expect(q.financed).toBe(51799);
    expect(q.perInstallment).toBe(8863);
    expect(q.serviceFee + q.riskFee + q.guaranteeDeposit).toBe(0); // no extra charges in the app
  });

  it("down-payment choices round like the app (Rs 22,200 / 29,600 / 37,000)", () => {
    expect([30, 40, 50].map((p) => Math.round((73999 * p) / 100))).toEqual([22200, 29600, 37000]);
  });

  it("minimum down payment is 30% — 10% and 20% are removed (v6 §6)", () => {
    expect(palm.minDownPaymentPercent).toBe(30);
    expect(downPaymentList(palm)).toEqual([30, 40, 50]);
    expect(downPaymentList({ ...palm, downPaymentOptions: "10,20,30,40,50" })).toEqual([30, 40, 50]); // never below the minimum
    expect(minDownPayment(73999, palm)).toBe(22200);
  });
});

import { brandSlugFor } from "@/lib/brands";

describe("Installment brand picker", () => {
  it("detects the brand from the model name", () => {
    expect(brandSlugFor(null, "TECNO Spark 40 Pro · 8GB / 256GB")).toBe("tecno");
    expect(brandSlugFor(null, "Infinix Note 40")).toBe("infinix");
    expect(brandSlugFor(null, "iPhone 15 · 128GB")).toBe("apple");
    expect(brandSlugFor(null, "Galaxy A55")).toBe("samsung");
    expect(brandSlugFor("Villaon", "V20")).toBe("villaon");
    expect(brandSlugFor(null, "realme C75")).toBe("realme");
  });
});
