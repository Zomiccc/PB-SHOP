import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { REPAIR_STATUSES } from "@/lib/constants";
import { FilterLink, PageTitle, Panel, Stat, Table, Td } from "@/components/admin/Primitives";
import { BarChart } from "@/components/admin/BarChart";

export const metadata = { title: "Reports" };

const RANGES = { "7": 7, "30": 30, "90": 90 } as const;

/** Sales, stock, low-stock, repair activity and order/revenue reports (§5). */
export default async function ReportsPage(props: PageProps<"/admin/reports">) {
  const sp = await props.searchParams;
  const range = (typeof sp.range === "string" && sp.range in RANGES ? sp.range : "30") as keyof typeof RANGES;
  const days = RANGES[range];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const since = new Date(start.getTime() - (days - 1) * 86400_000);

  const [orders, repairs, variants, staff] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: since } }, include: { items: true } }),
    db.repairRequest.findMany({ where: { createdAt: { gte: since } } }),
    db.variant.findMany({ where: { active: true, product: { active: true } }, include: { product: true } }),
    db.staff.findMany({ include: { ordersHandled: { where: { createdAt: { gte: since }, paymentStatus: "PAID" } }, repairChanges: { where: { createdAt: { gte: since } } } } }),
  ]);
  const paid = orders.filter((o) => o.paymentStatus === "PAID");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const byDay = Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    return { label: d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }), value: paid.filter((o) => o.createdAt.toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0) };
  });
  const top = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of paid) for (const i of o.items) {
    const t = top.get(i.sku) ?? { name: i.name, qty: 0, revenue: 0 };
    t.qty += i.qty;
    t.revenue += i.qty * i.unitPrice;
    top.set(i.sku, t);
  }
  const topList = [...top.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);
  const repairByStatus = REPAIR_STATUSES.map((s) => ({ label: s.label.split(" ")[0], value: repairs.filter((r) => r.status === s.key).length }));
  const low = variants.filter((v) => v.stockQty <= v.lowStockThreshold);

  return (
    <>
      <PageTitle title="Reports" sub={`Last ${days} days`}>
        {Object.keys(RANGES).map((r) => <FilterLink key={r} href={`/admin/reports?range=${r}`} active={range === r}>{r} days</FilterLink>)}
        <Link href={`/api/admin/export?type=orders&days=${days}`} className="btn btn-ghost !py-2 !text-sm text-ink"><span>Export orders CSV</span></Link>
        <Link href="/api/admin/export?type=inventory" className="btn btn-ghost !py-2 !text-sm text-ink"><span>Export inventory CSV</span></Link>
      </PageTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Paid revenue" value={pkr(revenue)} />
        <Stat label="Paid orders" value={paid.length} hint={`${orders.filter((o) => o.channel === "POS" && o.paymentStatus === "PAID").length} in-store · ${orders.filter((o) => o.channel === "ONLINE" && o.paymentStatus === "PAID").length} online`} />
        <Stat label="Average order" value={pkr(paid.length ? Math.round(revenue / paid.length) : 0)} />
        <Stat label="Repairs booked" value={repairs.length} hint={`${repairs.filter((r) => r.status === "COMPLETED").length} completed`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Paid revenue by day"><BarChart data={byDay} label="Revenue (PKR)" unit="thousands" /></Panel>
        <Panel title="Repairs booked in period, by current status"><BarChart data={repairByStatus} label="Repairs" /></Panel>
        <Panel title="Top products by revenue">
          <Table head={["Product", "SKU", "Units", "Revenue"]} empty="No paid sales in this period.">
            {topList.map(([sku, t]) => (
              <tr key={sku}><Td>{t.name}</Td><Td className="font-mono text-xs">{sku}</Td><Td>{t.qty}</Td><Td className="font-semibold">{pkr(t.revenue)}</Td></tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Staff activity">
          <Table head={["Employee", "Role", "Paid sales", "Sales value", "Repair updates"]}>
            {staff.map((s) => (
              <tr key={s.id}>
                <Td>{s.name}</Td>
                <Td className="text-xs">{s.role === "SUPER_ADMIN" ? "Owner" : "Employee"}</Td>
                <Td>{s.ordersHandled.length}</Td>
                <Td>{pkr(s.ordersHandled.reduce((a, o) => a + o.total, 0))}</Td>
                <Td>{s.repairChanges.length}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title={`Low-stock report (${low.length})`} className="xl:col-span-2">
          <Table head={["Item", "SKU", "On hand", "Alert at", "Price"]} empty="Nothing low.">
            {low.map((v) => (
              <tr key={v.id}><Td>{v.product.name} <span className="text-xs text-muted">{[v.storage, v.color].filter(Boolean).join(" ")}</span></Td><Td className="font-mono text-xs">{v.sku}</Td><Td className="font-semibold">{v.stockQty}</Td><Td>{v.lowStockThreshold}</Td><Td>{pkr(v.salePrice ?? v.price)}</Td></tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}
