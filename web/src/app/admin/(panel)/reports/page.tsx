import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { ITEM_CATEGORIES, REPAIR_STATUSES } from "@/lib/constants";
import { financeReport } from "@/lib/reports";
import { Badge, FilterLink, PageTitle, Panel, Stat, Table, Td, dt } from "@/components/admin/Primitives";
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
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  // Custom date range (PKT) overrides the quick ranges.
  const from = one("from") ? new Date(`${one("from")}T00:00:00+05:00`) : since;
  const to = one("to") ? new Date(`${one("to")}T23:59:59+05:00`) : new Date();
  const filters = { from, to, category: one("category") in ITEM_CATEGORIES ? one("category") : undefined, staffId: one("staff") || undefined, item: one("item") || undefined, type: ["PURCHASE", "SALE", "RETURN", "ADJUST", "CANCEL", "RECEIVED"].includes(one("type")) ? one("type") : undefined };

  const [finance, orders, repairs, variants, staff] = await Promise.all([
    financeReport(filters),
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

      <Panel title="Investment, revenue & profit" className="mt-6">
        <form className="mb-5 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-7">
          <input type="hidden" name="range" value={range} />
          <input name="item" defaultValue={one("item")} placeholder="Item / Item No. / IMEI" aria-label="Item" className="field !py-2 lg:col-span-2" />
          <select name="category" defaultValue={one("category")} aria-label="Category" className="field !py-2">
            <option value="">All categories</option>
            {Object.entries(ITEM_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="staff" defaultValue={one("staff")} aria-label="Employee" className="field !py-2">
            <option value="">All employees</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="type" defaultValue={one("type")} aria-label="Transaction type" className="field !py-2">
            <option value="">All transactions</option>
            {["PURCHASE", "SALE", "RETURN", "CANCEL", "ADJUST"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="date" name="from" defaultValue={one("from")} aria-label="From" className="field !py-2" />
          <input type="date" name="to" defaultValue={one("to")} aria-label="To" className="field !py-2" />
          <button className="btn btn-primary !py-2 !text-sm sm:col-span-3 lg:col-span-7 lg:justify-self-start">Apply filters</button>
        </form>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Investment (purchases)" value={pkr(finance.summary.investment)} hint={`${finance.summary.unitsPurchased} units bought`} />
          <Stat label="Revenue (paid sales)" value={pkr(finance.summary.revenue)} hint={`${finance.summary.unitsSold} units sold`} />
          <Stat label="Profit" value={pkr(finance.summary.profit)} hint={finance.summary.uncostedLines ? `${finance.summary.uncostedLines} sale line(s) without a purchase price excluded` : "Revenue − cost of units sold"} />
          <Stat label="Margin" value={finance.summary.margin != null ? `${finance.summary.margin}%` : "—"} />
        </div>
        <div className="mt-5">
          <Table head={["When", "Item", "Type", "Qty", "Unit price", "Employee", "Reference"]} empty="No transactions match these filters.">
            {finance.movements.map((m) => (
              <tr key={m.id}>
                <Td className="whitespace-nowrap text-xs text-muted">{dt(m.createdAt)}</Td>
                <Td>{m.variant.product.name} <span className="font-mono text-xs text-muted">{m.variant.sku}</span></Td>
                <Td><Badge tone={m.qtyChange > 0 ? "green" : "red"}>{m.type}</Badge></Td>
                <Td>{m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}</Td>
                <Td>{m.unitPrice != null ? pkr(m.unitPrice) : "—"}</Td>
                <Td className="text-xs">{m.staff?.name ?? "Online"}</Td>
                <Td className="text-xs">{m.order ? <Link href={`/admin/orders/${m.orderId}`} className="text-blue">{m.order.number}</Link> : m.reference ?? m.reason}</Td>
              </tr>
            ))}
          </Table>
        </div>
      </Panel>

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
