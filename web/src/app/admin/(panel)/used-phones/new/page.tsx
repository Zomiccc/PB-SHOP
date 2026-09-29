import Link from "next/link";
import { PHONE_BRANDS, USED_GRADES } from "@/lib/constants";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { ACCEPT, FileField } from "@/components/ui/FileField";
import { ID_CONSENT_TEXT, IdPrivacyNotice } from "@/components/IdPrivacyNotice";
import { createUsedPurchaseAction } from "../../../_actions/workflows";

export const metadata = { title: "Buy a used phone" };

/** Workflow for a person selling their used phone to PB Mobiles (master brief §6). */
export default function NewUsedPurchasePage() {
  return (
    <>
      <PageTitle title="Buy a used phone" sub="Check the seller's original CNIC, test the phone, and record exactly one grade.">
        <Link href="/admin/used-phones" className="text-sm text-blue">← Used-phone buying</Link>
      </PageTitle>
      <ActionForm action={createUsedPurchaseAction} className="grid max-w-5xl gap-6 xl:grid-cols-2">
        <Panel title="1. Seller">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name (as on CNIC)"><input name="sellerName" required autoComplete="off" className="field" /></Field>
            <Field label="Mobile number"><input name="sellerPhone" type="tel" required placeholder="0300 1234567" className="field" /></Field>
            <Field label="CNIC number"><input name="sellerCnic" required inputMode="numeric" placeholder="35202-1234567-1" className="field font-mono" /></Field>
            <Field label="Address (optional)"><input name="sellerAddress" className="field" /></Field>
          </div>
        </Panel>
        <Panel title="2. Phone">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Brand">
              <input name="brand" list="brands" required className="field" />
              <datalist id="brands">{PHONE_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="Model"><input name="model" required placeholder="iPhone 13 / Galaxy S23" className="field" /></Field>
            <Field label="IMEI / serial" hint="Dial *#06#"><input name="imei" required inputMode="numeric" className="field font-mono" /></Field>
            <Field label="Grade (exactly one)">
              <select name="grade" required defaultValue="" className="field">
                <option value="">Choose grade</option>
                {Object.entries(USED_GRADES).map(([g, d]) => <option key={g} value={g}>{g} — {d}</option>)}
              </select>
            </Field>
            <Field label="Storage"><input name="storage" placeholder="128GB" className="field" /></Field>
            <Field label="Colour"><input name="color" className="field" /></Field>
            <Field label="Battery health %"><input name="batteryHealth" type="number" min={0} max={100} className="field" /></Field>
            <Field label="Agreed purchase price (Rs)"><input name="agreedPrice" type="number" min={1} required className="field" /></Field>
          </div>
        </Panel>
        <Panel title="3. ID documents (required)" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            <FileField name="cnicFront" label="ID Card — Front" required accept={ACCEPT.id} capture tone="panel" hint="Photo or PDF · compressed automatically" />
            <FileField name="cnicBack" label="ID Card — Back" required accept={ACCEPT.id} capture tone="panel" hint="Photo or PDF · compressed automatically" />
            <FileField name="attachments" label="Other documents / attachments" multiple maxFiles={5} accept={ACCEPT.docs} tone="panel" hint="Purchase receipt, box photo, PTA proof…" />
          </div>
          <p className="mt-3 text-xs text-muted">Stored privately; only signed-in staff can open ID documents and every view is audited.</p>
          <div className="mt-5"><IdPrivacyNotice tone="panel" /></div>
          <label className="mt-4 flex items-start gap-3 rounded-xl bg-gold/10 p-3 text-sm ring-1 ring-gold/40">
            <input type="checkbox" name="idConsent" required className="mt-0.5 h-4 w-4 shrink-0" />
            <span><b>The seller agrees:</b> “{ID_CONSENT_TEXT}”</span>
          </label>

        </Panel>
        <Panel title="4. Resale" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-[auto_200px_1fr] sm:items-end">
            <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="addToStock" defaultChecked className="h-4 w-4" /> Add to stock as a used SKU</label>
            <Field label="Resale price (Rs)"><input name="salePrice" type="number" min={1} className="field" /></Field>
            <Field label="Staff notes"><input name="notes" placeholder="Condition checks, accessories included…" className="field" /></Field>
          </div>
          <p className="mt-2 text-xs text-muted">Adding to stock creates one SKU for this exact device (IMEI, single grade, purchase price) and a purchase movement in the inventory log.</p>
          <div className="mt-4"><Submit variant="gold">Save purchase</Submit></div>
        </Panel>
      </ActionForm>
    </>
  );
}
