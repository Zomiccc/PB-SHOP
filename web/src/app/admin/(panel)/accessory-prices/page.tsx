import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { accessoryLabel } from "@/lib/constants";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { SelectAll } from "@/components/admin/SelectAll";
import { bulkPriceAction } from "../../_actions/prices";

export const metadata = { title: "Accessory prices & offers" };

/**
 * Accessory prices & offers (client request, Nov 2026): filter the accessories, tick the ones to change, then raise or
 * lower their price (by % or Rs) or add / remove a % off offer — all in one go. Every change is in the audit log.
 */
export default async function AccessoryPricesPage(props: PageProps<"/admin/accessory-prices">) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const [q, cat, brand] = [one("q").toLowerCase(), one("category"), one("brand")];
  const variants = await db.variant.findMany({ where: { active: true, product: { type: "ACCESSORY", active: true } }, include: { product: { select: { name: true, brand: true, accessoryType: true } } }, orderBy: [{ product: { name: "asc" } }] });
  const categories = [...new Set(variants.map((v) => v.product.accessoryType ?? "OTHER"))].sort((a, b) => accessoryLabel(a).localeCompare(accessoryLabel(b)));
  const brands = [...new Set(variants.map((v) => v.product.brand))].sort();
  const list = variants.filter((v) => (!cat || (v.product.accessoryType ?? "OTHER") === cat) && (!brand || v.product.brand === brand) && (!q || `${v.product.name} ${v.sku} ${v.color ?? ""}`.toLowerCase().includes(q)));

  return (
    <>
      <PageTitle title="Accessory prices & offers" sub="Tick the items, choose the change, apply. Percentages round to the nearest Rs 10. Offers show on the website with the normal price crossed out." />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={one("q")} placeholder="Search name or SKU…" className="field !w-56 !py-2" />
        <select name="category" defaultValue={cat} className="field !w-auto !py-2">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{accessoryLabel(c)}</option>)}
        </select>
        <select name="brand" defaultValue={brand} className="field !w-auto !py-2">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <button className="btn btn-ghost !py-2 !text-sm text-ink"><span>Filter</span></button>
      </form>

      <ActionForm action={bulkPriceAction} className="space-y-4">
        <Panel>
          <div className="grid items-end gap-3 sm:grid-cols-[1.3fr_0.8fr_auto]">
            <Field label="Change">
              <select name="change" className="field !py-3">
                <option value="UP_PCT">Increase price by %</option>
                <option value="DOWN_PCT">Decrease price by %</option>
                <option value="UP_RS">Increase price by Rs</option>
                <option value="DOWN_RS">Decrease price by Rs</option>
                <option value="OFFER_PCT">Add / change offer: % off</option>
                <option value="OFFER_OFF">Remove offer</option>
              </select>
            </Field>
            <Field label="Amount (% or Rs)"><input name="value" type="number" inputMode="decimal" min={0} step="0.5" placeholder="10" className="field !py-3" /></Field>
            <Submit variant="gold" className="!py-3.5">Apply to ticked items</Submit>
          </div>
        </Panel>
        <Panel title={`${list.length} accessor${list.length === 1 ? "y" : "ies"}`} action={<SelectAll name="ids" />}>
          {list.length === 0 ? (
            <p className="text-sm text-muted">No accessories match.</p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {list.map((v) => {
                const pct = v.salePrice != null ? Math.round((1 - v.salePrice / v.price) * 100) : 0;
                return (
                  <li key={v.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-3">
                      <input type="checkbox" name="ids" value={v.id} className="h-5 w-5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-snug">{v.product.name}{v.color ? ` · ${v.color}` : ""}</span>
                        <span className="block text-xs text-muted">{accessoryLabel(v.product.accessoryType)} · {v.product.brand} · <span className="font-mono">{v.sku}</span></span>
                      </span>
                      <span className="shrink-0 text-right text-sm">
                        {v.salePrice != null ? (
                          <>
                            <b className="text-gold">{pkr(v.salePrice)}</b> <span className="text-xs text-muted line-through">{pkr(v.price)}</span>
                            <span className="block text-xs font-semibold text-emerald-400">{pct}% off</span>
                          </>
                        ) : (
                          <b>{pkr(v.price)}</b>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </ActionForm>
    </>
  );
}
