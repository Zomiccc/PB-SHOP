import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { monthlyPayment } from "@/lib/installments";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { ACCEPT, FileField } from "@/components/ui/FileField";
import { createInstallmentSaleAction } from "../../../../_actions/workflows";

export const metadata = { title: "New installment sale" };

/** In-store workflow for a new phone bought on installments (master brief §5). CNIC front + back required. */
export default async function NewInstallmentSalePage() {
  const listings = await db.installmentListing.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageTitle title="New installment sale" sub="Completed in store only. Check the customer's original CNIC and upload both sides.">
        <Link href="/admin/installments" className="text-sm text-blue">← Installments</Link>
      </PageTitle>
      <ActionForm action={createInstallmentSaleAction} className="grid max-w-5xl gap-6 xl:grid-cols-2">
        <Panel title="1. Customer">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name (as on CNIC)"><input name="customerName" required autoComplete="off" className="field" /></Field>
            <Field label="Mobile number"><input name="customerPhone" type="tel" required placeholder="0300 1234567" className="field" /></Field>
            <Field label="CNIC number"><input name="cnicNumber" required inputMode="numeric" placeholder="35202-1234567-1" className="field font-mono" /></Field>
            <Field label="Address (optional)"><input name="address" className="field" /></Field>
          </div>
        </Panel>
        <Panel title="2. Phone & plan">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plan from homepage listing" className="sm:col-span-2" hint="Fills the plan below; you can still edit the figures">
              <select name="listingId" defaultValue="" className="field">
                <option value="">— Custom plan —</option>
                {listings.map((l) => <option key={l.id} value={l.id}>{l.model} · {pkr(l.downPayment)} down + {pkr(monthlyPayment(l))} × {l.durationMonths}</option>)}
              </select>
            </Field>
            <Field label="Phone model (if custom)"><input name="phoneModel" className="field" /></Field>
            <Field label="IMEI (optional now)"><input name="imei" inputMode="numeric" className="field font-mono" /></Field>
            <Field label="Total on plan (Rs)" hint="Leave blank to use the listing"><input name="totalPrice" type="number" min={1} className="field" /></Field>
            <Field label="Down payment (Rs)"><input name="downPayment" type="number" min={0} className="field" /></Field>
            <Field label="Duration (months)"><input name="durationMonths" type="number" min={1} max={60} className="field" /></Field>
          </div>
        </Panel>
        <Panel title="3. ID documents (required)" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            <FileField name="cnicFront" label="ID Card — Front" required accept={ACCEPT.id} hint="Photo or PDF · compressed automatically" capture tone="panel" />
            <FileField name="cnicBack" label="ID Card — Back" required accept={ACCEPT.id} hint="Photo or PDF · compressed automatically" capture tone="panel" />
            <FileField name="attachments" label="Other documents / attachments" multiple maxFiles={5} accept={ACCEPT.docs} hint="Guarantor CNIC, salary slip, utility bill…" tone="panel" />
          </div>
          <p className="mt-3 text-xs text-muted">ID documents are stored privately. Only signed-in staff can open them, and every view is recorded in the audit log.</p>
        </Panel>
        <Panel className="xl:col-span-2">
          <Field label="Notes (optional)"><textarea name="notes" rows={2} className="field" /></Field>
          <div className="mt-4"><Submit variant="gold">Save installment sale</Submit></div>
        </Panel>
      </ActionForm>
    </>
  );
}
