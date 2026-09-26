import { describe, expect, it } from "vitest";
import { lowestInstallment, minDownPayment, quote, termList, type FinancingConfig } from "@/lib/finance";

const cfg: FinancingConfig = {
  enabled: true,
  partnerName: "Partner",
  minDownPaymentPercent: 30,
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
    expect(q.perInstallment).toBe(14117); // ceil(84,700 / 6)
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
