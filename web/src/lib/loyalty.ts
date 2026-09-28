import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { getSetting, type SettingValue } from "./settings";

/**
 * PB Phone Passport points engine (master brief §4).
 *
 *  - Earning: 10 points per completed repair, 20 per new phone, 15 per used phone (configurable).
 *  - Every earning event is a separate "lot" with its own expiry date (default: six months) and a
 *    `remaining` balance, so expiry is exact per event.
 *  - Spending (rewards) and deductions use the lots that expire soonest first; expired points can never be spent.
 *  - `Customer.loyaltyPoints` is a cached balance, always recomputed from the lots.
 */

type Tx = Prisma.TransactionClient | PrismaClient;
export type PassportRules = SettingValue<"passport">;

export class LoyaltyError extends Error {}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 31 Aug + 6 months → 28/29 Feb, not 3 Mar.
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/** Points a paid order earns: per phone unit, by condition. Accessories, parts and tablets earn nothing by default. */
export function pointsForItems(
  items: { qty: number; variant: { product: { type: string; condition: string; loyaltyEligible: boolean } } }[],
  rules: Pick<PassportRules, "newPhonePoints" | "usedPhonePoints">,
) {
  const out = { NEW_PHONE: 0, USED_PHONE: 0 };
  for (const i of items) {
    const p = i.variant.product;
    if (!p.loyaltyEligible || p.type !== "PHONE") continue;
    if (p.condition === "USED") out.USED_PHONE += rules.usedPhonePoints * i.qty;
    else out.NEW_PHONE += rules.newPhonePoints * i.qty;
  }
  return out;
}

/** Passport repair discount: a percentage of the labour only — parts are always excluded (master brief §4). */
export function repairDiscount(charge: number, partsCost: number | null | undefined, percent: number) {
  const labour = Math.max(0, charge - Math.max(0, partsCost ?? 0));
  return Math.round((labour * Math.min(100, Math.max(0, percent))) / 100);
}

/** Recomputes the cached balance from unexpired, unspent lots. */
export async function syncBalance(tx: Tx, customerId: string, now = new Date()) {
  const lots = await tx.loyaltyTransaction.aggregate({
    where: { customerId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    _sum: { remaining: true },
  });
  const balance = lots._sum.remaining ?? 0;
  await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: balance } });
  return balance;
}

/** Writes an EXPIRE event for every lot whose six months are up. Idempotent. */
export async function expirePoints(tx: Tx, customerId: string, now = new Date()) {
  const due = await tx.loyaltyTransaction.findMany({ where: { customerId, remaining: { gt: 0 }, expiresAt: { lte: now } }, orderBy: { expiresAt: "asc" } });
  for (const lot of due) {
    await tx.loyaltyTransaction.update({ where: { id: lot.id }, data: { remaining: 0 } });
    await tx.loyaltyTransaction.create({
      data: { customerId, type: "EXPIRE", points: -(lot.remaining ?? 0), reason: `Expired — earned ${lot.createdAt.toLocaleDateString("en-PK")} (${lot.reason ?? lot.type})`, createdAt: now },
    });
  }
  return syncBalance(tx, customerId, now);
}

/** One earning event → one lot. */
export async function earnPoints(
  tx: Tx,
  input: { customerId: string; points: number; source: string; reason: string; type?: "EARN" | "PROMO" | "ADJUST"; orderId?: string | null; repairId?: string | null; staffId?: string | null; now?: Date },
) {
  if (input.points <= 0) return null;
  const rules = await getSetting("passport", tx as Prisma.TransactionClient);
  const now = input.now ?? new Date();
  const lot = await tx.loyaltyTransaction.create({
    data: {
      customerId: input.customerId,
      type: input.type ?? "EARN",
      source: input.source,
      points: input.points,
      remaining: input.points,
      reason: input.reason,
      orderId: input.orderId ?? null,
      repairId: input.repairId ?? null,
      staffId: input.staffId ?? null,
      expiresAt: addMonths(now, rules.expiryMonths),
      createdAt: now,
    },
  });
  await syncBalance(tx, input.customerId, now);
  return lot;
}

/** Available (unexpired) balance — expires anything that is due first. */
export async function availablePoints(tx: Tx, customerId: string, now = new Date()) {
  return expirePoints(tx, customerId, now);
}

/**
 * Spends points from the lots that expire soonest. Throws if the unexpired balance is too low.
 * Used for reward redemptions, staff deductions and reversing points on returns.
 */
export async function spendPoints(
  tx: Tx,
  input: { customerId: string; points: number; type: "REDEEM" | "ADJUST"; reason: string; rewardId?: string | null; orderId?: string | null; repairId?: string | null; staffId?: string | null; now?: Date; allowPartial?: boolean },
) {
  const now = input.now ?? new Date();
  const available = await expirePoints(tx, input.customerId, now);
  const want = Math.abs(input.points);
  if (want === 0) return 0;
  if (available < want && !input.allowPartial) throw new LoyaltyError(`Needs ${want} points — only ${available} available (expired points can't be used)`);
  const take = Math.min(want, available);
  let left = take;
  const lots = await tx.loyaltyTransaction.findMany({
    where: { customerId: input.customerId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
  });
  for (const lot of lots) {
    if (left <= 0) break;
    const use = Math.min(lot.remaining ?? 0, left);
    await tx.loyaltyTransaction.update({ where: { id: lot.id }, data: { remaining: (lot.remaining ?? 0) - use } });
    left -= use;
  }
  if (take > 0) {
    await tx.loyaltyTransaction.create({
      data: { customerId: input.customerId, type: input.type, points: -take, reason: input.reason, rewardId: input.rewardId ?? null, orderId: input.orderId ?? null, repairId: input.repairId ?? null, staffId: input.staffId ?? null, createdAt: now },
    });
  }
  await syncBalance(tx, input.customerId, now);
  return take;
}

/** Points expiring within `days` (shown on the customer's Passport). */
export async function expiringSoon(customerId: string, days = 30, now = new Date()) {
  const until = new Date(now.getTime() + days * 86_400_000);
  return db.loyaltyTransaction.findMany({
    where: { customerId, remaining: { gt: 0 }, expiresAt: { gt: now, lte: until } },
    orderBy: { expiresAt: "asc" },
  });
}

/**
 * One-off: balances created before points lots existed become a single lot that expires six months
 * from now, so nobody loses points in the switch-over. Safe to run repeatedly.
 */
export async function migrateLegacyBalances() {
  const customers = await db.customer.findMany({ where: { loyaltyPoints: { gt: 0 } }, select: { id: true, loyaltyPoints: true } });
  let migrated = 0;
  for (const c of customers) {
    const hasLots = await db.loyaltyTransaction.count({ where: { customerId: c.id, remaining: { not: null } } });
    if (hasLots) continue;
    await db.$transaction((tx) => earnPoints(tx, { customerId: c.id, points: c.loyaltyPoints, source: "MANUAL", type: "ADJUST", reason: "Balance carried over to the new Phone Passport" }));
    migrated++;
  }
  return migrated;
}
