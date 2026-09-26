import { db } from "./db";

/**
 * Customer reviews (master brief §3, §17). Only genuine submissions — nothing is ever seeded or
 * invented. New reviews are PENDING until staff approve them; reviewers whose phone number
 * matches a paid order or repair are marked "verified".
 */

export type PublicReview = { id: string; customerName: string; rating: number; title: string | null; body: string; verified: boolean; createdAt: Date; productName: string | null; productSlug: string | null };

/** First name + initial only — reviewers' full names and numbers are never shown. */
export function displayName(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0] ?? "Customer"}${parts[1] ? ` ${parts[1][0].toUpperCase()}.` : ""}`;
}

export async function approvedReviews(opts: { productId?: string; take?: number } = {}): Promise<PublicReview[]> {
  const rows = await db.review.findMany({
    where: { status: "APPROVED", ...(opts.productId ? { productId: opts.productId } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 20,
    include: { product: { select: { name: true, slug: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    customerName: displayName(r.customerName),
    rating: r.rating,
    title: r.title,
    body: r.body,
    verified: r.verified,
    createdAt: r.createdAt,
    productName: r.product?.name ?? null,
    productSlug: r.product?.slug ?? null,
  }));
}

export async function reviewStats(productId?: string) {
  const agg = await db.review.aggregate({
    where: { status: "APPROVED", ...(productId ? { productId } : {}) },
    _avg: { rating: true },
    _count: true,
  });
  return { average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null, count: agg._count };
}

export async function isVerifiedCustomer(phone: string | null | undefined) {
  const p = (phone ?? "").replace(/[\s-]/g, "");
  if (p.length < 10) return false;
  const [orders, repairs] = await Promise.all([
    db.order.count({ where: { customerPhone: p, paymentStatus: "PAID" } }),
    db.repairRequest.count({ where: { phone: p, status: "COMPLETED" } }),
  ]);
  return orders + repairs > 0;
}
