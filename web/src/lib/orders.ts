import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { commitOrderStock } from "./inventory";
import { getSetting } from "./settings";
import { earnPoints, pointsForItems } from "./loyalty";
import { audit } from "./audit";
import { privacyLabel } from "./format";
import { firstTransactionRewards } from "./passport";

type Tx = Prisma.TransactionClient;

export async function nextOrderNumber(tx: Tx) {
  const count = await tx.order.count();
  return `PB-${100001 + count}`;
}

export async function nextRepairRef(tx: Tx) {
  const count = await tx.repairRequest.count();
  return `PBR-${1001 + count}`;
}

/**
 * Runs once a payment is verified server-side, or a POS / cash-on-delivery sale is confirmed:
 * commits stock and sets the privacy-safe social-proof label. Phone Passport points
 * are only granted when the order is actually paid (`markPaid`), so unpaid COD orders can't farm rewards;
 * staff trigger `awardOrderBenefits` when a COD order is marked paid.
 */
export async function finalizeOrder(orderId: string, opts: { staffId?: string | null; markPaid: boolean; overrideBy?: string | null; points?: number | null }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

    await commitOrderStock(tx, orderId, opts.staffId ?? null, { overrideBy: opts.overrideBy });

    await tx.order.update({
      where: { id: orderId },
      data: {
        fulfilmentStatus: order.fulfilmentStatus === "NEW" ? "PROCESSING" : order.fulfilmentStatus,
        socialProofLabel: privacyLabel(order.customerName, order.city),
        ...(opts.markPaid ? { paymentStatus: "PAID" } : {}),
      },
    });

    if (opts.markPaid) await awardOrderBenefits(tx, orderId, opts.staffId ?? null, opts.points);
    return order;
  });
}

/**
 * Phone Passport points for a paid order (v4 §3: phone price tiers + 1 point per Rs 100 on accessories),
 * one earning event (lot) per kind so each has its own six-month expiry. Also credits the customer's
 * pending welcome reward and their referrer's referral reward. Idempotent.
 * `manualPoints`: staff typed the number of points at the till instead (0 = none) — audited.
 */
export async function awardOrderBenefits(tx: Tx, orderId: string, staffId: string | null, manualPoints?: number | null) {
  const rules = await getSetting("passport", tx);
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!order.customerId) return;
  // First paid purchase = the verification: pending welcome + referral rewards are credited (once each).
  await firstTransactionRewards(tx, order.customerId, `purchase ${order.number}`, staffId);
  if (await tx.loyaltyTransaction.findFirst({ where: { orderId, type: "EARN" } })) return;

  if (manualPoints != null) {
    const auto = pointsForItems(order.items, rules, order);
    if (manualPoints > 0) await earnPoints(tx, { customerId: order.customerId, points: manualPoints, source: "MANUAL", reason: `Purchase ${order.number} (points set by staff)`, orderId, staffId });
    await audit({ staffId, action: "PASSPORT_POINTS_SET_AT_SALE", entityType: "ORDER", entityId: orderId, recordLabel: `Order ${order.number}`, before: { automatic: auto.NEW_PHONE + auto.USED_PHONE + auto.ACCESSORY }, after: { given: manualPoints } }, tx);
    return;
  }

  const earned = pointsForItems(order.items, rules, order);
  if (earned.NEW_PHONE > 0) await earnPoints(tx, { customerId: order.customerId, points: earned.NEW_PHONE, source: "NEW_PHONE", reason: `New phone — ${order.number}`, orderId, staffId });
  if (earned.USED_PHONE > 0) await earnPoints(tx, { customerId: order.customerId, points: earned.USED_PHONE, source: "USED_PHONE", reason: `Used phone — ${order.number}`, orderId, staffId });
  if (earned.ACCESSORY > 0) await earnPoints(tx, { customerId: order.customerId, points: earned.ACCESSORY, source: "ACCESSORY", reason: `Accessories — ${order.number}`, orderId, staffId });
}
