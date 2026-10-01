/**
 * Custom skins in the cart / checkout, and the installment plan changes (client requests, 1 Oct 2026).
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { finalizeOrder } from "@/lib/orders";
import { resolveSkinLine, SkinOrderError, ownImageFile } from "@/lib/skin-orders";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { termList } from "@/lib/finance";
import { makeCustomer } from "./helpers";

async function setup() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const brand = await db.skinBrand.create({ data: { name: `B ${id}`, slug: `b-${id}` } });
  const model = await db.phoneModel.create({ data: { brandId: brand.id, name: `M ${id}`, slug: `m-${id}`, widthMm: 72, heightMm: 150 } });
  const other = await db.phoneModel.create({ data: { brandId: brand.id, name: `O ${id}`, slug: `o-${id}`, widthMm: 72, heightMm: 150 } });
  const leather = await db.skinType.create({ data: { name: `Leather ${id}`, price: 650, look: "LEATHER", designMode: "DESIGN" } });
  const jelly = await db.skinType.create({ data: { name: `Jelly ${id}`, price: 350, look: "JELLY", designMode: "PLAIN" } });
  const design = await db.skin.create({ data: { name: `Gold ${id}`, imageUrl: "/skins/gold-marble.svg", price: 100, models: { connect: [{ id: model.id }] } } });
  return { model, other, leather, jelly, design };
}

describe("Custom skins in the cart (client request)", () => {
  it("prices a skin on the server: type + design extra, and names it with the phone", async () => {
    const s = await setup();
    const line = await db.$transaction((tx) => resolveSkinLine(tx, { typeId: s.leather.id, modelId: s.model.id, designId: s.design.id, cameraCover: false }));
    expect(line.unitPrice).toBe(750);
    expect(line.name).toContain(s.model.name);
    expect(line.name).toContain(s.design.name);
    expect(line.sku).toBe(`SKIN-${s.leather.id}`);
  });
  it("jelly has no design or camera cover", async () => {
    const s = await setup();
    const line = await db.$transaction((tx) => resolveSkinLine(tx, { typeId: s.jelly.id, modelId: s.model.id, designId: null, cameraCover: true }));
    expect(line.unitPrice).toBe(350);
    expect(line.name).not.toContain("camera");
  });
  it("refuses a design not approved for that phone, or a design-type skin without a design", async () => {
    const s = await setup();
    await expect(db.$transaction((tx) => resolveSkinLine(tx, { typeId: s.leather.id, modelId: s.other.id, designId: s.design.id, cameraCover: false }))).rejects.toBeInstanceOf(SkinOrderError);
    await expect(db.$transaction((tx) => resolveSkinLine(tx, { typeId: s.leather.id, modelId: s.model.id, designId: null, cameraCover: false }))).rejects.toBeInstanceOf(SkinOrderError);
  });
  it("accepts the customer's own picture instead of a design", async () => {
    const s = await setup();
    const line = await db.$transaction((tx) => resolveSkinLine(tx, { typeId: s.leather.id, modelId: s.model.id, designId: null, cameraCover: false, ownImage: "data:image/jpeg;base64,/9j/4AAQ" }));
    expect(line).toMatchObject({ unitPrice: 650, own: true });
    expect(ownImageFile("data:image/jpeg;base64,/9j/4AAQ", "x")?.type).toBe("image/jpeg");
    expect(ownImageFile("javascript:alert(1)", "x")).toBeNull();
  });
  it("a paid skin order never touches stock and earns 1 point per Rs 100", async () => {
    const s = await setup();
    const c = await makeCustomer();
    const line = await db.$transaction((tx) => resolveSkinLine(tx, { typeId: s.leather.id, modelId: s.model.id, designId: s.design.id, cameraCover: false }));
    const o = await db.order.create({
      data: { number: `TEST-SK-${Date.now()}`, channel: "ONLINE", customerId: c.id, customerName: "Ali", customerPhone: c.phone, subtotal: 1500, total: 1500, items: { create: [{ variantId: line.variantId, name: line.name, sku: line.sku, unitPrice: 750, qty: 2 }] }, payments: { create: [{ provider: "SANDBOX", amount: 1500 }] } },
    });
    const before = await db.variant.findUniqueOrThrow({ where: { id: line.variantId } });
    await finalizeOrder(o.id, { markPaid: true });
    const after = await db.variant.findUniqueOrThrow({ where: { id: line.variantId } });
    expect(after.stockQty).toBe(before.stockQty);
    expect(await db.stockMovement.count({ where: { orderId: o.id } })).toBe(0);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(15);
    // The hidden skin product never shows in the shop.
    expect((await db.product.findUniqueOrThrow({ where: { id: after.productId } })).active).toBe(false);
  });
});

describe("Installment plans (client request)", () => {
  it("the 12-month plan is gone", () => {
    expect(termList(SETTING_DEFAULTS.installmentCalc)).toEqual([3, 6, 9]);
  });
});

describe("Customer picture positioning (client request)", () => {
  it("covers the skin at zoom 1, pans to the edges, and zooms out with room to move", async () => {
    const { placeImage } = await import("@/lib/skin-template");
    const area = { x: 0, y: 0, w: 70, h: 150 };
    // A 3:4 photo on a tall phone fills the height and crops the sides.
    const p = placeImage(area, 1200, 1600, { zoom: 1, x: 0, y: 0 });
    expect(p.h).toBeCloseTo(150);
    expect(p.x).toBeLessThan(0);
    expect(p.x + p.w).toBeGreaterThan(70);
    // Pan −1 / +1 put the picture's left / right edge at the skin edge — never a gap.
    expect(placeImage(area, 1200, 1600, { zoom: 1, x: -1, y: 0 }).x).toBeCloseTo(0);
    const r = placeImage(area, 1200, 1600, { zoom: 1, x: 1, y: 0 });
    expect(r.x + r.w).toBeCloseTo(70);
    // Zoomed out, the picture can move down so its top clears the camera.
    const down = placeImage(area, 1200, 1600, { zoom: 0.75, x: 0, y: 1 });
    expect(down.y).toBeGreaterThan(0);
    expect(down.y + down.h).toBeCloseTo(150);
  });
});
