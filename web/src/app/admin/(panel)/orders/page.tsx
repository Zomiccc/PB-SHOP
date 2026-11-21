import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { pkr } from "@/lib/format";
import { Badge, FilterLink, PageTitle, Panel, Table, Td, dt, statusTone } from "@/components/admin/Primitives";

export const metadata = { title: "Orders" };

const VIEWS: Record<string, { label: string; where: Prisma.OrderWhereInput }> = {
  all: { label: "All", where: {} },
  open: { label: "To fulfil", where: { fulfilmentStatus: { in: ["NEW", "PROCESSING", "READY", "SHIPPED"] } } },
  review: { label: "Receipt to check", where: { paymentStatus: "UNDER_REVIEW" } },
  pending: { label: "Payment pending", where: { paymentStatus: "PENDING" } },
  paid: { label: "Paid", where: { paymentStatus: "PAID" } },
  failed: { label: "Failed", where: { paymentStatus: "FAILED" } },
  hold: { label: "On hold", where: { fulfilmentStatus: "ON_HOLD" } },
  pos: { label: "In-store", where: { channel: "POS" } },
  online: { label: "Online", where: { channel: "ONLINE" } },
};

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const sp = await props.searchParams;
  const view = typeof sp.view === "string" && sp.view in VIEWS ? sp.view : "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const digits = q.replace(/\D/g, "");
  // Date search (Part 2): one day, or a range, in Pakistan time.
  const day = (k: string) => (typeof sp[k] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp[k] as string) ? (sp[k] as string) : "");
  const from = day("from");
  const to = day("to") || from;
  const dateWhere: Prisma.OrderWhereInput = from ? { createdAt: { gte: new Date(`${from}T00:00:00+05:00`), lt: new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 86_400_000) } } : {};
  const orders = await db.order.findMany({
    where: {
      ...VIEWS[view].where,
      ...dateWhere,
      ...(q ? { OR: [{ number: { contains: q.toUpperCase() } }, { customerName: like(q) }, ...(digits.length >= 4 ? [{ customerPhone: { contains: digits } }] : [])] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 }, staff: true, items: true },
  });
  return (
    <>
      <PageTitle title="Orders" sub={from ? `Sales ${from === to ? `on ${from}` : `from ${from} to ${to}`} · ${orders.length} found · ${pkr(orders.reduce((t, o) => t + o.total, 0))}` : "Online and in-store sales with payment and fulfilment status. Pick a day or a date range to find past sales."} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(VIEWS).map(([k, v]) => (
          <FilterLink key={k} href={`/admin/orders?view=${k}${from ? `&from=${from}&to=${to}` : ""}`} active={view === k}>{v.label}</FilterLink>
        ))}
        <form className="ml-auto flex flex-wrap items-center gap-2">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Order no., phone, name…" className="field !w-60 !rounded-full !py-2" />
          <label className="flex items-center gap-1 text-xs text-muted">From <input type="date" name="from" defaultValue={from} className="field !w-auto !py-2" /></label>
          <label className="flex items-center gap-1 text-xs text-muted">To <input type="date" name="to" defaultValue={day("to")} className="field !w-auto !py-2" /></label>
          <button className="btn btn-ghost !py-2 !text-sm">Search</button>
          {(from || q) && <Link href={`/admin/orders?view=${view}`} className="text-xs text-blue">Clear</Link>}
        </form>
      </div>
      <Panel>
        <Table head={["Order", "Customer", "Items", "Total", "Payment", "Txn ref", "Fulfilment", "Staff"]} empty="No orders found.">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-cream/60">
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-blue">{o.number}</Link>
                <span className="block text-xs text-muted">{o.channel === "POS" ? "In-store" : "Online"} · {dt(o.createdAt)}</span>
              </Td>
              <Td>{o.customerName}<span className="block text-xs text-muted">{o.customerPhone}</span></Td>
              <Td className="max-w-[220px] truncate text-xs">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</Td>
              <Td className="font-semibold">{pkr(o.total)}</Td>
              <Td><Badge tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Badge><span className="block text-xs text-muted">{o.payments[0]?.method}</span></Td>
              <Td className="font-mono text-xs">{o.payments[0]?.providerRef ?? "—"}</Td>
              <Td><Badge tone={statusTone(o.fulfilmentStatus)}>{o.fulfilmentStatus.replace("_", " ")}</Badge></Td>
              <Td className="text-xs">{o.staff?.name ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
