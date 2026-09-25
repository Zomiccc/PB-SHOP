import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { finalizeOrder, awardOrderBenefits } from "@/lib/orders";
import { restoreOrderStock, adjustStock, StockError } from "@/lib/inventory";
import { redeemCareService, CareCardError } from "@/lib/care-card";
import { createPosSale, PosError } from "@/lib/pos";
import { changeRepairStatus } from "@/lib/repairs";
import { signSandbox, paymentProvider } from "@/lib/payments";
import { ean13 } from "@/lib/barcode";
import { privacyLabel } from "@/lib/format";
import { makeCustomer, makeOrder, makeStaff, makeVariant, setCareServices } from "./helpers";

beforeAll(async () => {
  await setCareServices();
});

describe("Inventory & sales (§6, §19)", () => {
  it("decrements stock after a confirmed sale and logs the movement + audit", async () => {
    const v = await makeVariant({ stock: 5 });
    const o = await makeOrder(v.id, 2);
    await finalizeOrder(o.id, { markPaid: true });
    expect((await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stockQty).toBe(3);
    const moves = await db.stockMovement.findMany({ where: { orderId: o.id } });
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ type: "SALE", qtyChange: -2, qtyAfter: 3 });
    expect(await db.auditLog.count({ where: { entityId: o.id, action: "SALE_COMPLETED" } })).toBe(1);
  });

  it("is idempotent — finalising twice does not double-decrement", async () => {
    const v = await makeVariant({ stock: 3 });
    const o = await makeOrder(v.id, 1);
    await finalizeOrder(o.id, { markPaid: true });
    await finalizeOrder(o.id, { markPaid: true });
    expect((await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stockQty).toBe(2);
  });

  it("refuses to sell zero-stock items", async () => {
    const v = await makeVariant({ stock: 0 });
    const o = await makeOrder(v.id, 1);
    await expect(finalizeOrder(o.id, { markPaid: true })).rejects.toBeInstanceOf(StockError);
    expect((await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stockQty).toBe(0);
  });

  it("allows a zero-stock sale only with an authorised override, and audits it", async () => {
    const v = await makeVariant({ stock: 0 });
    const o = await makeOrder(v.id, 1);
    await finalizeOrder(o.id, { markPaid: true, overrideBy: "owner@test.pk" });
    expect(await db.auditLog.count({ where: { entityId: v.id, action: "ZERO_STOCK_OVERRIDE" } })).toBe(1);
  });

  it("restores stock when a return is finalised", async () => {
    const v = await makeVariant({ stock: 4 });
    const o = await makeOrder(v.id, 2);
    await finalizeOrder(o.id, { markPaid: true });
    await db.$transaction((tx) => restoreOrderStock(tx, o.id, null, "RETURN"));
    expect((await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stockQty).toBe(4);
    expect(await db.stockMovement.count({ where: { orderId: o.id, type: "RETURN" } })).toBe(1);
  });

  it("requires a reason-logged adjustment and never goes below zero", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 1 });
    await expect(db.$transaction((tx) => adjustStock(tx, v.id, -2, staff.id, "damaged"))).rejects.toBeInstanceOf(StockError);
    await db.$transaction((tx) => adjustStock(tx, v.id, 5, staff.id, "delivery"));
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: v.id, action: "STOCK_ADJUSTED" } });
    expect(JSON.parse(log.before!)).toEqual({ stockQty: 1 });
    expect(JSON.parse(log.after!).stockQty).toBe(6);
  });
});

describe("Loyalty & Care Card issuing (§7, §18)", () => {
  it("awards points and issues a Care Card for a paid eligible order", async () => {
    const c = await makeCustomer();
    const v = await makeVariant({ stock: 2, price: 150000 });
    const o = await makeOrder(v.id, 1, c.id);
    await finalizeOrder(o.id, { markPaid: true });
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(1500);
    expect(await db.careCard.count({ where: { orderId: o.id } })).toBe(1);
  });

  it("gives nothing to unpaid (COD) orders until they are marked paid", async () => {
    const c = await makeCustomer();
    const v = await makeVariant({ stock: 2, price: 50000 });
    const o = await makeOrder(v.id, 1, c.id);
    await finalizeOrder(o.id, { markPaid: false });
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(0);
    await db.$transaction((tx) => awardOrderBenefits(tx, o.id, null));
    await db.$transaction((tx) => awardOrderBenefits(tx, o.id, null)); // idempotent
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(500);
    expect(await db.careCard.count({ where: { orderId: o.id } })).toBe(1);
  });

  it("uses a privacy-safe social-proof label", () => {
    expect(privacyLabel("Ahmed Raza Khan", "Lahore")).toBe("Ahmed R. from Lahore");
  });
});

describe("Care Card redemption rules (§18)", () => {
  async function card() {
    const c = await makeCustomer();
    return db.careCard.create({ data: { number: `PBC-T${Date.now()}${Math.random()}`, customerId: c.id } });
  }

  it("redeems each service once and records the employee", async () => {
    const [s1] = await db.careCardService.findMany({ orderBy: { visitNumber: "asc" } });
    const staff = await makeStaff();
    const cc = await card();
    await redeemCareService({ cardId: cc.id, serviceId: s1.id, staffId: staff.id });
    await expect(redeemCareService({ cardId: cc.id, serviceId: s1.id, staffId: staff.id })).rejects.toBeInstanceOf(CareCardError);
    const r = await db.careCardRedemption.findFirstOrThrow({ where: { careCardId: cc.id } });
    expect(r.staffId).toBe(staff.id);
    expect(await db.auditLog.count({ where: { entityId: cc.id, action: "CARE_CARD_REDEEMED" } })).toBe(1);
  });

  it("blocks the undefined 5th visit until the owner configures it", async () => {
    const services = await db.careCardService.findMany({ orderBy: { visitNumber: "asc" } });
    const staff = await makeStaff();
    const cc = await card();
    await expect(redeemCareService({ cardId: cc.id, serviceId: services[4].id, staffId: staff.id })).rejects.toThrow(/not currently available/);
  });

  it("is exhausted after the 5th use", async () => {
    const staff = await makeStaff();
    const services = await db.careCardService.findMany({ orderBy: { visitNumber: "asc" } });
    await db.careCardService.update({ where: { id: services[4].id }, data: { name: "Free lens clean", configured: true, active: true } });
    const cc = await card();
    for (const s of services) await redeemCareService({ cardId: cc.id, serviceId: s.id, staffId: staff.id });
    expect((await db.careCard.findUniqueOrThrow({ where: { id: cc.id } })).status).toBe("EXHAUSTED");
    await expect(redeemCareService({ cardId: cc.id, serviceId: services[0].id, staffId: staff.id })).rejects.toBeInstanceOf(CareCardError);
    await db.careCardService.update({ where: { id: services[4].id }, data: { configured: false, active: false } });
  });
});

describe("POS (§19, §20)", () => {
  it("records the sale against the employee, confirms payment and saves the sale note", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 3 });
    const o = await createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", note: "Sold with case" }, staff);
    expect(o).toMatchObject({ channel: "POS", staffId: staff.id, paymentStatus: "PAID" });
    expect((await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stockQty).toBe(2);
    expect(await db.note.count({ where: { orderId: o.id, kind: "SALE", authorId: staff.id } })).toBe(1);
  });

  it("rejects zero-stock sales by employees without owner credentials and rolls back", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 0 });
    const before = await db.order.count();
    await expect(createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH" }, staff)).rejects.toBeInstanceOf(PosError);
    await expect(createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", override: { email: staff.email, password: "Secret123!" } }, staff)).rejects.toThrow(/owner credentials/);
    expect(await db.order.count()).toBe(before);
  });

  it("accepts the owner's credentials as an override", async () => {
    const owner = await makeStaff("SUPER_ADMIN", "OwnerPass1");
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 0 });
    const o = await createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CARD", override: { email: owner.email, password: "OwnerPass1" } }, staff);
    expect(o.paymentStatus).toBe("PAID");
    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: v.id, action: "ZERO_STOCK_OVERRIDE" } });
    expect(JSON.parse(log.after!).authorisedBy).toBe(owner.email);
  });
});

describe("Repairs (§8)", () => {
  it("logs every status change and awards repair points once on completion", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    const r = await db.repairRequest.create({ data: { ref: `PBR-T${Date.now()}`, customerId: c.id, name: c.name, phone: c.phone, brand: "Apple", model: "iPhone 13", category: "SCREEN", description: "cracked screen" } });
    for (const s of ["RECEIVED", "DIAGNOSING", "REPAIRING", "READY", "COMPLETED"]) await changeRepairStatus(r.id, s, staff.id);
    await changeRepairStatus(r.id, "COMPLETED", staff.id);
    expect(await db.repairStatusChange.count({ where: { repairId: r.id } })).toBe(5);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(50);
  });
});

describe("Payments & barcodes", () => {
  it("rejects a tampered sandbox callback", async () => {
    const p = paymentProvider();
    const ok = await p.verify({ order: "PB-1", status: "success", amount: "100", sig: signSandbox("PB-1", "success") });
    const bad = await p.verify({ order: "PB-1", status: "success", amount: "100", sig: signSandbox("PB-1", "failed") });
    expect(ok).toMatchObject({ verified: true, status: "SUCCESS" });
    expect(bad.verified).toBe(false);
  });

  it("generates valid EAN-13 check digits", () => {
    expect(ean13("400638133393")).toBe("4006381333931");
    expect(ean13("210000000001")).toHaveLength(13);
  });
});
