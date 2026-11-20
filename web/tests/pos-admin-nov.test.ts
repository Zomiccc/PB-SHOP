/**
 * POS / Admin fix list and website brief (Nov 2026): negotiated prices with a salesman's floor, points on the bill,
 * accessory bulk prices & offers, per-company installment policies, expenses, used-phone warranty and photos.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createPosSale, PosError } from "@/lib/pos";
import { applyPriceChange } from "@/lib/prices";
import { configFor, downPaymentList, headlinePlan, type FinancingConfig } from "@/lib/finance";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { expenseDate, pktDay } from "@/lib/expenses";
import { resolveExpenseCategory } from "@/lib/categories";
import { devicePhotoList } from "@/lib/device-photos";
import { NO_CHECK_WARRANTY, USED_WARRANTY, accessoryLabel } from "@/lib/constants";
import { earnPoints } from "@/lib/loyalty";
import { makeCustomer, makeStaff, makeVariant } from "./helpers";

describe("POS: negotiated price", () => {
  it("a salesman can go down to the offer / discount price, not below; the owner has no limit", async () => {
    const staff = await makeStaff();
    const owner = await makeStaff("SUPER_ADMIN");
    const v = await makeVariant({ stock: 5, price: 50000 });
    await db.variant.update({ where: { id: v.id }, data: { floorPrice: 47000 } });

    const ok = await createPosSale({ items: [{ variantId: v.id, qty: 1, unitPrice: 47000 }], method: "CASH" }, staff);
    expect(ok.total).toBe(47000);
    await expect(createPosSale({ items: [{ variantId: v.id, qty: 1, unitPrice: 46000 }], method: "CASH" }, staff)).rejects.toBeInstanceOf(PosError);
    // The discount box can't be used to get under the floor either.
    await expect(createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", discount: 5000 }, staff)).rejects.toThrow(/lowest total/i);
    const byOwner = await createPosSale({ items: [{ variantId: v.id, qty: 1, unitPrice: 40000 }], method: "CASH" }, owner);
    expect(byOwner.total).toBe(40000);
  });

  it("without an offer price the normal price is the salesman's floor", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 2, price: 3000, phone: false });
    await expect(createPosSale({ items: [{ variantId: v.id, qty: 1, unitPrice: 2900 }], method: "CASH" }, staff)).rejects.toBeInstanceOf(PosError);
  });
});

describe("POS: PB Points on the bill", () => {
  it("records points used for a reward and the balance after the sale", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: 120, source: "MANUAL", reason: "test" }));
    const reward = await db.reward.create({ data: { name: "Free screen protector", pointsCost: 50 } });
    const v = await makeVariant({ stock: 2, price: 2000, phone: false });
    const o = await createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", customerPhone: c.phone, rewardId: reward.id }, staff);
    const tx = await db.loyaltyTransaction.findMany({ where: { orderId: o.id } });
    expect(tx.find((t) => t.type === "REDEEM")?.points).toBe(-50);
    const earned = tx.filter((t) => t.type === "EARN").reduce((s, t) => s + t.points, 0);
    const after = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.loyaltyPoints).toBe(120 - 50 + earned);
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).pointsBalance).toBe(after.loyaltyPoints);
  });

  it("refuses a reward the customer can't afford, before anything is sold", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    const reward = await db.reward.create({ data: { name: "AirPods", pointsCost: 200 } });
    const v = await makeVariant({ stock: 2, price: 2000, phone: false });
    const before = await db.order.count();
    await expect(createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", customerPhone: c.phone, rewardId: reward.id }, staff)).rejects.toThrow(/needs 200 points/);
    expect(await db.order.count()).toBe(before);
  });
});

describe("Accessory prices & offers", () => {
  it("raises / lowers by % (rounded to Rs 10) or Rs, and adds / removes a % off offer", () => {
    expect(applyPriceChange({ price: 2999, salePrice: null }, "UP_PCT", 10)).toEqual({ price: 3300, salePrice: null });
    expect(applyPriceChange({ price: 3000, salePrice: null }, "DOWN_RS", 250)).toEqual({ price: 2750, salePrice: null });
    expect(applyPriceChange({ price: 3000, salePrice: null }, "OFFER_PCT", 15)).toEqual({ price: 3000, salePrice: 2550 });
    expect(applyPriceChange({ price: 3000, salePrice: 2550 }, "OFFER_OFF", 0)).toEqual({ price: 3000, salePrice: null });
  });
  it("a price change keeps an existing offer at the same % off", () => {
    expect(applyPriceChange({ price: 2000, salePrice: 1800 }, "UP_PCT", 10)).toEqual({ price: 2200, salePrice: 1980 });
  });
});

describe("Installments: each company's own policy", () => {
  const cfg = { ...SETTING_DEFAULTS.installmentCalc, companies: { infinix: { minDownPaymentPercent: 20, downPaymentOptions: "20,30,40", markupPercentPerMonth: 5 } } } as FinancingConfig;
  it("a company's settings override the main ones; others keep the main settings", () => {
    const inf = configFor(cfg, "infinix");
    expect(downPaymentList(inf)).toEqual([20, 30, 40]);
    expect(inf.markupPercentPerMonth).toBe(5);
    expect(configFor(cfg, "oppo")).toBe(cfg);
  });
  it("the headline plan uses the lowest down payment and the longest plan", () => {
    const q = headlinePlan(100000, configFor(cfg, "infinix"))!;
    expect(q.downPayment).toBe(20000);
    expect(q.terms).toBe(9);
    // 80,000 financed + 5% × 9 months markup, over 9 payments.
    expect(q.perInstallment).toBe(Math.round((80000 + 36000) / 9));
  });
});

describe("Expenses & categories", () => {
  it("an expense day is stored at noon Pakistan time, so it stays on that day", () => {
    expect(pktDay(expenseDate("2026-11-20"))).toBe("2026-11-20");
  });
  it("a new expense category is added to that list once", async () => {
    expect(await resolveExpenseCategory("DAILY", "__new__", "Generator fuel")).toBe("Generator fuel");
    expect(await resolveExpenseCategory("DAILY", "__new__", "generator FUEL")).toBe("Generator fuel");
    await expect(resolveExpenseCategory("REPAIR", "__new__", "")).rejects.toThrow(/new category/);
  });
  it("custom accessory categories show by their own name", () => {
    expect(accessoryLabel("EARBUDS")).toBe("Earbuds");
    expect(accessoryLabel("Gaming accessories")).toBe("Gaming accessories");
  });
});

describe("Used phones", () => {
  it("warranty is the 3-day checking warranty or none", () => {
    expect(USED_WARRANTY).toBe("3-day checking warranty");
    expect(NO_CHECK_WARRANTY).toBe("No checking warranty");
  });
  it("six-side photos come back in front, back, left, right, top, bottom order", () => {
    const list = devicePhotoList(JSON.stringify({ bottom: "/b.webp", front: "/f.webp", left: "/l.webp" }));
    expect(list.map((p) => p.side)).toEqual(["front", "left", "bottom"]);
  });
});
