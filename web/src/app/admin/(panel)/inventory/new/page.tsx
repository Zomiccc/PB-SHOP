import Link from "next/link";
import { suggestCodes } from "@/lib/barcode";
import { ACCESSORY_TYPES, ITEM_CATEGORIES, PART_TYPES, PHONE_BRANDS, USED_GRADES } from "@/lib/constants";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { AddItemMenu } from "@/components/admin/AddItemMenu";
import { createItemAction, type ItemCategory } from "../../../_actions/inventory";

export const metadata = { title: "Add item" };

/**
 * Add Item (master brief §10): choose a category, then fill in that category's form.
 * Every item gets its own Item Number (SKU) and barcode; the opening quantity is logged as a purchase.
 */
export default async function AddItemPage(props: PageProps<"/admin/inventory/new">) {
  const sp = await props.searchParams;
  const category = (typeof sp.category === "string" && sp.category in ITEM_CATEGORIES ? sp.category : null) as ItemCategory | null;
  const codes = await suggestCodes();

  return (
    <>
      <PageTitle title={category ? `Add item — ${ITEM_CATEGORIES[category]}` : "Add item"} sub="Each article gets its own Item Number / SKU and barcode. Purchases are logged with your name, the date and time.">
        <AddItemMenu current={category} />
        <Link href="/admin/inventory" className="text-sm text-blue">← Inventory</Link>
      </PageTitle>

      {!category ? (
        <div className="grid max-w-4xl gap-3 sm:grid-cols-2">
          {(Object.entries(ITEM_CATEGORIES) as [ItemCategory, string][]).map(([k, v]) => (
            <Link key={k} href={`/admin/inventory/new?category=${k}`} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-ink/10 transition hover:ring-gold">
              <p className="text-lg font-semibold">{v}</p>
              <p className="mt-1 text-sm text-muted">
                {k === "PHONE" && "Company, model, storage, colour, IMEI, grade, prices, photos, 3D."}
                {k === "TABLET" && "Brand, model, storage, RAM, colour, IMEI, grade, prices, photos."}
                {k === "PART" && "Part name/type, compatible model, part number, quantity, prices."}
                {k === "ACCESSORY" && "Article name, article number, number purchased, prices."}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <ActionForm action={createItemAction} className="max-w-4xl space-y-6">
          <input type="hidden" name="category" value={category} />
          {(category === "PHONE" || category === "TABLET") && <DeviceFields tablet={category === "TABLET"} />}
          {category === "PART" && <PartFields />}
          {category === "ACCESSORY" && <AccessoryFields />}

          <Panel title="Item Number, prices & stock">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Item Number / SKU" hint="Keep the suggested number or type your own"><input name="sku" defaultValue={codes.sku} className="field font-mono" /></Field>
              <Field label="Barcode" hint="Scan the maker's EAN, or keep ours"><input name="barcode" defaultValue={codes.barcode} className="field font-mono" /></Field>
              <Field label="Supplier / invoice ref (optional)"><input name="reference" className="field" /></Field>
              <Field label="Purchase price (Rs, per unit)"><input name="costPrice" type="number" min={0} required className="field" /></Field>
              <Field label="Sale price (Rs)"><input name="salePrice" type="number" min={1} required className="field" /></Field>
              <Field label={category === "ACCESSORY" ? "Number purchased" : "Quantity"} hint={category === "PHONE" || category === "TABLET" ? "Used devices / IMEI items are always 1" : undefined}>
                <input name="quantity" type="number" min={0} defaultValue={1} className="field" />
              </Field>
              <Field label="Low-stock alert at"><input name="lowStockThreshold" type="number" min={0} placeholder="auto" className="field" /></Field>
            </div>
          </Panel>

          <Panel title="Photos & notes">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product photos (optional)"><input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple className="text-sm" /></Field>
              <Field label={category === "ACCESSORY" ? "Relevant information" : "Description"}><textarea name="description" rows={2} className="field" /></Field>
            </div>
            {(category === "PHONE" || category === "TABLET") && (
              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" name="needs3d" className="mt-0.5 h-4 w-4" />
                <span>This product needs a 3D model — next, upload exactly six views (front, back, left, right, top, bottom).</span>
              </label>
            )}
            <div className="mt-5"><Submit variant="gold">Save item</Submit></div>
          </Panel>
        </ActionForm>
      )}
    </>
  );
}

function DeviceFields({ tablet }: { tablet: boolean }) {
  return (
    <Panel title={tablet ? "Tablet" : "Phone"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Company / brand">
          <input name="brand" list="brands" required className="field" />
          <datalist id="brands">{PHONE_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field label="Model" className="sm:col-span-2"><input name="name" required placeholder={tablet ? "iPad Air 11-inch (M2)" : "iPhone 16 Pro"} className="field" /></Field>
        <Field label="Condition">
          <select name="condition" defaultValue="NEW" className="field"><option value="NEW">New</option><option value="USED">Used</option></select>
        </Field>
        <Field label="Grade (used only — exactly one)">
          <select name="grade" defaultValue="" className="field">
            <option value="">— New device —</option>
            {Object.keys(USED_GRADES).map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Battery health % (used)"><input name="batteryHealth" type="number" min={0} max={100} className="field" /></Field>
        <Field label="Storage"><input name="storage" placeholder="128GB" className="field" /></Field>
        {tablet && <Field label="RAM"><input name="ram" placeholder="8GB" className="field" /></Field>}
        <Field label="Colour"><input name="color" className="field" /></Field>
        <Field label="IMEI / serial" hint="Required for used devices; one IMEI = one SKU"><input name="imei" inputMode="numeric" className="field font-mono" /></Field>
        <Field label="Condition notes" className="sm:col-span-3"><input name="notes" className="field" /></Field>
      </div>
    </Panel>
  );
}

function PartFields() {
  return (
    <Panel title="Phone spare part">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Part name" className="sm:col-span-2"><input name="name" required placeholder="iPhone 13 OLED screen assembly" className="field" /></Field>
        <Field label="Part type">
          <select name="partType" defaultValue="SCREEN" className="field">{Object.entries(PART_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="Compatible model(s)"><input name="compatibleModel" placeholder="iPhone 13 / 13 Pro" className="field" /></Field>
        <Field label="Part number (optional)"><input name="partNumber" className="field font-mono" /></Field>
        <Field label="Brand / supplier"><input name="brand" placeholder="Generic" className="field" /></Field>
      </div>
    </Panel>
  );
}

function AccessoryFields() {
  return (
    <Panel title="Accessory">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Article / item name" className="sm:col-span-2"><input name="name" required placeholder="20W USB-C charger" className="field" /></Field>
        <Field label="Category">
          <select name="accessoryType" defaultValue="CASE" className="field">{Object.entries(ACCESSORY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="Article number"><input name="partNumber" className="field font-mono" /></Field>
        <Field label="Brand"><input name="brand" required className="field" /></Field>
        <Field label="Colour (optional)"><input name="color" className="field" /></Field>
      </div>
    </Panel>
  );
}
