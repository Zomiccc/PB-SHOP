/**
 * PB Phone Passport — Developer Requirements (final v4): standard points criteria (§3), installment
 * phones, referral visibility data, and Custom Skins templates (§9–§11).
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { finalizeOrder } from "@/lib/orders";
import { pointsForItems, pointsForRepair } from "@/lib/loyalty";
import { describeTiers, parseTiers, phoneTierPoints, spendPoints } from "@/lib/points-rules";
import { awardInstallmentPoints, reverseInstallmentPoints } from "@/lib/installments";
import { joinPassport } from "@/lib/passport";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { designMode, lensLayout, skinFocus, skinLook, skinPrice, templateProblem } from "@/lib/skin-template";
import { normalizePhone } from "@/lib/format";
import { makeCustomer, makeOrder, makeStaff, makeVariant } from "./helpers";

const rules = SETTING_DEFAULTS.passport;

describe("Standard PB Points criteria (§3)", () => {
  it("phones earn by price tier, with exact boundaries", () => {
    const t = rules.phoneTiers;
    expect(phoneTierPoints(9999, t)).toBe(0);
    expect(phoneTierPoints(10000, t)).toBe(50);
    expect(phoneTierPoints(29999, t)).toBe(50);
    expect(phoneTierPoints(30000, t)).toBe(100);
    expect(phoneTierPoints(49999, t)).toBe(100);
    expect(phoneTierPoints(50000, t)).toBe(150);
    expect(phoneTierPoints(79999, t)).toBe(150);
    expect(phoneTierPoints(80000, t)).toBe(200);
    expect(phoneTierPoints(450000, t)).toBe(200);
  });
  it("repairs & accessories earn 1 point per Rs 100, whole points only", () => {
    expect(spendPoints(99, 100)).toBe(0);
    expect(spendPoints(100, 100)).toBe(1);
    expect(spendPoints(2599, 100)).toBe(25);
    expect(pointsForRepair({ finalPrice: 3500, quote: 4000, rewardDiscount: 500 }, rules)).toBe(30); // pays Rs 3,000
    expect(pointsForRepair({ finalPrice: null, quote: 1200, rewardDiscount: null }, rules)).toBe(12);
  });
  it("parses tier settings tolerantly and describes them for customers", () => {
    expect(parseTiers("30000:100, 10000:50; 80,000:200")).toEqual([{ from: 10000, points: 50 }, { from: 30000, points: 100 }, { from: 80000, points: 200 }]);
    expect(describeTiers(rules.phoneTiers).map((d) => d.label)).toEqual(["Rs 10,000–29,999", "Rs 30,000–49,999", "Rs 50,000–79,999", "Rs 80,000+"]);
  });
  it("an order mixes phone tiers and accessory spend, on the net (discounted) amount; tablets earn nothing", () => {
    const item = (type: string, unitPrice: number, qty = 1, condition = "NEW") => ({ qty, unitPrice, variant: { product: { type, condition, loyaltyEligible: true } } });
    const items = [item("PHONE", 85000), item("PHONE", 40000, 1, "USED"), item("ACCESSORY", 1500, 2), item("PART", 1000), item("TABLET", 120000)];
    expect(pointsForItems(items, rules, { subtotal: 0, discount: 0 })).toEqual({ NEW_PHONE: 200, USED_PHONE: 100, ACCESSORY: 40 });
    // Rs 10,000 off a Rs 50,000 order = 20% off every line: a Rs 50,000 phone is then Rs 40,000 → 100 points.
    expect(pointsForItems([item("PHONE", 50000)], rules, { subtotal: 50000, discount: 10000 })).toEqual({ NEW_PHONE: 100, USED_PHONE: 0, ACCESSORY: 0 });
  });
  it("a paid order writes one lot per kind", async () => {
    const c = await makeCustomer();
    const phone = await makeVariant({ price: 35000 });
    const acc = await makeVariant({ price: 2500, phone: false });
    const o = await makeOrder(phone.id, 1, c.id);
    await db.orderItem.create({ data: { orderId: o.id, variantId: acc.id, name: "Case", sku: acc.sku, unitPrice: 2500, qty: 1 } });
    await db.order.update({ where: { id: o.id }, data: { subtotal: 37500, total: 37500 } });
    await finalizeOrder(o.id, { markPaid: true });
    const lots = await db.loyaltyTransaction.findMany({ where: { orderId: o.id, type: "EARN" }, orderBy: { points: "desc" } });
    expect(lots.map((l) => [l.source, l.points])).toEqual([["NEW_PHONE", 100], ["ACCESSORY", 25]]);
  });
});

describe("Installment phones (§3)", () => {
  async function sale(customerId: string, phoneValue: number | null, totalPrice = 120000) {
    const staff = await makeStaff();
    return db.installmentSale.create({
      data: { ref: `PBI-T${Date.now()}${Math.random().toString(36).slice(2, 6)}`, customerId, customerName: "Ali Khan", customerPhone: "03001234567", cnicNumber: "35202-1234567-1", phoneModel: "Galaxy A55", totalPrice, phoneValue, downPayment: 20000, monthlyPayment: 10000, durationMonths: 10, staffId: staff.id },
    });
  }
  it("earn the phone tier on the phone's cash value, once, and count as the first transaction", async () => {
    const c = await makeCustomer();
    await joinPassport(db, c.id);
    const s = await sale(c.id, 65000);
    expect(await db.$transaction((tx) => awardInstallmentPoints(tx, s.id, null))).toBe(150);
    expect(await db.$transaction((tx) => awardInstallmentPoints(tx, s.id, null))).toBe(0); // idempotent
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(150 + 25); // + welcome
  });
  it("fall back to the plan total when no cash price was entered", async () => {
    const c = await makeCustomer();
    const s = await sale(c.id, null, 95000);
    expect(await db.$transaction((tx) => awardInstallmentPoints(tx, s.id, null))).toBe(200);
  });
  it("are reversed if the sale is cancelled after hand-over", async () => {
    const c = await makeCustomer();
    const s = await sale(c.id, 35000);
    await db.$transaction((tx) => awardInstallmentPoints(tx, s.id, null));
    expect(await db.$transaction((tx) => reverseInstallmentPoints(tx, s.id, null))).toBe(100);
    expect(await db.$transaction((tx) => reverseInstallmentPoints(tx, s.id, null))).toBe(0); // once
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(0);
  });
});

describe("Custom Skins templates (§10–§11)", () => {
  const t = { widthMm: 74.6, heightMm: 163.6, cornerMm: 9, cameraX: 6, cameraY: 6, cameraW: 25, cameraH: 42, cameraCornerMm: 6, lenses: 3, bodyHex: "#4a4e55" };
  it("accepts a real phone template and rejects impossible ones", () => {
    expect(templateProblem(t)).toBeNull();
    expect(templateProblem({ ...t, cameraX: 60 })).toMatch(/inside/);
    expect(templateProblem({ ...t, cornerMm: 50 })).toMatch(/Corner/);
    expect(templateProblem({ ...t, lenses: 7 })).toMatch(/Lenses/);
    expect(templateProblem({ ...t, bodyHex: "grey" })).toMatch(/hex/);
  });
  it("places every lens inside the camera island", () => {
    for (const lenses of [1, 2, 3, 4]) {
      for (const shape of [t, { ...t, cameraW: 30, cameraH: 30 }, { ...t, cameraW: 40, cameraH: 14 }]) {
        const pts = lensLayout({ ...shape, lenses });
        expect(pts).toHaveLength(lenses);
        for (const p of pts) {
          expect(p.cx - p.r).toBeGreaterThanOrEqual(shape.cameraX - 0.01);
          expect(p.cx + p.r).toBeLessThanOrEqual(shape.cameraX + shape.cameraW + 0.01);
          expect(p.cy - p.r).toBeGreaterThanOrEqual(shape.cameraY - 0.01);
          expect(p.cy + p.r).toBeLessThanOrEqual(shape.cameraY + shape.cameraH + 0.01);
        }
      }
    }
  });
  it("only allows known crop focus values, looks and design modes", () => {
    expect(skinFocus("xMidYMin")).toBe("xMidYMin");
    expect(skinFocus("javascript:alert(1)")).toBe("xMidYMid");
    expect(skinLook("LEATHER")).toBe("LEATHER");
    expect(skinLook("nope")).toBe("MATTE");
    expect(designMode("PHOTO")).toBe("PHOTO");
    expect(designMode(undefined)).toBe("DESIGN");
  });
  it("prices come from the skin type (client's list), plus optional design extra and camera cover", () => {
    const leather = { price: 650, designMode: "DESIGN" };
    const photo = { price: 850, designMode: "PHOTO" };
    const jelly = { price: 350, designMode: "PLAIN" };
    expect(skinPrice(leather, { price: 0 }, false, 0)).toBe(650);
    expect(skinPrice(leather, { price: 100 }, true, 200)).toBe(950);
    expect(skinPrice(photo, { price: 100 }, false, 0)).toBe(850); // own photo: no design extra
    expect(skinPrice(jelly, null, true, 200)).toBe(350); // jelly: no camera cover option
  });
  it("customers only see enabled designs that are for all models or assigned to theirs — incl. new models", async () => {
    const id = Date.now().toString(36);
    const brand = await db.skinBrand.create({ data: { name: `Brand ${id}`, slug: `brand-${id}` } });
    const model = await db.phoneModel.create({ data: { brandId: brand.id, name: "Test 1", slug: "test-1", widthMm: 70, heightMm: 150 } });
    await db.skin.create({ data: { name: `On ${id}`, imageUrl: "/skins/carbon-black.svg", models: { connect: [{ id: model.id }] } } });
    await db.skin.create({ data: { name: `Off ${id}`, imageUrl: "/skins/carbon-black.svg", active: false, models: { connect: [{ id: model.id }] } } });
    await db.skin.create({ data: { name: `Unassigned ${id}`, imageUrl: "/skins/carbon-black.svg" } });
    await db.skin.create({ data: { name: `Everyone ${id}`, imageUrl: "/skins/carbon-black.svg", allModels: true } });
    const { skinModelPage } = await import("@/lib/skins");
    const mine = (names: string[]) => names.filter((n) => n.endsWith(id)).sort();
    const page = await skinModelPage(`brand-${id}`, "test-1");
    expect(mine(page!.skins.map((s) => s.name))).toEqual([`Everyone ${id}`, `On ${id}`]);
    // A model added later gets the "all models" designs straight away, with nothing to assign.
    await db.phoneModel.create({ data: { brandId: brand.id, name: "Test 2", slug: "test-2", widthMm: 72, heightMm: 152 } });
    expect(mine((await skinModelPage(`brand-${id}`, "test-2"))!.skins.map((s) => s.name))).toEqual([`Everyone ${id}`]);
    expect(await skinModelPage(`brand-${id}`, "nope")).toBeNull();
  });
});

describe("One phone number = one account (client request)", () => {
  it("treats every format of a Pakistani mobile as the same number", () => {
    for (const raw of ["03001234567", "0300 1234567", "0300-1234567", "+92 300 1234567", "923001234567", "3001234567"]) expect(normalizePhone(raw)).toBe("03001234567");
  });
  it("the database refuses a second customer with the same (normalised) phone", async () => {
    const phone = normalizePhone(`+92 345 ${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
    await db.customer.create({ data: { name: "First", phone, passportNo: `PBP-U${Date.now()}` } });
    await expect(db.customer.create({ data: { name: "Second", phone: normalizePhone(`0${phone.slice(1)}`), passportNo: `PBP-V${Date.now()}` } })).rejects.toThrow();
  });
});
