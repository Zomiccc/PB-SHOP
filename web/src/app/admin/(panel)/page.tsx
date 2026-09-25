import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { pkr } from "@/lib/format";
import { REPAIR_STATUSES } from "@/lib/constants";
import { Badge, PageTitle, Panel, Stat, Table, Td, dt, statusTone } from "@/components/admin/Primitives";
import { BarChart } from "@/components/admin/BarChart";

export const metadata = { title: "Dashboard" };

export default async function Dashboard(props: PageProps<"/admin">) {
  const staff = await requireStaffPage();
  const { denied } = await props.searchParams;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const since14 = new Date(start.getTime() - 13 * 86400_000);

  const [todayOrders, openRepairs, variants, recentOrders, activeRepairs, paid14] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: start }, paymentStatus: "PAID" } }),
    db.repairRequest.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.variant.findMany({ where: { active: true, product: { active: true } }, include: { product: true }, orderBy: { stockQty: "asc" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.repairRequest.findMany({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { createdAt: "asc" }, take: 8 }),
    db.order.findMany({ where: { createdAt: { gte: since14 }, paymentStatus: "PAID" }, select: { total: true, createdAt: true } }),
  ]);
  const low = variants.filter((v) => v.stockQty <= v.lowStockThreshold);
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14.getTime() + i * 86400_000);
    const key = d.toDateString();
    return { label: d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }), value: paid14.filter((o) => o.createdAt.toDateString() === key).reduce((s, o) => s + o.total, 0) };
  });
  const statusLabel = (k: string) => REPAIR_STATUSES.find((s) => s.key === k)?.label ?? k;

  return (
    <>
      {denied && <p className="mb-6 rounded-xl bg-red/10 px-4 py-3 text-sm text-red">That area is restricted to the owner (super admin).</p>}
      <PageTitle title={`Hello, ${staff.name.split(" ")[0]}`} sub={new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })}>
        <Link href="/admin/pos" className="btn btn-red !py-2.5 !text-sm">Scan &amp; sell</Link>
        <Link href="/admin/repairs?new=1" className="btn btn-primary !py-2.5 !text-sm">New walk-in repair</Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sales today" value={pkr(todayOrders.reduce((s, o) => s + o.total, 0))} hint={`${todayOrders.length} paid order(s)`} />
        <Stat label="Open repairs" value={openRepairs} />
        <Stat label="Low-stock alerts" value={low.length} tone={low.length ? "red" : undefined} hint="At or below threshold" />
        <Stat label="Products live" value={new Set(variants.map((v) => v.productId)).size} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Paid revenue — last 14 days">
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
