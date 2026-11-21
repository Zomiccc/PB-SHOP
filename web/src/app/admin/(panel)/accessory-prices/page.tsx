import { db } from "@/lib/db";
import { accessoryLabel } from "@/lib/constants";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { AccessoryPriceList, type AccessoryRow } from "@/components/admin/AccessoryPriceList";
import { bulkPriceAction } from "../../_actions/prices";

export const metadata = { title: "Accessory prices & offers" };

/**
 * Accessory prices & offers (client request, Nov 2026): filter the accessories, tick the ones to change, then raise or
 * lower their price (by % or Rs) or add / remove a % off offer — all in one go. Every change is in the audit log.
 */
export default async function AccessoryPricesPage() {
  const variants = await db.variant.findMany({ where: { active: true, product: { type: "ACCESSORY", active: true } }, include: { product: { select: { name: true, brand: true, accessoryType: true } } }, orderBy: [{ product: { name: "asc" } }] });
  const rows: AccessoryRow[] = variants.map((v) => ({ id: v.id, name: `${v.product.name}${v.color ? ` · ${v.color}` : ""}`, sku: v.sku, brand: v.product.brand, category: v.product.accessoryType ?? "OTHER", categoryLabel: accessoryLabel(v.product.accessoryType), price: v.price, salePrice: v.salePrice }));

  return (
    <>
      <PageTitle title="Accessory prices & offers" sub="Tick the items, choose the change, apply. Percentages round to the nearest Rs 10. Offers show on the website with the normal price crossed out." />
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
        <AccessoryPriceList rows={rows} />
      </ActionForm>
    </>
  );
}
