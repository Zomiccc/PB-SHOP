import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { Badge, FilterLink, PageTitle, Panel, Table, Td } from "@/components/admin/Primitives";

export const metadata = { title: "Products" };

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const view = typeof sp.view === "string" ? sp.view : "all";
  const where =
    view === "new" ? { type: "PHONE", condition: "NEW" } : view === "used" ? { type: "PHONE", condition: "USED" } : view === "accessories" ? { type: "ACCESSORY" } : view === "hidden" ? { active: false } : {};
  const products = await db.product.findMany({ where, include: { variants: true }, orderBy: [{ active: "desc" }, { updatedAt: "desc" }] });
  const needle = q.toLowerCase();
  const list = needle
    ? products.filter((p) => `${p.name} ${p.brand} ${p.variants.map((v) => `${v.sku} ${v.barcode}`).join(" ")}`.toLowerCase().includes(needle))
    : products;

  return (
    <>
      <PageTitle title="Products" sub={`${products.length} products`}>
        <Link href="/admin/labels" className="btn btn-ghost !py-2.5 !text-sm text-navy-950"><span>Print barcode labels</span></Link>
        <Link href="/admin/products/new" className="btn btn-red !py-2.5 !text-sm">Add product</Link>
      </PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ["all", "All"],
          ["new", "New phones"],
          ["used", "Used phones"],
          ["accessories", "Accessories"],
          ["hidden", "Hidden"],
        ].map(([k, l]) => (
          <FilterLink key={k} href={`/admin/products?view=${k}`} active={view === k}>{l}</FilterLink>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Search name, SKU, barcode…" className="field !w-64 !rounded-full !py-2" />
        </form>
      </div>
      <Panel>
        <Table head={["Product", "Type", "Variants / SKUs", "Price", "Stock", "3D", "Status"]} empty="No products match.">
          {list.map((p) => {
            const stock = p.variants.reduce((s, v) => s + v.stockQty, 0);
            const low = p.variants.some((v) => v.active && v.stockQty <= v.lowStockThreshold);
            const prices = p.variants.map((v) => v.salePrice ?? v.price);
            return (
              <tr key={p.id} className="hover:bg-cream/60">
                <Td>
                  <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-blue">{p.name}</Link>
                  <span className="block text-xs text-muted">{p.brand}</span>
                </Td>
                <Td>{p.type === "ACCESSORY" ? p.accessoryType?.replace("_", " ").toLowerCase() : p.condition === "USED" ? "Used phone" : "New phone"}</Td>
                <Td className="font-mono text-xs">{p.variants.map((v) => v.sku).join(", ") || "—"}</Td>
                <Td>{prices.length ? pkr(Math.min(...prices)) : "—"}</Td>
                <Td><Badge tone={stock <= 0 ? "red" : low ? "gold" : "green"}>{stock}</Badge></Td>
                <Td>{p.model3dKind ? <Badge tone="blue">{p.model3dKind === "GLB" ? "GLB" : "6-photo"}</Badge> : <span className="text-xs text-muted">default</span>}</Td>
                <Td>{p.active ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>}</Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
