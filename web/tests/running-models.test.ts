/**
 * Installments on the partner app's running models only (client request, 3 Oct 2026): no iPhone.
 */
import { describe, expect, it } from "vitest";
import { INSTALLMENT_BRANDS, isApplePhone } from "@/lib/brands";
import { quote } from "@/lib/finance";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { RUNNING_MODELS } from "../prisma/running-models";

describe("Running models on installments", () => {
  it("has the 47 models from the four brand lists, each with price, memory, model no. and colours", () => {
    expect(RUNNING_MODELS).toHaveLength(47);
    expect(new Set(RUNNING_MODELS.map((m) => m.brand))).toEqual(new Set(["infinix", "itel", "nubia", "oppo"]));
    for (const m of RUNNING_MODELS) {
      expect(m.price).toBeGreaterThan(10000);
      expect(m.ram).toMatch(/^\d+GB$/);
      expect(m.storage).toMatch(/^\d+GB$/);
      expect(m.modelNo).not.toBe("");
      expect(m.colors.length).toBeGreaterThan(2);
    }
    expect(RUNNING_MODELS.find((m) => m.modelNo === "X6879")).toMatchObject({ name: "Infinix NOTE 60", price: 109999 });
  });

  it("prices plans with the calculator: 30% down, 9 months (matches the partner app's Tecno figures)", () => {
    const q = quote(73999, 0, 9, SETTING_DEFAULTS.installmentCalc);
    expect(q.downPayment).toBe(22200);
    expect(q.perInstallment).toBe(8863);
  });

  it("no installments on iPhone", () => {
    expect(INSTALLMENT_BRANDS.some((b) => b.slug === "apple")).toBe(false);
    expect(isApplePhone("iPhone 15 · 128GB")).toBe(true);
    expect(isApplePhone("Apple iPhone 16 Pro")).toBe(true);
    expect(isApplePhone("Infinix NOTE 60")).toBe(false);
  });
});
