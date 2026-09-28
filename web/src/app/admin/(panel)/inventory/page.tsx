import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { ITEM_CATEGORIES } from "@/lib/constants";
import { Badge, FilterLink, PageTitle, Panel, Stat, Table, Td, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { AddItemMenu } from "@/components/admin/AddItemMenu";
import { adjustStockAction } from "../../_actions/products";
import { receiveStockAction } from "../../_actions/inventory";

export const metadata = { title: "Inventory" };

const MOVE_TYPES = ["PURCHASE", "RECEIVED", "SALE", "RETURN", "CANCEL", "ADJUST"] as const;

/**
 * Inventory / POS item system (master brief §10): phones, tablets, spare parts and accessories — each
 * with its own Item Number. Type or scan an Item Number, barcode or IMEI to find the exact item.
 */
export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const filter = one("filter") || "all";
  const category = one("category") in ITEM_CATEGORIES ? one("category") : "";
  const q = one("q");
  const mType = (MOVE_TYPES as readonly string[]).includes(one("mtype")) ? one("mtype") : "";
  const mStaff = one("mstaff");
  const mFrom = one("mfrom") ? new Date(`${one("mfrom")}T00:00:00+05:00`) : null;
  const mTo = one("mto") ? new Date(`${one("mto")}T23:59:59+05:00`) : null;

  const moveWhere: Prisma.StockMovementWhereInput = {
    ...(mType ? { type: mType } : {}),
    ...(mStaff ? { staffId: mStaff } : {}),
    ...(mFrom || mTo ? { createdAt: { ...(mFrom ? { gte: mFrom } : {}), ...(mTo ? { lte: mTo } : {}) } } : {}),
    ...(category ? { variant: { product: { type: category } } } : {}),
  };
  const [variants, movements, staff, purchased] = await Promise.all([
    db.variant.findMany({ where: { product: { active: true, ...(category ? { type: category } : {}) } }, include: { product: true }, orderBy: [{ stockQty: "asc" }] }),
    db.stockMovement.findMany({ where: moveWhere, orderBy: { createdAt: "desc" }, take: 60, include: { variant: { include: { product: true } }, staff: true, order: true } }),
    db.staff.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.stockMovement.findMany({ where: { type: "PURCHASE" }, select: { qtyChange: true, unitPrice: true } }),
  ]);

  let list = variants.filter((v) => v.active);
  if (filter === "low") list = list.filter((v) => v.stockQty <= v.lowStockThreshold);
  if (filter === "out") list = list.filter((v) => v.stockQty <= 0);
  // Exact Item Number / barcode / IMEI match first (a scanner "types" the code and presses Enter).
  const exact = q ? list.filter((v) => [v.sku, v.barcode, v.imei, v.partNumber].some((x) => x && x.toLowerCase() === q.toLowerCase())) : [];
  if (q) list = exact.length ? exact : list.filter((v) => `${v.product.name} ${v.sku} ${v.barcode} ${v.imei ?? ""} ${v.partNumber ?? ""} ${v.color ?? ""} ${v.product.compatibleModel ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  const units = variants.reduce((s, v) => s + Math.max(0, v.stockQty), 0);
  const retail = variants.reduce((s, v) => s + Math.max(0, v.stockQty) * (v.salePrice ?? v.price), 0);
  const atCost = variants.reduce((s, v) => s + Math.max(0, v.stockQty) * (v.costPrice ?? 0), 0);
  const investment = purchased.reduce((s, m) => s + m.qtyChange * (m.unitPrice ?? 0), 0);
  /** Current filters with some replaced; an empty value removes that filter. */
  const qs = (extra: Record<string, string>) => {
    const all: Record<string, string> = { filter: filter === "all" ? "" : filter, category, q, ...extra };
    const p = new URLSearchParams(Object.entries(all).filter(([, v]) => v));
    return `/admin/inventory${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageTitle title="Inventory & items" sub="Every purchase, sale and adjustment is logged with the employee, price, reference and time.">
        <AddItemMenu />
      </PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Units in stock" value={units.toLocaleString("en-PK")} />
        <Stat label="Stock at purchase price" value={pkr(atCost)} />
        <Stat label="Retail stock value" value={pkr(retail)} />
        <Stat label="Total investment" value={pkr(investment)} hint="All recorded purchases" />
        <Stat label="Low / out of stock" value={`${variants.filter((v) => v.active && v.stockQty > 0 && v.stockQty <= v.lowStockThreshold).length} / ${variants.filter((v) => v.active && v.stockQty <= 0).length}`} tone="gold" />
      </div>

      <form className="mb-3 flex flex-wrap items-center gap-2">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        {category && <input type="hidden" name="category" value={category} />}
        <input name="q" defaultValue={q} autoFocus placeholder="Type or scan Item Number, barcode or IMEI…" aria-label="Item lookup" className="field !w-full !rounded-full !py-2.5 font-mono sm:!w-96" />
        <button className="btn btn-primary !py-2.5 !text-sm">Find</button>
      </form>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterLink href={qs({ filter: "" })} active={filter === "all"}>All</FilterLink>
        <FilterLink href={qs({ filter: "low" })} active={filter === "low"}>Low stock</FilterLink>
        <FilterLink href={qs({ filter: "out" })} active={filter === "out"}>Out of stock</FilterLink>
        <span className="mx-2 h-5 w-px bg-ink/15" />
        <FilterLink href={qs({ category: "" })} active={!category}>Every category</FilterLink>
        {Object.entries(ITEM_CATEGORIES).map(([k, v]) => <FilterLink key={k} href={qs({ category: k })} active={category === k}>{v}</FilterLink>)}
      </div>
      {q && exact.length === 1 && <p className="mb-3 rounded-xl bg-emerald-600/10 px-4 py-2 text-sm text-emerald-400">Exact match for “{q}”.</p>}

      <Panel>
        <Table head={["Item", "Item No. / barcode", "Cost → price", "On hand", "Purchase (stock in)", "Adjust"]} empty="No items match.">
          {list.map((v) => (
            <tr key={v.id}>
              <Td>
                <Link href={`/admin/products/${v.productId}`} className="font-semibold hover:text-blue">{v.product.name}</Link>
                <span className="block text-xs text-muted">
                  {ITEM_CATEGORIES[v.product.type as keyof typeof ITEM_CATEGORIES]}
                  {v.product.condition === "USED" ? " · used" : ""}
                  {[v.storage, v.color, v.grade && `Grade ${v.grade}`, v.product.compatibleModel && `fits ${v.product.compatibleModel}`].filter(Boolean).map((x) => ` · ${x}`).join("")}
                </span>
              </Td>
              <Td className="font-mono text-xs">{v.sku}<span className="block text-muted">{v.barcode}</span>{v.imei && <span className="block text-muted">IMEI {v.imei}</span>}{v.partNumber && <span className="block text-muted">#{v.partNumber}</span>}</Td>
              <Td className="text-xs">{v.costPrice != null ? pkr(v.costPrice) : "—"} → <b>{pkr(v.salePrice ?? v.price)}</b></Td>
              <Td><Badge tone={v.stockQty <= 0 ? "red" : v.stockQty <= v.lowStockThreshold ? "gold" : "green"}>{v.stockQty}</Badge></Td>
              <Td>
                <ActionForm action={receiveStockAction} resetOnSuccess className="flex gap-1.5">
                  <input type="hidden" name="variantId" value={v.id} />
                  <input name="qty" type="number" min={1} placeholder="Qty" required aria-label="Quantity purchased" className="field !w-16 !py-1.5" />
                  <input name="unitCost" type="number" min={0} placeholder="Cost" defaultValue={v.costPrice ?? ""} aria-label="Purchase price per unit" className="field !w-24 !py-1.5" />
                  <input name="reference" placeholder="Invoice" aria-label="Supplier reference" className="field !w-24 !py-1.5" />
                  <Submit variant="ghost">+ In</Submit>
                </ActionForm>
              </Td>
              <Td>
                <ActionForm action={adjustStockAction} resetOnSuccess className="flex gap-1.5">
                  <input type="hidden" name="variantId" value={v.id} />
                  <input name="qty" type="number" placeholder="±" required aria-label="Quantity change" className="field !w-16 !py-1.5" />
                  <input name="reason" placeholder="Reason" required aria-label="Reason" className="field !w-28 !py-1.5" />
                  <Submit variant="ghost">Save</Submit>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Stock movement log" className="mt-6">
        <form className="mb-4 flex flex-wrap items-end gap-2 text-sm">
          {category && <input type="hidden" name="category" value={category} />}
          <select name="mtype" defaultValue={mType} aria-label="Movement type" className="field !w-auto !py-2">
            <option value="">All movements</option>
            {MOVE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select name="mstaff" defaultValue={mStaff} aria-label="Employee" className="field !w-auto !py-2">
            <option value="">All employees</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" name="mfrom" defaultValue={one("mfrom")} aria-label="From" className="field !w-auto !py-2" />
          <input type="date" name="mto" defaultValue={one("mto")} aria-label="To" className="field !w-auto !py-2" />
          <button className="btn btn-ghost !py-2 !text-sm text-ink">Filter</button>
        </form>
        <Table head={["When", "Item", "Movement", "Price", "After", "By", "Reference / notes"]} empty="No movements match.">
          {movements.map((m) => (
            <tr key={m.id}>
              <Td className="whitespace-nowrap text-xs text-muted">{dt(m.createdAt)}</Td>
              <Td>{m.variant.product.name} <span className="font-mono text-xs text-muted">{m.variant.sku}</span></Td>
              <Td><Badge tone={m.qtyChange > 0 ? "green" : "red"}>{m.type} {m.qtyChange > 0 ? "+" : ""}{m.qtyChange}</Badge></Td>
              <Td className="text-xs">{m.unitPrice != null ? pkr(m.unitPrice) : "—"}</Td>
              <Td>{m.qtyAfter}</Td>
              <Td>{m.staff?.name ?? <span className="text-muted">Online checkout</span>}</Td>
              <Td className="text-xs">{m.order ? <Link href={`/admin/orders/${m.orderId}`} className="text-blue">{m.order.number}</Link> : [m.reference, m.reason].filter(Boolean).join(" · ")}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
