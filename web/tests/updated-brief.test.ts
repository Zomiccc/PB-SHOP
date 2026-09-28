/**
 * Tests for the updated master brief (§21 testing list): Phone Passport expiry & redemption, reward
 * rules, repair discounts, installments, broadcasts, attachments & ID-document permissions, chat
 * voice notes & read state, Item Number / stock movements, investment & revenue, six-photo validation.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addMonths, availablePoints, earnPoints, expirePoints, LoyaltyError, repairDiscount, spendPoints } from "@/lib/loyalty";
import { changeRepairStatus } from "@/lib/repairs";
import { finalizeOrder } from "@/lib/orders";
import { formatCnic, maskCnic, monthlyPayment, planProblem } from "@/lib/installments";
import { activeBroadcast, parsePkt, safeHref } from "@/lib/broadcasts";
import { canViewAttachment, inspectUpload, saveAttachment, sniffType, AttachmentError } from "@/lib/attachments";
import { loadThread, voiceMeta } from "@/lib/chat";
import { assertImeiFree, receiveStock, StockError } from "@/lib/inventory";
import { summarise } from "@/lib/reports";
import { createPosSale } from "@/lib/pos";
import { missingViews, MODEL_JOB_STATES } from "@/lib/model3d";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { makeCustomer, makeOrder, makeRepair, makeStaff, makeVariant } from "./helpers";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
const PDF = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj");
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 1, 0x42, 0xf7, 0x81]);
const file = (bytes: Buffer, name: string, type = "application/octet-stream") => new File([new Uint8Array(bytes)], name, { type });

describe("Care Card removed (§4, §20)", () => {
  it("has no Care Card models or settings left", () => {
    const client = db as unknown as Record<string, unknown>;
    expect(client.careCard).toBeUndefined();
    expect(client.careCardService).toBeUndefined();
    expect("careCard" in SETTING_DEFAULTS).toBe(false);
  });
});

describe("PB Phone Passport earning rules (§4)", () => {
  it("defaults: 10 per repair, 20 per new phone, 15 per used phone, 6-month expiry", () => {
    expect(SETTING_DEFAULTS.passport).toMatchObject({ repairPoints: 10, newPhonePoints: 20, usedPhonePoints: 15, expiryMonths: 6 });
  });

  it("repair completion earns 10 points once, as its own lot", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    const r = await makeRepair(c.id);
    await changeRepairStatus(r.id, "COMPLETED", staff.id);
    await changeRepairStatus(r.id, "COMPLETED", staff.id);
    const lots = await db.loyaltyTransaction.findMany({ where: { repairId: r.id, type: "EARN" } });
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ points: 10, remaining: 10, source: "REPAIR" });
  });

  it("new and used phones earn separate lots with their own expiry", async () => {
    const c = await makeCustomer();
    const used = await makeVariant({ used: true });
    const o = await makeOrder(used.id, 2, c.id);
    await finalizeOrder(o.id, { markPaid: true });
    const lot = await db.loyaltyTransaction.findFirstOrThrow({ where: { orderId: o.id, type: "EARN" } });
    expect(lot).toMatchObject({ points: 30, source: "USED_PHONE" });
    const months = (lot.expiresAt!.getFullYear() - lot.createdAt.getFullYear()) * 12 + lot.expiresAt!.getMonth() - lot.createdAt.getMonth();
    expect(months).toBe(6);
  });
});

describe("Manual points at the till (client request)", () => {
  it("gives exactly the points staff type instead of the automatic amount, and audits it", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 3 });
    const phone = `0345${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
    const o = await createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", customerPhone: phone, customerName: "Hina", points: 75 }, staff);
    const c = await db.customer.findUniqueOrThrow({ where: { phone } });
    expect(c.loyaltyPoints).toBe(75);
    expect(await db.auditLog.count({ where: { entityId: o.id, action: "PASSPORT_POINTS_SET_AT_SALE" } })).toBe(1);
  });

  it("uses the automatic points when the field is left empty", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 3 });
    const phone = `0346${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
    await createPosSale({ items: [{ variantId: v.id, qty: 1 }], method: "CASH", customerPhone: phone }, staff);
    expect((await db.customer.findUniqueOrThrow({ where: { phone } })).loyaltyPoints).toBe(20);
  });
});

describe("Passport expiry & redemption (§4)", () => {
  it("expires each earning event six months after it was earned", async () => {
    const c = await makeCustomer();
    const jan = new Date("2026-01-10T10:00:00Z");
    const mar = new Date("2026-03-10T10:00:00Z");
    await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: 100, source: "MANUAL", reason: "January", now: jan }));
    await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: 50, source: "MANUAL", reason: "March", now: mar }));
    expect(await expirePoints(db, c.id, new Date("2026-07-09T00:00:00Z"))).toBe(150); // nothing due yet
    expect(await expirePoints(db, c.id, new Date("2026-07-11T00:00:00Z"))).toBe(50); // January lot gone
    expect(await expirePoints(db, c.id, new Date("2026-09-11T00:00:00Z"))).toBe(0); // March lot gone
    expect(await db.loyaltyTransaction.count({ where: { customerId: c.id, type: "EXPIRE" } })).toBe(2);
  });

  it("never lets expired points be redeemed", async () => {
    const c = await makeCustomer();
    const old = new Date(Date.now() - 200 * 86_400_000);
    await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: 500, source: "MANUAL", reason: "old", now: old }));
    await expect(db.$transaction((tx) => spendPoints(tx, { customerId: c.id, points: 100, type: "REDEEM", reason: "case" }))).rejects.toBeInstanceOf(LoyaltyError);
    expect(await availablePoints(db, c.id)).toBe(0);
  });

  it("spends the soonest-expiring points first", async () => {
    const c = await makeCustomer();
    const now = new Date();
    const a = await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: 100, source: "MANUAL", reason: "older", now: new Date(now.getTime() - 60 * 86_400_000) }));
    const b = await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: 150, source: "MANUAL", reason: "newer" }));
    await db.$transaction((tx) => spendPoints(tx, { customerId: c.id, points: 200, type: "REDEEM", reason: "AirPods" }));
    expect((await db.loyaltyTransaction.findUniqueOrThrow({ where: { id: a!.id } })).remaining).toBe(0);
    expect((await db.loyaltyTransaction.findUniqueOrThrow({ where: { id: b!.id } })).remaining).toBe(50);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(50);
  });

  it("handles month-end dates when adding six months", () => {
    expect(addMonths(new Date("2026-08-31T12:00:00Z"), 6).getUTCMonth()).toBe(1); // February, not March
  });

  it("repair discounts apply to labour only — parts excluded", () => {
    expect(repairDiscount(10000, 4000, 50)).toBe(3000);
    expect(repairDiscount(10000, null, 50)).toBe(5000);
    expect(repairDiscount(3000, 5000, 50)).toBe(0);
  });
});

describe("Installments (§3, §5)", () => {
  it("computes the monthly payment after the down payment", () => {
    expect(monthlyPayment({ installmentTotal: 149499, downPayment: 39999, durationMonths: 12 })).toBe(9125);
  });

  it("validates plans entered by admins", () => {
    expect(planProblem({ regularPrice: 100, installmentTotal: 120, downPayment: 20, durationMonths: 6, interestPercent: 20 })).toBeNull();
    expect(planProblem({ regularPrice: 100, installmentTotal: 120, downPayment: 150, durationMonths: 6, interestPercent: 0 })).toMatch(/Down payment/);
    expect(planProblem({ regularPrice: 100, installmentTotal: 120, downPayment: 20, durationMonths: 0, interestPercent: 0 })).toMatch(/Duration/);
  });

  it("formats and masks CNIC numbers", () => {
    expect(formatCnic("3520212345671")).toBe("35202-1234567-1");
    expect(maskCnic("35202-1234567-1")).toBe("35202-*******-1");
  });

  it("orders homepage listings by the admin's chosen order", async () => {
    await db.installmentListing.deleteMany();
    await db.installmentListing.createMany({
      data: [
        { model: "B", regularPrice: 1, installmentTotal: 2, downPayment: 1, durationMonths: 1, sortOrder: 20 },
        { model: "A", regularPrice: 1, installmentTotal: 2, downPayment: 1, durationMonths: 1, sortOrder: 10 },
        { model: "Hidden", regularPrice: 1, installmentTotal: 2, downPayment: 1, durationMonths: 1, sortOrder: 5, active: false },
      ],
    });
    const { activeListings } = await import("@/lib/installments");
    expect((await activeListings()).map((l) => l.model)).toEqual(["A", "B"]);
  });
});

describe("Broadcasts (§9)", () => {
  it("shows only a published broadcast inside its dates", async () => {
    await db.broadcast.deleteMany();
    const now = new Date("2026-06-01T12:00:00Z");
    await db.broadcast.createMany({
      data: [
        { message: "draft", active: false },
        { message: "expired", active: true, endsAt: new Date("2026-05-01T00:00:00Z") },
        { message: "future", active: true, startsAt: new Date("2026-07-01T00:00:00Z") },
        { message: "live", active: true, startsAt: new Date("2026-05-20T00:00:00Z"), endsAt: new Date("2026-06-30T00:00:00Z") },
      ],
    });
    expect((await activeBroadcast(now))?.message).toBe("live");
    await db.broadcast.updateMany({ where: { message: "live" }, data: { active: false } });
    expect(await activeBroadcast(now)).toBeNull();
  });

  it("only allows safe links and reads dates as Pakistan time", () => {
    expect(safeHref("/used-phones")).toBe("/used-phones");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("http://insecure.example")).toBeNull();
    expect(parsePkt("2026-06-01T09:00")?.toISOString()).toBe("2026-06-01T04:00:00.000Z");
  });
});

describe("Attachments & ID documents (§5–§7, §17)", () => {
  it("detects the real file type from its bytes", () => {
    expect(sniffType(JPEG)?.mime).toBe("image/jpeg");
    expect(sniffType(PDF)?.mime).toBe("application/pdf");
    expect(sniffType(WEBM)?.mime).toBe("audio/webm");
    expect(sniffType(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });

  it("rejects a disguised file and wrong types for ID uploads", async () => {
    await expect(inspectUpload(file(Buffer.from("<html><script>x</script></html>"), "cnic.jpg", "image/jpeg"), "CNIC_FRONT")).rejects.toBeInstanceOf(AttachmentError);
    await expect(inspectUpload(file(WEBM, "voice.webm"), "CNIC_BACK")).rejects.toBeInstanceOf(AttachmentError);
    await expect(inspectUpload(file(Buffer.alloc(5 * 1024 * 1024, 0xff), "huge.jpg"), "OTHER")).rejects.toThrow(/too large/);
    expect((await inspectUpload(file(JPEG, "front.png"), "CNIC_FRONT")).fileName).toBe("front.jpg");
  });

  it("stores CNIC images privately, flagged sensitive, linked to their record", async () => {
    const staff = await makeStaff();
    const sale = await db.installmentSale.create({ data: { ref: `PBI-T${Date.now()}`, customerName: "Ali", customerPhone: "03001234567", cnicNumber: "35202-1234567-1", phoneModel: "A55", totalPrice: 100, downPayment: 10, monthlyPayment: 15, durationMonths: 6, staffId: staff.id } });
    const a = await saveAttachment(file(JPEG, "front.jpg"), { kind: "CNIC_FRONT", installmentSaleId: sale.id, uploadedById: staff.id });
    const row = await db.attachment.findUniqueOrThrow({ where: { id: a.id } });
    expect(row).toMatchObject({ sensitive: true, installmentSaleId: sale.id, mimeType: "image/jpeg" });
    expect(Buffer.from(row.data!).equals(JPEG)).toBe(true);
  });

  it("permissions: staff see everything; customers only their own chat files, never ID documents", () => {
    const chatFile = { sensitive: false, chatMessage: { conversationId: "c1" } };
    const cnic = { sensitive: true, chatMessage: null };
    expect(canViewAttachment(cnic, { staff: true })).toBe(true);
    expect(canViewAttachment(cnic, { staff: false, conversationId: "c1" })).toBe(false);
    expect(canViewAttachment(chatFile, { staff: false, conversationId: "c1" })).toBe(true);
    expect(canViewAttachment(chatFile, { staff: false, conversationId: "someone-else" })).toBe(false);
    expect(canViewAttachment({ sensitive: false, chatMessage: null }, { staff: false })).toBe(false); // repair / contact files: staff only
  });
});

describe("Chat voice notes, attachments & read state (§13)", () => {
  it("clamps voice-note metadata from the browser", () => {
    const m = voiceMeta("9999", JSON.stringify([2, -1, 0.5, "x"]));
    expect(m.durationSec).toBe(300);
    expect(JSON.parse(m.waveform)).toEqual([1, 0, 0.5, 0]);
  });

  it("records delivery and read receipts per side", async () => {
    const staff = await makeStaff();
    const convo = await db.chatConversation.create({ data: { visitorId: `v-${Date.now()}` } });
    const reply = await db.chatMessage.create({ data: { conversationId: convo.id, from: "STAFF", staffId: staff.id, body: "Your phone is ready" } });
    const voice = await db.chatMessage.create({ data: { conversationId: convo.id, from: "VISITOR", kind: "VOICE", body: "Voice note", durationSec: 3.2, waveform: "[0.2,0.8]" } });
    await saveAttachment(file(WEBM, "voice-note.webm"), { kind: "VOICE_NOTE", chatMessageId: voice.id, sensitive: false });

    await loadThread(convo.id, "VISITOR", false); // background poll: delivered, not read
    let r = await db.chatMessage.findUniqueOrThrow({ where: { id: reply.id } });
    expect(r.deliveredAt).not.toBeNull();
    expect(r.readAt).toBeNull();
    const thread = await loadThread(convo.id, "VISITOR", true);
    r = await db.chatMessage.findUniqueOrThrow({ where: { id: reply.id } });
    expect(r.readAt).not.toBeNull();
    const v = thread.find((m) => m.id === voice.id)!;
    expect(v).toMatchObject({ kind: "VOICE", durationSec: 3.2, waveform: [0.2, 0.8] });
    expect(v.attachments[0].mimeType).toBe("audio/webm");
    expect((await db.chatMessage.findUniqueOrThrow({ where: { id: voice.id } })).readAt).toBeNull(); // staff haven't opened it
  });
});

describe("Item Numbers, purchases, stock movements & reports (§10)", () => {
  it("records a purchase with unit cost, employee and reference, and updates the cost price", async () => {
    const staff = await makeStaff();
    const v = await makeVariant({ stock: 0 });
    await db.$transaction((tx) => receiveStock(tx, { variantId: v.id, qty: 5, unitCost: 80000, staffId: staff.id, reference: "INV-77" }));
    const m = await db.stockMovement.findFirstOrThrow({ where: { variantId: v.id, type: "PURCHASE" } });
    expect(m).toMatchObject({ qtyChange: 5, qtyAfter: 5, unitPrice: 80000, reference: "INV-77", staffId: staff.id });
    expect((await db.variant.findUniqueOrThrow({ where: { id: v.id } })).costPrice).toBe(80000);
    expect(await db.auditLog.count({ where: { entityId: v.id, action: "STOCK_PURCHASED" } })).toBe(1);
  });

  it("finds an item by IMEI and never allows one IMEI on two SKUs", async () => {
    const imei = `35${Date.now()}`.slice(0, 15);
    const v = await makeVariant({ stock: 1 });
    await db.variant.update({ where: { id: v.id }, data: { imei } });
    expect((await db.variant.findFirst({ where: { imei } }))?.id).toBe(v.id);
    await expect(db.$transaction((tx) => assertImeiFree(tx, imei))).rejects.toBeInstanceOf(StockError);
    await db.$transaction((tx) => assertImeiFree(tx, imei, v.id));
  });

  it("snapshots purchase cost on sales for profit", async () => {
    const v = await makeVariant({ stock: 3, price: 100000, cost: 80000 });
    const o = await makeOrder(v.id, 1);
    await db.orderItem.updateMany({ where: { orderId: o.id }, data: { unitCost: 80000 } });
    await finalizeOrder(o.id, { markPaid: true });
    const sale = await db.stockMovement.findFirstOrThrow({ where: { orderId: o.id, type: "SALE" } });
    expect(sale.unitPrice).toBe(100000);
  });

  it("calculates investment, revenue, profit and margin", () => {
    const s = summarise([{ qtyChange: 10, unitPrice: 800 }, { qtyChange: 2, unitPrice: null }], [{ qty: 3, unitPrice: 1000, unitCost: 800 }, { qty: 1, unitPrice: 500, unitCost: null }]);
    expect(s).toMatchObject({ investment: 8000, revenue: 3500, cogs: 2400, profit: 600, margin: 20, unitsSold: 4, unitsPurchased: 12, uncostedLines: 1 });
  });
});

describe("Six-photo → 3D validation (§11)", () => {
  it("requires exactly the six views before conversion", () => {
    const f = new FormData();
    for (const v of ["front", "back", "left", "right", "top"]) f.set(v, file(JPEG, `${v}.jpg`, "image/jpeg"));
    expect(missingViews(f)).toEqual(["bottom"]);
    f.set("bottom", file(JPEG, "bottom.jpg", "image/jpeg"));
    expect(missingViews(f)).toEqual([]);
  });

  it("uses the brief's generation states", () => {
    expect(MODEL_JOB_STATES).toEqual(expect.arrayContaining(["PROCESSING", "READY", "FAILED", "NEEDS_REVIEW"]));
  });
});
