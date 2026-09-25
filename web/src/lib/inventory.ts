import type { Prisma } from "@prisma/client";
import { audit } from "./audit";

type Tx = Prisma.TransactionClient;

export class StockError extends Error {
  constructor(message: string, public sku?: string) {
    super(message);
  }
}

/**
 * Decrements stock for every line on an order and writes a SALE movement per line (§6, §19).
 * Refuses zero/insufficient stock unless the variant has an authorised backorder exception.
 * Idempotent: does nothing if the order's stock is already committed.
 */
export async function commitOrderStock(tx: Tx, orderId: string, staffId: string | null, opts: { overrideBy?: string | null } = {}) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (order.stockCommitted) return;

  for (const item of order.items) {
    const v = item.variant;
    if (v.stockQty < item.qty && !v.allowBackorder) {
      if (!opts.overrideBy) throw new StockError(`${v.product.name} (${v.sku}) has only ${v.stockQty} in stock`, v.sku);
      // Zero-stock exception authorised by a super admin (§6) — always audited.
      await audit(
        { staffId, action: "ZERO_STOCK_OVERRIDE", entityType: "VARIANT", entityId: v.id, recordLabel: `${v.product.name} / ${v.sku}`, before: { stockQty: v.stockQty }, after: { qtySold: item.qty, authorisedBy: opts.overrideBy } },
        tx,
      );
    }
    const updated = await tx.variant.update({ where: { id: v.id }, data: { stockQty: { decrement: item.qty } } });
    await tx.stockMovement.create({
      data: { variantId: v.id, type: "SALE", qtyChange: -item.qty, qtyAfter: updated.stockQty, orderId, staffId, reason: `Order ${order.number}` },
    });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockCommitted: true } });
  await audit(
    {
      staffId,
      action: "SALE_COMPLETED",
      entityType: "ORDER",
      entityId: orderId,
      recordLabel: `Order ${order.number}`,
      after: { total: order.total, items: order.items.map((i) => ({ sku: i.sku, qty: i.qty })) },
    },
    tx,
  );
}

/** Restores stock when a return/cancellation is finalised (§6, §19). */
export async function restoreOrderStock(tx: Tx, orderId: string, staffId: string | null, type: "RETURN" | "CANCEL") {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (!order.stockCommitted) return;
  for (const item of order.items) {
    const updated = await tx.variant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.qty } } });
    await tx.stockMovement.create({
      data: {
        variantId: item.variantId,
        type,
        qtyChange: item.qty,
        qtyAfter: updated.stockQty,
        orderId,
        staffId,
        reason: `${type === "RETURN" ? "Return" : "Cancellation"} of ${order.number}`,
      },
    });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockCommitted: false } });
  await audit(
    { staffId, action: type === "RETURN" ? "ORDER_RETURNED" : "ORDER_CANCELLED", entityType: "ORDER", entityId: orderId, recordLabel: `Order ${order.number}` },
    tx,
  );
}

/** Manual stock adjustment with before/after audit (§5 Stock, §16). */
export async function adjustStock(tx: Tx, variantId: string, qtyChange: number, staffId: string, reason: string) {
  const before = await tx.variant.findUniqueOrThrow({ where: { id: variantId }, include: { product: true } });
  if (before.stockQty + qtyChange < 0) throw new StockError("Stock cannot go below zero", before.sku);
  const after = await tx.variant.update({ where: { id: variantId }, data: { stockQty: { increment: qtyChange } } });
  await tx.stockMovement.create({
    data: { variantId, type: qtyChange > 0 ? "RECEIVED" : "ADJUST", qtyChange, qtyAfter: after.stockQty, staffId, reason },
  });
  await audit(
    {
      staffId,
      action: "STOCK_ADJUSTED",
      entityType: "VARIANT",
      entityId: variantId,
      recordLabel: `${before.product.name} / ${before.sku} / ${qtyChange > 0 ? "+" : ""}${qtyChange}`,
      before: { stockQty: before.stockQty },
      after: { stockQty: after.stockQty, reason },
    },
    tx,
  );
  return after;
}
