import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { pkr } from "@/lib/format";
import { REPAIR_STATUSES } from "@/lib/constants";
import { Badge, PageTitle, Panel, Stat, Table, Td, dt, statusTone } from "@/components/admin/Primitives";
import { BarChart } from "@/components/admin/BarChart";
import { EXPENSE_KINDS, expenseTotals, pktDay, pktDayStart } from "@/lib/expenses";

export const metadata = { title: "Dashboard" };

export default async function Dashboard(props: PageProps<"/admin">) {
  const staff = await requireStaffPage();
  const { denied, installment } = await props.searchParams;
  const start = pktDayStart(pktDay(new Date()));
  const since14 = new Date(start.getTime() - 13 * 86400_000);
  // A sale counts on the day it was paid: in-store on the day it was rung up, online on the day the payment was confirmed.
  const paidSince = (from: Date) => ({ paymentStatus: "PAID", OR: [{ createdAt: { gte: from } }, { payments: { some: { verifiedAt: { gte: from } } } }] });

  const [todayOrders, openRepairs, variants, recentOrders, activeRepairs, paid14, repairs14, installmentsToday, expenses, savedInstallment] = await Promise.all([
    db.order.findMany({ where: paidSince(start), include: { payments: { select: { verifiedAt: true } } } }),
    db.repairRequest.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.variant.findMany({ where: { active: true, product: { active: true } }, include: { product: true }, orderBy: { stockQty: "asc" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.repairRequest.findMany({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { createdAt: "asc" }, take: 8 }),
    db.order.findMany({ where: paidSince(since14), select: { total: true, createdAt: true, channel: true, payments: { select: { verifiedAt: true } } } }),
    // Completed repairs are sales too (follow-up, 25 Nov): what the customer paid, less any PB Rewards discount.
    db.repairRequest.findMany({ where: { status: "COMPLETED", completedAt: { gte: since14 } }, select: { finalPrice: true, quote: true, partsCost: true, rewardDiscount: true, completedAt: true } }),
    db.installmentSale.findMany({ where: { createdAt: { gte: start }, status: { not: "CANCELLED" } }, select: { totalPrice: true, phoneValue: true } }),
    expenseTotals(),
    typeof installment === "string" ? db.installmentSale.findUnique({ where: { id: installment }, select: { ref: true, phoneModel: true, customerName: true } }) : null,
  ]);
  const paidAt = (o: { createdAt: Date; channel?: string; payments: { verifiedAt: Date | null }[] }) =>
    o.channel === "ONLINE" ? o.payments.map((p) => p.verifiedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? o.createdAt : o.createdAt;
  const todaysOrders = todayOrders.filter((o) => paidAt(o) >= start);
  const repairCharge = (r: (typeof repairs14)[number]) => Math.max(0, (r.finalPrice ?? r.quote ?? 0) - (r.rewardDiscount ?? 0));
  const repairsToday = repairs14.filter((r) => r.completedAt! >= start);
  const shopToday = todaysOrders.reduce((s, o) => s + o.total, 0);
  const repairToday = repairsToday.reduce((s, r) => s + repairCharge(r), 0);
  const repairProfitToday = repairsToday.reduce((s, r) => s + repairCharge(r) - (r.partsCost ?? 0), 0);
  const installmentToday = installmentsToday.reduce((s, i) => s + (i.phoneValue ?? i.totalPrice), 0);
  const low = variants.filter((v) => v.stockQty <= v.lowStockThreshold);
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14.getTime() + i * 86400_000);
    const key = d.toDateString();
    const orders = paid14.filter((o) => paidAt(o).toDateString() === key).reduce((s, o) => s + o.total, 0);
    const repairs = repairs14.filter((r) => r.completedAt!.toDateString() === key).reduce((s, r) => s + repairCharge(r), 0);
    return { label: d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }), value: orders + repairs };
  });
  const statusLabel = (k: string) => REPAIR_STATUSES.find((s) => s.key === k)?.label ?? k;

  return (
    <>
      {savedInstallment && <p className="mb-6 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Installment sale {savedInstallment.ref} saved — {savedInstallment.phoneModel} for {savedInstallment.customerName}. PB Points were added to the customer&apos;s account.</p>}
      {denied && <p className="mb-6 rounded-xl bg-red/10 px-4 py-3 text-sm text-red">That area is restricted to the owner (super admin).</p>}
      <PageTitle title={`Hello, ${staff.name.split(" ")[0]}`} sub={new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}>
        <Link href="/admin/pos" className="btn btn-red !py-2.5 !text-sm">Scan &amp; sell</Link>
        <Link href="/admin/repairs?new=1" className="btn btn-primary !py-2.5 !text-sm">New walk-in repair</Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sales today" value={pkr(shopToday + repairToday)} hint={`Shop ${pkr(shopToday)} (${todaysOrders.length}) · repairs ${pkr(repairToday)} (${repairsToday.length})`} />
        <Stat label="Open repairs" value={openRepairs} />
        <Stat label="Low-stock alerts" value={low.length} tone={low.length ? "red" : undefined} hint="At or below threshold" />
        <Stat label="Products live" value={new Set(variants.map((v) => v.productId)).size} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Repairs delivered today" value={pkr(repairToday)} hint={`${repairsToday.length} repair(s) · profit after parts ${pkr(repairProfitToday)}`} />
        <Stat label="Installment sales today" value={pkr(installmentToday)} hint={`${installmentsToday.length} phone(s)`} />
      </div>

      {/* Follow-up (25 Nov): each expense type on its own card, today and this month. */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(["DAILY", "REPAIR", "GIFT"] as const).map((k) => {
          const key = k === "DAILY" ? "daily" : k === "REPAIR" ? "repair" : "gift";
          return (
            <Link key={k} href={EXPENSE_KINDS[k].href as never} className="block rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] hover:ring-1 hover:ring-gold/40">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">{EXPENSE_KINDS[k].title}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div><p className="text-xs text-muted">Today</p><p className="text-2xl font-bold">{pkr(expenses.today[key])}</p></div>
                <div className="text-right"><p className="text-xs text-muted">This month</p><p className="text-lg font-semibold">{pkr(expenses.month[key])}</p></div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Paid revenue (sales + repairs) — last 14 days">
          <BarChart data={series} label="Revenue (PKR)" unit="thousands" />
        </Panel>
        <Panel title="Low-stock alerts" action={<Link href="/admin/inventory?filter=low" className="text-sm text-blue">Inventory →</Link>}>
          {low.length === 0 ? (
            <p className="text-sm text-muted">All stock is above threshold.</p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {low.slice(0, 8).map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/admin/products/${v.productId}`} className="min-w-0 truncate hover:text-blue">
                    {v.product.name} <span className="text-muted">· {[v.storage, v.color].filter(Boolean).join(" ")} · {v.sku}</span>
                  </Link>
                  <Badge tone={v.stockQty <= 0 ? "red" : "gold"}>{v.stockQty <= 0 ? "Out" : `${v.stockQty} left`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent orders" action={<Link href="/admin/orders" className="text-sm text-blue">All orders →</Link>}>
          <Table head={["Order", "Customer", "Total", "Payment"]}>
            {recentOrders.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-blue">{o.number}</Link><span className="block text-xs text-muted">{o.channel} · {dt(o.createdAt)}</span></Td>
                <Td>{o.customerName}</Td>
                <Td>{pkr(o.total)}</Td>
                <Td><Badge tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Repairs in progress" action={<Link href="/admin/repairs" className="text-sm text-blue">Repair board →</Link>}>
          <Table head={["Ref", "Device", "Status", "Since"]}>
            {activeRepairs.map((r) => (
              <tr key={r.id}>
                <Td><Link href={`/admin/repairs/${r.id}`} className="font-semibold hover:text-blue">{r.ref}</Link></Td>
                <Td>{r.brand} {r.model}</Td>
                <Td><Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge></Td>
                <Td className="text-xs text-muted">{dt(r.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}
