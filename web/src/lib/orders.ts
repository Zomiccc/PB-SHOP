import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { commitOrderStock } from "./inventory";
import { getSetting } from "./settings";
import { privacyLabel } from "./format";

type Tx = Prisma.TransactionClient;

export async function nextOrderNumber(tx: Tx) {
  const count = await tx.order.count();
  return `PB-${100001 + count}`;
}

export async function nextRepairRef(tx: Tx) {
  const count = await tx.repairRequest.count();
  return `PBR-${1001 + count}`;
}

async function nextCareCardNumber(tx: Tx) {
  const count = await tx.careCard.count();
  return `PBC-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Runs once a payment is verified server-side, or a POS / cash-on-delivery sale is confirmed:
 * commits stock and sets the privacy-safe social-proof label. Loyalty points and the Care Card
 * are only granted when the order is actually paid (`markPaid`), so unpaid COD orders can't farm rewards;
 * staff trigger `awardOrderBenefits` when a COD order is marked paid.
 */
export async function finalizeOrder(orderId: string, opts: { staffId?: string | null; markPaid: boolean; overrideBy?: string | null }) {
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

    if (opts.markPaid) await awardOrderBenefits(tx, orderId, opts.staffId ?? null);
    return order;
  });
}

/** Loyalty points + Care Card for a paid order. Idempotent — safe to call more than once. */
export async function awardOrderBenefits(tx: Tx, orderId: string, staffId: string | null) {
  const loyalty = await getSetting("loyalty", tx);
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!order.customerId) return;

  const eligible = order.items.filter((i) => i.variant.product.loyaltyEligible).reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const points = Math.floor(eligible / loyalty.pointsPerRupees);
  const already = await tx.loyaltyTransaction.findFirst({ where: { orderId, type: "EARN" } });
  if (points > 0 && !already) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + loyalty.expiryMonths);
    await tx.loyaltyTransaction.create({
      data: { customerId: order.customerId, type: "EARN", points, orderId, reason: `Purchase ${order.number}`, expiresAt, staffId },
    });
    await tx.customer.update({ where: { id: order.customerId }, data: { loyaltyPoints: { increment: points } } });
  }

  const careEligible = order.items.some((i) => i.variant.product.careCardEligible);
  const hasCard = await tx.careCard.findUnique({ where: { orderId } });
  if (careEligible && !hasCard) {
    await tx.careCard.create({ data: { number: await nextCareCardNumber(tx), customerId: order.customerId, orderId } });
  }
}
