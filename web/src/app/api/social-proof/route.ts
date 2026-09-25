import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { timeAgo } from "@/lib/format";

/** Real paid orders only (§15) — never fabricated activity. */
export async function GET() {
  const cfg = await getSetting("socialProof");
  if (!cfg.enabled) return NextResponse.json({ enabled: false, items: [] });

  const since = new Date(Date.now() - cfg.lookbackDays * 86400_000);
  const orders = await db.order.findMany({
    where: { paymentStatus: "PAID", createdAt: { gte: since }, socialProofLabel: { not: null } },
    orderBy: { createdAt: "desc" },
    take: cfg.maxItems,
    include: { items: { take: 1, orderBy: { unitPrice: "desc" } } },
  });

  return NextResponse.json(
    {
      enabled: true,
      intervalSeconds: cfg.intervalSeconds,
      displaySeconds: cfg.displaySeconds,
      items: orders
        .filter((o) => o.items[0])
        .map((o) => ({ label: o.socialProofLabel, product: o.items[0].name, ago: timeAgo(o.createdAt) })),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
