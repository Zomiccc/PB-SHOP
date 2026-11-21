import { ImeiInput } from "@/components/admin/ImeiInput";
import Link from "next/link";
import { suggestCodes } from "@/lib/barcode";
import { requireStaffPage } from "@/lib/staff";
import { accessoryCategories } from "@/lib/categories";
import { ITEM_CATEGORIES, PART_TYPES, PHONE_BRANDS, USED_GRADES, USED_WARRANTY_OPTIONS } from "@/lib/constants";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { AddItemMenu } from "@/components/admin/AddItemMenu";
import { CategorySelect } from "@/components/admin/CategorySelect";
import { SidePhotoInputs } from "@/components/admin/SidePhotoInputs";
import { Icon } from "@/components/ui/Icon";
import { createItemAction, type ItemCategory } from "../../../_actions/inventory";

export const metadata = { title: "Add item" };

/** The three everyday forms (Nov 2026) and the other item types. */
const ADD_CHOICES = [
  { href: "/admin/inventory/new?category=ACCESSORY", title: "Accessories", sub: "Name, category, brand, quantity, prices.", icon: "bolt" },
  { href: "/admin/inventory/new?category=PHONE&condition=NEW", title: "New phone", sub: "Brand, model, storage, colour, quantity, prices.", icon: "phone" },
  { href: "/admin/inventory/new?category=PHONE&condition=USED", title: "Used phone", sub: "One device: IMEI, grade, battery, warranty, six photos, prices.", icon: "rotate" },
];

/**
 * Add Item (master brief §10; simplified Nov 2026): Accessories, New phone and Used phone each open a short form
 * with only the fields they need. Item Number / SKU and barcode are generated (editable under "More"). The
 * opening quantity is logged as a purchase with the employee and time.
 */
export default async function AddItemPage(props: PageProps<"/admin/inventory/new">) {
  const staff = await requireStaffPage();
  const owner = staff.role === "SUPER_ADMIN";
  const sp = await props.searchParams;
  const category = (typeof sp.category === "string" && sp.category in ITEM_CATEGORIES ? sp.category : null) as ItemCategory | null;
  const condition = category === "PHONE" && (sp.condition === "NEW" || sp.condition === "USED") ? sp.condition : null;
  const used = condition === "USED";
  const [codes, categories] = await Promise.all([suggestCodes(), accessoryCategories()]);
  const title = category === "ACCESSORY" ? "Accessory" : condition === "NEW" ? "New phone" : used ? "Used phone" : category ? ITEM_CATEGORIES[category] : null;

  return (
    <>
      <PageTitle title={title ? `Add — ${title}` : "Add product"} sub="Short forms with only what each item needs. Purchases are logged with your name, the date and time.">
        <AddItemMenu current={category} />
        <Link href="/admin/products" className="text-sm text-blue">← Products</Link>
      </PageTitle>

      {!category ? (
        <div className="max-w-4xl space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {ADD_CHOICES.map((c) => (
              <Link key={c.href} href={c.href} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-ink/10 transition hover:ring-gold">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold/15 text-gold"><Icon name={c.icon} className="h-6 w-6" /></span>
                <p className="mt-3 text-lg font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted">{c.sub}</p>
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted">
            Other items: <Link href="/admin/inventory/new?category=TABLET" className="text-blue">Tablet</Link> · <Link href="/admin/inventory/new?category=PART" className="text-blue">Phone spare part</Link>
          </p>
        </div>
      ) : (
        <ActionForm action={createItemAction} className="max-w-3xl space-y-6">
          <input type="hidden" name="category" value={category} />
          {condition && <input type="hidden" name="condition" value={condition} />}
          {category === "ACCESSORY" && <AccessoryFields categories={categories} />}
          {category === "PHONE" && condition && <PhoneFields used={used} />}
          {(category === "TABLET" || (category === "PHONE" && !condition)) && <DeviceFields tablet={category === "TABLET"} />}
          {category === "PART" && <PartFields />}

          {used && (
            <Panel title="Photos — all six sides">
              <SidePhotoInputs />
              <p className="mt-3 text-xs text-muted">Front, back, left, right, top and bottom. Customers see these on the phone&apos;s page.</p>
            </Panel>
          )}

          <Panel title="Prices & stock">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Sale price (Rs)" hint="Normal selling price"><input name="salePrice" type="number" inputMode="numeric" min={1} required className="field" /></Field>
              <Field label="Offer / discount price (Rs)" hint="Lowest a salesman can give"><input name="floorPrice" type="number" inputMode="numeric" min={1} placeholder="Same as sale price" className="field" /></Field>
              {owner && <Field label="Purchase price (Rs) — owner only" hint="Our cost, per unit"><input name="costPrice" type="number" inputMode="numeric" min={0} className="field" /></Field>}
              {!used && (
                <Field label={category === "ACCESSORY" ? "Number purchased" : "Quantity"}>
                  <input name="quantity" type="number" inputMode="numeric" min={0} defaultValue={1} className="field" />
                </Field>
              )}
            </div>
            <details className="mt-4 rounded-xl bg-cream/40 p-3">
              <summary className="cursor-pointer text-sm font-semibold">More — Item Number, barcode, supplier</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Item Number / SKU" hint="Generated — or type your own"><input name="sku" defaultValue={codes.sku} className="field font-mono" /></Field>
                <Field label="Barcode" hint="Scan the maker's EAN, or keep ours"><input name="barcode" defaultValue={codes.barcode} className="field font-mono" /></Field>
                <Field label="Supplier / invoice ref"><input name="reference" className="field" /></Field>
                {!used && <Field label="Low-stock alert at"><input name="lowStockThreshold" type="number" min={0} placeholder="auto" className="field" /></Field>}
              </div>
            </details>
          </Panel>

          {!used && (
            <Panel title="Photos & notes (optional)">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Product photos"><input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple className="text-sm" /></Field>
                <Field label={category === "ACCESSORY" ? "Relevant information" : "Description"}><textarea name="description" rows={2} className="field" /></Field>
              </div>
            </Panel>
          )}
          <Submit variant="gold" className="w-full !py-4 !text-base sm:w-auto">Save</Submit>
        </ActionForm>
      )}
    </>
  );
}

function Brand() {
  return (
    <Field label="Brand">
      <input name="brand" list="brands" required className="field" />
      <datalist id="brands">{PHONE_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
    </Field>
  );
}

/** New phone / used phone — the short forms. */
function PhoneFields({ used }: { used: boolean }) {
  return (
    <Panel title={used ? "Used phone" : "New phone"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Brand />
        <Field label="Model" className="sm:col-span-2"><input name="name" required placeholder="Infinix NOTE 60" className="field" /></Field>
        <Field label="Storage"><input name="storage" placeholder="256GB" className="field" /></Field>
        <Field label="RAM"><input name="ram" placeholder="8GB" className="field" /></Field>
        <Field label="Colour"><input name="color" className="field" /></Field>
        {!used && <Field label="IMEI (optional)" hint="Scan the barcode on the box — one phone is recorded in stock" className="sm:col-span-3"><ImeiInput /></Field>}
        {used && (
          <>
            <Field label="IMEI" hint="Dial *#06#, or scan the box"><ImeiInput required /></Field>
            <Field label="Grade">
              <select name="grade" required defaultValue="" className="field">
                <option value="" disabled>Choose</option>
                {Object.keys(USED_GRADES).map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Battery health %"><input name="batteryHealth" type="number" inputMode="numeric" min={0} max={100} className="field" /></Field>
            <Field label="Warranty">
              <select name="warrantyInfo" className="field">{USED_WARRANTY_OPTIONS.map((w) => <option key={w}>{w}</option>)}</select>
            </Field>
            <Field label="Condition notes" className="sm:col-span-2"><input name="notes" placeholder="Small scratch on the back…" className="field" /></Field>
          </>
        )}
      </div>
    </Panel>
  );
}

function DeviceFields({ tablet }: { tablet: boolean }) {
  return (
    <Panel title={tablet ? "Tablet" : "Phone"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Brand />
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
        <Field label="RAM"><input name="ram" placeholder="8GB" className="field" /></Field>
        <Field label="Colour"><input name="color" className="field" /></Field>
        <Field label="IMEI / serial" hint="Required for used devices; one IMEI = one SKU"><input name="imei" inputMode="numeric" className="field font-mono" /></Field>
        <Field label="Condition notes" className="sm:col-span-2"><input name="notes" className="field" /></Field>
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

function AccessoryFields({ categories }: { categories: { key: string; label: string }[] }) {
  return (
    <Panel title="Accessory">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" className="sm:col-span-2"><input name="name" required placeholder="20W USB-C charger" className="field" /></Field>
        <Field label="Category"><CategorySelect name="accessoryType" options={categories} defaultValue="CASE" /></Field>
        <Field label="Brand"><input name="brand" required className="field" /></Field>
        <Field label="Colour (optional)"><input name="color" className="field" /></Field>
        <Field label="Article number (optional)"><input name="partNumber" className="field font-mono" /></Field>
      </div>
    </Panel>
  );
}
