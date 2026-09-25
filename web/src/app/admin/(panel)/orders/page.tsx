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
  const orders = await db.order.findMany({
    where: {
      ...VIEWS[view].where,
      ...(q ? { OR: [{ number: { contains: q.toUpperCase() } }, { customerName: like(q) }, ...(digits.length >= 4 ? [{ customerPhone: { contains: digits } }] : [])] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 }, staff: true, items: true },
  });
  return (
    <>
      <PageTitle title="Orders" sub="Online and in-store sales with payment and fulfilment status." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(VIEWS).map(([k, v]) => (
          <FilterLink key={k} href={`/admin/orders?view=${k}`} active={view === k}>{v.label}</FilterLink>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Order no., phone, name…" className="field !w-60 !rounded-full !py-2" />
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
