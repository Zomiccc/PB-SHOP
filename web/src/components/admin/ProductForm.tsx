import type { Product } from "@prisma/client";
import { ACCESSORY_TYPES, PHONE_BRANDS } from "@/lib/constants";
import { parseJson } from "@/lib/format";
import { saveProductAction } from "@/app/admin/_actions/products";
import { ActionForm, Submit } from "./ui";
import { Field } from "./Primitives";

export function ProductForm({ product }: { product?: Product }) {
  const specs = Object.entries(parseJson<Record<string, string>>(product?.specs, {}))
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return (
    <ActionForm action={saveProductAction} className="space-y-5">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Product name"><input name="name" defaultValue={product?.name} required className="field" /></Field>
        <Field label="Brand">
          <input name="brand" defaultValue={product?.brand} list="brands" required className="field" />
          <datalist id="brands">{PHONE_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <Field label="Type">
          <select name="type" defaultValue={product?.type ?? "PHONE"} className="field">
            <option value="PHONE">Phone</option>
            <option value="ACCESSORY">Accessory</option>
          </select>
        </Field>
        <Field label="Condition (phones)" hint="New and used are separate catalogues with separate fields.">
          <select name="condition" defaultValue={product?.condition ?? "NEW"} className="field">
            <option value="NEW">New</option>
            <option value="USED">Used</option>
          </select>
        </Field>
        <Field label="Accessory category">
          <select name="accessoryType" defaultValue={product?.accessoryType ?? "OTHER"} className="field">
            {Object.entries(ACCESSORY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Finish colour (3D tint)" hint="Hex, e.g. #1c3552 — used when no 3D model is attached">
          <input name="finishHex" defaultValue={product?.finishHex ?? ""} placeholder="#1c3552" className="field" />
        </Field>
      </div>
      <Field label="Description"><textarea name="description" defaultValue={product?.description} rows={3} className="field" /></Field>
      <Field label="Specifications" hint="One per line — Label: value">
        <textarea name="specs" defaultValue={specs} rows={5} placeholder={"Display: 6.1\" OLED\nChip: A18"} className="field font-mono text-sm" />
      </Field>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4" /> Featured on home page</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="careCardEligible" defaultChecked={product?.careCardEligible ?? true} className="h-4 w-4" /> Issues a PB Care Card</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="loyaltyEligible" defaultChecked={product?.loyaltyEligible ?? true} className="h-4 w-4" /> Earns Passport points</label>
      </div>
      <details className="rounded-xl bg-cream p-4">
        <summary className="cursor-pointer text-sm font-semibold">SEO &amp; Sketchfab</summary>
        <div className="mt-4 grid gap-4">
          <Field label="Meta title" hint="Shown in Google results; defaults to the product name"><input name="metaTitle" defaultValue={product?.metaTitle ?? ""} maxLength={70} className="field" /></Field>
          <Field label="Meta description"><textarea name="metaDescription" defaultValue={product?.metaDescription ?? ""} rows={2} maxLength={170} className="field" /></Field>
          <Field label="Sketchfab model UID (optional)" hint="Only for models whose licence permits commercial embedding"><input name="sketchfabUid" defaultValue={product?.sketchfabUid ?? ""} className="field" /></Field>
        </div>
      </details>
      <Submit variant="red">{product ? "Save product" : "Create product"}</Submit>
    </ActionForm>
  );
}
