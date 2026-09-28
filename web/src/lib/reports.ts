import type { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Investment, revenue and profit (master brief §10).
 *  - Investment = every PURCHASE movement: quantity × purchase price.
 *  - Revenue    = paid sale lines: quantity × selling price (refunded / cancelled orders excluded).
 *  - Profit     = revenue − cost of the units sold, for lines where the purchase price is known.
 */
export type FinanceLine = { qty: number; unitPrice: number; unitCost: number | null };

export function summarise(purchases: { qtyChange: number; unitPrice: number | null }[], sales: FinanceLine[]) {
  const investment = purchases.reduce((s, m) => s + m.qtyChange * (m.unitPrice ?? 0), 0);
  const revenue = sales.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const costed = sales.filter((l) => l.unitCost != null);
  const costedRevenue = costed.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const cogs = costed.reduce((s, l) => s + l.qty * (l.unitCost ?? 0), 0);
  const profit = costedRevenue - cogs;
  return {
    investment,
    revenue,
    cogs,
    profit,
    margin: costedRevenue > 0 ? Math.round((profit / costedRevenue) * 1000) / 10 : null,
    unitsSold: sales.reduce((s, l) => s + l.qty, 0),
    unitsPurchased: purchases.reduce((s, m) => s + m.qtyChange, 0),
    uncostedLines: sales.length - costed.length,
  };
}

export type ReportFilters = { from: Date; to: Date; category?: string; staffId?: string; item?: string; type?: string };

/** Transactions matching the report filters, plus the investment / revenue / profit summary. */
export async function financeReport(f: ReportFilters) {
  const variant: Prisma.VariantWhereInput = {
    ...(f.category ? { product: { type: f.category } } : {}),
    ...(f.item ? { OR: [{ sku: { contains: f.item.toUpperCase() } }, { barcode: f.item }, { imei: f.item }, { product: { name: { contains: f.item } } }] } : {}),
  };
  const when = { gte: f.from, lte: f.to };
  const wantPurchases = !f.type || f.type === "PURCHASE";
  const wantSales = !f.type || f.type === "SALE";

  const [purchases, lines, movements] = await Promise.all([
    wantPurchases ? db.stockMovement.findMany({ where: { type: "PURCHASE", createdAt: when, variant, ...(f.staffId ? { staffId: f.staffId } : {}) }, select: { qtyChange: true, unitPrice: true } }) : [],
    wantSales
      ? db.orderItem.findMany({
          where: { variant, order: { paymentStatus: "PAID", createdAt: when, ...(f.staffId ? { staffId: f.staffId } : {}) } },
          select: { qty: true, unitPrice: true, unitCost: true },
        })
      : [],
    db.stockMovement.findMany({
      where: { createdAt: when, variant, ...(f.staffId ? { staffId: f.staffId } : {}), ...(f.type ? { type: f.type } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { variant: { include: { product: true } }, staff: true, order: true },
    }),
  ]);
  return { summary: summarise(purchases, lines), movements };
}
