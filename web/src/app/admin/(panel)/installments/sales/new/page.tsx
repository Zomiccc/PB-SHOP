import Link from "next/link";
import { DeskTabs } from "@/components/admin/DeskTabs";
import { db } from "@/lib/db";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { InstallmentSaleFields } from "@/components/admin/InstallmentSaleFields";
import { createInstallmentSaleAction } from "../../../../_actions/workflows";

export const metadata = { title: "New installment sale" };

/**
 * Installment sale, short form (Nov 2026): the financing company keeps the customer's full details and CNIC in
 * its own app, so the shop records name, mobile, CNIC, phone model, retail price and IMEI
 * (Part 2: picking a model or scanning the IMEI fills in the price). PB Points are given
 * straight away on the retail price, by the same new-phone rule as a cash sale.
 */
export default async function NewInstallmentSalePage() {
  const [listings, phones] = await Promise.all([
    db.installmentListing.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { model: true, regularPrice: true } }),
    db.variant.findMany({ where: { active: true, product: { type: "PHONE", condition: "NEW", active: true } }, select: { storage: true, ram: true, price: true, salePrice: true, product: { select: { name: true } } } }),
  ]);
  // The installment list first, then every new phone in the shop at its new-phone price.
  const models = [...listings.map((l) => ({ model: l.model, price: l.regularPrice })), ...phones.map((v) => ({ model: [v.product.name, [v.ram, v.storage].filter(Boolean).join(" / ")].filter(Boolean).join(" · "), price: v.salePrice ?? v.price }))]
    .filter((m, i, all) => all.findIndex((x) => x.model === m.model) === i);
  return (
    <>
      <DeskTabs tabs={[{ href: "/admin/installments/sales/new", label: "New installment sale" }, { href: "/admin/installments", label: "Records" }]} active={0} />
      <PageTitle title="New installment sale" sub="Just the basics — the financing company keeps the customer's full details in its own app.">
        <Link href="/admin/installments" className="text-sm text-blue">← Installments</Link>
      </PageTitle>
      <ActionForm action={createInstallmentSaleAction} className="max-w-xl">
        <Panel>
          <div className="grid gap-4">
            <Field label="Full name"><input name="customerName" required autoComplete="off" className="field !py-3.5 text-base" /></Field>
            <Field label="Mobile number"><input name="customerPhone" type="tel" inputMode="tel" required placeholder="0300 1234567" className="field !py-3.5 text-base" /></Field>
            <Field label="CNIC number" hint="13 digits — only the owner can see it later"><input name="cnicNumber" inputMode="numeric" autoComplete="off" placeholder="35202-1234567-1" className="field !py-3.5 font-mono text-base" /></Field>
            <InstallmentSaleFields models={models} />
          </div>
          <div className="mt-6"><Submit variant="gold">Save installment sale</Submit></div>
        </Panel>
      </ActionForm>
    </>
  );
}
