import Link from "next/link";
import { db } from "@/lib/db";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { createInstallmentSaleAction } from "../../../../_actions/workflows";

export const metadata = { title: "New installment sale" };

/**
 * Installment sale, short form (Nov 2026): the financing company keeps the customer's full details and CNIC in
 * its own app, so the shop only records name, mobile, phone model, retail price and IMEI. PB Points are given
 * straight away on the retail price, by the same new-phone rule as a cash sale.
 */
export default async function NewInstallmentSalePage() {
  const listings = await db.installmentListing.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, model: true, regularPrice: true } });
  return (
    <>
      <PageTitle title="New installment sale" sub="Just the basics — the financing company keeps the customer's full details in its own app.">
        <Link href="/admin/installments" className="text-sm text-blue">← Installments</Link>
      </PageTitle>
      <ActionForm action={createInstallmentSaleAction} className="max-w-xl">
        <Panel>
          <div className="grid gap-4">
            <Field label="Full name"><input name="customerName" required autoComplete="off" className="field !py-3.5 text-base" /></Field>
            <Field label="Mobile number"><input name="customerPhone" type="tel" inputMode="tel" required placeholder="0300 1234567" className="field !py-3.5 text-base" /></Field>
            <Field label="Phone model" hint="Start typing to pick a phone from the installment list">
              <input name="phoneModel" list="installment-models" required autoComplete="off" placeholder="Infinix NOTE 60 · 8GB / 256GB" className="field !py-3.5 text-base" />
              <datalist id="installment-models">{listings.map((l) => <option key={l.id} value={l.model} />)}</datalist>
            </Field>
            <Field label="Phone retail price (Rs)" hint="Blank = the price from the installment list"><input name="phoneValue" type="number" inputMode="numeric" min={1} className="field !py-3.5 text-base" /></Field>
            <Field label="IMEI"><input name="imei" inputMode="numeric" autoComplete="off" className="field !py-3.5 font-mono text-base" /></Field>
          </div>
          <div className="mt-6"><Submit variant="gold">Save installment sale</Submit></div>
        </Panel>
      </ActionForm>
    </>
  );
}
