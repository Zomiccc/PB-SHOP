/**
 * PB Rewards customer ID (Dev Change Request V2 §5): PBM- + running number, inserted per customer.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { findReferrer } from "@/lib/passport";
import { formatRewardsId, nextRewardsId, rewardsIdNumber } from "@/lib/rewards-id";
import { makeCustomer } from "./helpers";

describe("PB Rewards customer ID (V2 §5)", () => {
  it("uses the PBM-0000 format and grows past four digits", () => {
    expect(formatRewardsId(7)).toBe("PBM-0007");
    expect(formatRewardsId(12345)).toBe("PBM-12345");
    expect(rewardsIdNumber("PBM-0042")).toBe(42);
    expect(rewardsIdNumber("PBP-123456")).toBe(0);
  });

  it("gives each new customer the next free ID", async () => {
    const c = await makeCustomer();
    const a = await db.$transaction(async (tx) => tx.customer.update({ where: { id: c.id }, data: { passportNo: await nextRewardsId(tx) } }));
    expect(a.passportNo).toMatch(/^PBM-\d{4,}$/);
    const next = await db.$transaction((tx) => nextRewardsId(tx));
    expect(rewardsIdNumber(next)).toBeGreaterThan(rewardsIdNumber(a.passportNo));
  });

  it("an old card number still works as a referral code after renumbering", async () => {
    const c = await makeCustomer();
    const legacy = `PBP-L${Date.now()}`;
    await db.customer.update({ where: { id: c.id }, data: { legacyNo: legacy } });
    expect((await findReferrer(db, legacy.toLowerCase(), "03009999999"))?.id).toBe(c.id);
  });
});
