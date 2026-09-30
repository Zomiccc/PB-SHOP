/**
 * PB Phone Passport — Developer Requirements (final v2): card expiry, birthday (month + day, no year),
 * welcome reward, referral reward, manual awards and customer deletion retention.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { finalizeOrder } from "@/lib/orders";
import { changeRepairStatus } from "@/lib/repairs";
import { earnPoints } from "@/lib/loyalty";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { PassportError, creditReferral, creditWelcome, findReferrer, formatBirthday, formatCardExpiry, joinPassport, parseBirthday } from "@/lib/passport";
import { makeCustomer, makeOrder, makeRepair, makeStaff, makeVariant } from "./helpers";

describe("Birthday on the Passport form (§2)", () => {
  it("takes month + day only — no year", () => {
    expect(parseBirthday("3", "14")).toEqual({ birthMonth: 3, birthDay: 14 });
    expect(parseBirthday("2", "29")).toEqual({ birthMonth: 2, birthDay: 29 }); // valid without a year
    expect(formatBirthday({ birthMonth: 3, birthDay: 14 })).toBe("14 March");
  });
  it("rejects impossible dates and half-filled birthdays", () => {
    expect(() => parseBirthday("2", "30")).toThrow(PassportError);
    expect(() => parseBirthday("4", "31")).toThrow(PassportError);
    expect(() => parseBirthday("13", "1")).toThrow(PassportError);
    expect(() => parseBirthday("5", "")).toThrow(PassportError);
  });
  it("is required on the Passport form, optional elsewhere", () => {
    expect(() => parseBirthday("", "", { required: true })).toThrow(PassportError);
    expect(parseBirthday("", "")).toBeNull();
  });
});

describe("Reward amounts (§3, §4, §7)", () => {
  it("defaults to 25 points for the welcome and the referral reward", () => {
    expect(SETTING_DEFAULTS.passport.welcomePoints).toBe(25);
    expect(SETTING_DEFAULTS.passport.referralPoints).toBe(25);
  });
  it("hides the card expiry on the digital card by default", () => {
    expect(SETTING_DEFAULTS.passportCard.showExpiryOnDigital).toBe(false);
    expect(formatCardExpiry(new Date(2028, 8, 30))).toBe("09/2028");
  });
});

describe("Welcome reward (§4) and card expiry (§1)", () => {
  it("joining alone earns nothing — the first paid purchase is the verification", async () => {
    const c = await makeCustomer();
    await joinPassport(db, c.id);
    await joinPassport(db, c.id); // idempotent
    let after = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.loyaltyPoints).toBe(0);
    expect(after.passportJoinedAt).not.toBeNull();
    expect(after.cardExpiresAt).not.toBeNull();

    const v = await makeVariant({ stock: 5, phone: false }); // accessory: no purchase points, still a transaction
    const o = await makeOrder(v.id, 1, c.id);
    await finalizeOrder(o.id, { markPaid: true });
    const o2 = await makeOrder(v.id, 1, c.id);
    await finalizeOrder(o2.id, { markPaid: true });
    after = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.loyaltyPoints).toBe(25);
    const lots = await db.loyaltyTransaction.findMany({ where: { customerId: c.id, source: "WELCOME" } });
    expect(lots).toHaveLength(1);
    expect(lots[0].expiresAt).not.toBeNull(); // normal points expiry applies
  });

  it("is credited on the first completed repair too", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    await joinPassport(db, c.id);
    const r = await makeRepair(c.id);
    await changeRepairStatus(r.id, "COMPLETED", staff.id);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(10 + 25);
  });

  it("is credited at once when a guest claims their profile (a past visit is the proof)", async () => {
    const c = await makeCustomer();
    await joinPassport(db, c.id, { verified: true });
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(25);
  });

  it("walk-in customers who never joined don't get it", async () => {
    const c = await makeCustomer();
    expect(await creditWelcome(db, c.id, "test")).toBeNull();
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(0);
  });

  it("keeps an expiry date an admin already set", async () => {
    const c = await makeCustomer();
    const set = new Date(2030, 0, 31);
    await db.customer.update({ where: { id: c.id }, data: { cardExpiresAt: set } });
    await joinPassport(db, c.id);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).cardExpiresAt?.getTime()).toBe(set.getTime());
  });
});

describe("Referral reward (§3)", () => {
  it("finds the referrer by Passport ID or mobile and blocks self-referral", async () => {
    const r = await db.customer.update({ where: { id: (await makeCustomer()).id }, data: { passportNo: `PBP-${Date.now()}` } });
    expect((await findReferrer(db, r.passportNo.toLowerCase(), "03009999999"))?.id).toBe(r.id);
    expect((await findReferrer(db, r.phone, "03009999999"))?.id).toBe(r.id);
    expect(await findReferrer(db, "", "03009999999")).toBeNull();
    await expect(findReferrer(db, r.passportNo, r.phone)).rejects.toBeInstanceOf(PassportError);
    await expect(findReferrer(db, "PBP-NOPE", "03009999999")).rejects.toBeInstanceOf(PassportError);
  });

  it("pays the referrer 25 points on the friend's first paid purchase — once", async () => {
    const referrer = await makeCustomer();
    const friend = await makeCustomer();
    await db.customer.update({ where: { id: friend.id }, data: { referredById: referrer.id } });
    const v = await makeVariant({ stock: 5, phone: false }); // an accessory still counts as a purchase
    const o1 = await makeOrder(v.id, 1, friend.id);
    await finalizeOrder(o1.id, { markPaid: true });
    const o2 = await makeOrder(v.id, 1, friend.id);
    await finalizeOrder(o2.id, { markPaid: true });
    expect((await db.customer.findUniqueOrThrow({ where: { id: referrer.id } })).loyaltyPoints).toBe(25);
    const lots = await db.loyaltyTransaction.findMany({ where: { customerId: referrer.id, source: "REFERRAL" } });
    expect(lots).toHaveLength(1);
    expect(lots[0].orderId).toBeNull(); // not tied to the friend's order, so returns never reverse it
    expect((await db.customer.findUniqueOrThrow({ where: { id: friend.id } })).referralRewardedAt).not.toBeNull();
  });

  it("does nothing for an unpaid (cash-on-delivery) order", async () => {
    const referrer = await makeCustomer();
    const friend = await makeCustomer();
    await db.customer.update({ where: { id: friend.id }, data: { referredById: referrer.id } });
    const v = await makeVariant({ stock: 5 });
    const o = await makeOrder(v.id, 1, friend.id);
    await finalizeOrder(o.id, { markPaid: false });
    expect((await db.customer.findUniqueOrThrow({ where: { id: referrer.id } })).loyaltyPoints).toBe(0);
  });

  it("pays on the friend's first completed repair", async () => {
    const staff = await makeStaff();
    const referrer = await makeCustomer();
    const friend = await makeCustomer();
    await db.customer.update({ where: { id: friend.id }, data: { referredById: referrer.id } });
    const r = await makeRepair(friend.id);
    await changeRepairStatus(r.id, "COMPLETED", staff.id);
    expect((await db.customer.findUniqueOrThrow({ where: { id: referrer.id } })).loyaltyPoints).toBe(25);
    expect(await creditReferral(db, friend.id, "again")).toBeNull();
  });

  it("customers who weren't referred earn exactly as before", async () => {
    const c = await makeCustomer();
    const v = await makeVariant({ stock: 5 });
    const o = await makeOrder(v.id, 1, c.id);
    await finalizeOrder(o.id, { markPaid: true });
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(20);
  });
});

describe("Manual award (§5)", () => {
  it("is its own AWARD transaction with the admin and time recorded", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    await earnPoints(db, { customerId: c.id, points: 40, source: "MANUAL", type: "AWARD", reason: "Goodwill — late repair", staffId: staff.id });
    const t = await db.loyaltyTransaction.findFirstOrThrow({ where: { customerId: c.id, type: "AWARD" } });
    expect(t.points).toBe(40);
    expect(t.staffId).toBe(staff.id);
    expect(t.reason).toBe("Goodwill — late repair");
    expect(t.createdAt).toBeInstanceOf(Date);
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(40);
  });
});

describe("Customer deletion (§6)", () => {
  it("unlinks referred friends instead of failing", async () => {
    const referrer = await makeCustomer();
    const friend = await makeCustomer();
    await db.customer.update({ where: { id: friend.id }, data: { referredById: referrer.id } });
    await db.customer.delete({ where: { id: referrer.id } });
    expect((await db.customer.findUniqueOrThrow({ where: { id: friend.id } })).referredById).toBeNull();
  });
});
