import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { Badge, FilterLink, PageTitle, Panel, Stat, Table, Td, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { adjustStockAction } from "../../_actions/products";

export const metadata = { title: "Inventory" };

/** Stock on hand, low-stock alerts, quick adjustments and the full movement log (§5, §6). */
export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  const sp = await props.searchParams;
  const filter = typeof sp.filter === "string" ? sp.filter : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const [variants, movements] = await Promise.all([
    db.variant.findMany({ where: { product: { active: true } }, include: { product: true }, orderBy: [{ stockQty: "asc" }] }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { variant: { include: { product: true } }, staff: true, order: true } }),
  ]);
  let list = variants.filter((v) => v.active);
  if (filter === "low") list = list.filter((v) => v.stockQty <= v.lowStockThreshold);
  if (filter === "out") list = list.filter((v) => v.stockQty <= 0);
  if (q) list = list.filter((v) => `${v.product.name} ${v.sku} ${v.barcode} ${v.color ?? ""}`.toLowerCase().includes(q));
  const units = variants.reduce((s, v) => s + Math.max(0, v.stockQty), 0);
  const value = variants.reduce((s, v) => s + Math.max(0, v.stockQty) * (v.salePrice ?? v.price), 0);

  return (
    <>
      <PageTitle title="Inventory" sub="Every change below is logged with the employee, reason and time." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Units in stock" value={units.toLocaleString("en-PK")} />
        <Stat label="Retail stock value" value={pkr(value)} />
        <Stat label="Low stock" value={variants.filter((v) => v.active && v.stockQty > 0 && v.stockQty <= v.lowStockThreshold).length} tone="gold" />
        <Stat label="Out of stock" value={variants.filter((v) => v.active && v.stockQty <= 0).length} tone="red" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterLink href="/admin/inventory" active={filter === "all"}>All</FilterLink>
        <FilterLink href="/admin/inventory?filter=low" active={filter === "low"}>Low stock</FilterLink>
        <FilterLink href="/admin/inventory?filter=out" active={filter === "out"}>Out of stock</FilterLink>
        <form className="ml-auto">
          <input type="hidden" name="filter" value={filter} />
          <input name="q" defaultValue={q} placeholder="Search / scan barcode…" className="field !w-64 !rounded-full !py-2" />
        </form>
      </div>
      <Panel>
        <Table head={["Item", "SKU / barcode", "Price", "On hand", "Alert at", "Adjust"]} empty="No items match.">
          {list.map((v) => (
            <tr key={v.id}>
              <Td>
                <Link href={`/admin/products/${v.productId}`} className="font-semibold hover:text-blue">{v.product.name}</Link>
                <span className="block text-xs text-muted">{[v.storage, v.color, v.grade && `Grade ${v.grade}`].filter(Boolean).join(" · ")}</span>
              </Td>
              <Td className="font-mono text-xs">{v.sku}<span className="block text-muted">{v.barcode}</span></Td>
              <Td>{pkr(v.salePrice ?? v.price)}</Td>
              <Td><Badge tone={v.stockQty <= 0 ? "red" : v.stockQty <= v.lowStockThreshold ? "gold" : "green"}>{v.stockQty}</Badge></Td>
              <Td>{v.lowStockThreshold}</Td>
              <Td>
                <ActionForm action={adjustStockAction} resetOnSuccess className="flex gap-2">
                  <input type="hidden" name="variantId" value={v.id} />
                  <input name="qty" type="number" placeholder="±" required aria-label="Quantity change" className="field !w-20 !py-1.5" />
                  <input name="reason" placeholder="Reason" required aria-label="Reason" className="field !w-40 !py-1.5" />
                  <Submit variant="ghost">Save</Submit>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title="Stock movement log" className="mt-6">
        <Table head={["When", "Item", "Movement", "After", "By", "Reason / order"]}>
          {movements.map((m) => (
            <tr key={m.id}>
              <Td className="whitespace-nowrap text-xs text-muted">{dt(m.createdAt)}</Td>
              <Td>{m.variant.product.name} <span className="font-mono text-xs text-muted">{m.variant.sku}</span></Td>
              <Td><Badge tone={m.qtyChange > 0 ? "green" : "red"}>{m.type} {m.qtyChange > 0 ? "+" : ""}{m.qtyChange}</Badge></Td>
              <Td>{m.qtyAfter}</Td>
              <Td>{m.staff?.name ?? <span className="text-muted">Online checkout</span>}</Td>
              <Td className="text-xs">{m.order ? <Link href={`/admin/orders/${m.orderId}`} className="text-blue">{m.order.number}</Link> : m.reason}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
