import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";
import { Field, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { updateInstallmentSaleAction } from "../../../../_actions/workflows";

export const metadata = { title: "Installment sale" };

export default async function InstallmentSalePage(props: PageProps<"/admin/installments/sales/[id]">) {
  const me = await requireStaffPage();
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const s = await db.installmentSale.findUnique({ where: { id }, include: { staff: true, customer: true, listing: true } });
  if (!s) notFound();
  return (
    <>
      <PageTitle title={`Installment ${s.ref}`} sub={`${s.phoneModel} · ${s.customerName}`}>
        <Link href="/admin/installments" className="text-sm text-blue">← Installments</Link>
      </PageTitle>
      {created && <p className="mb-6 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Installment sale saved — PB Points added to the customer&apos;s account.</p>}
      <div className="max-w-2xl">
        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold">{s.customerName}</p>
            <p className="text-sm">{s.customerPhone}{s.address ? ` · ${s.address}` : ""}</p>
            {s.cnicNumber && me.role === "SUPER_ADMIN" && <p className="mt-1 font-mono text-sm">CNIC {s.cnicNumber}</p>}
            {s.customer && <Link href={`/admin/customers/${s.customer.id}`} className="mt-2 inline-block text-sm text-blue">Rewards ID {s.customer.passportNo} →</Link>}
          </Panel>
          <Panel title="Phone">
            {s.durationMonths > 0 ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted">Total on plan</dt><dd className="font-semibold">{pkr(s.totalPrice)}</dd></div>
                <div><dt className="text-muted">Down payment</dt><dd className="font-semibold">{pkr(s.downPayment)}</dd></div>
                <div><dt className="text-muted">Monthly</dt><dd className="font-semibold text-gold">{pkr(s.monthlyPayment)}</dd></div>
                <div><dt className="text-muted">Duration</dt><dd className="font-semibold">{s.durationMonths} months</dd></div>
              </dl>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted">Phone retail price</dt><dd className="font-semibold">{pkr(s.phoneValue ?? s.totalPrice)}</dd></div>
                <div><dt className="text-muted">IMEI</dt><dd className="font-mono font-semibold">{s.imei ?? "—"}</dd></div>
              </dl>
            )}
            <p className="mt-3 text-xs text-muted">Created {dt(s.createdAt)} by {s.staff.name}{s.listing ? ` · from listing “${s.listing.model}”` : ""}</p>
          </Panel>
          <Panel title="IMEI & notes">
            <ActionForm action={updateInstallmentSaleAction} className="space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <Field label="IMEI of the phone handed over"><input name="imei" defaultValue={s.imei ?? ""} className="field font-mono" /></Field>
              <Field label="Notes"><textarea name="notes" rows={2} defaultValue={s.notes ?? ""} className="field" /></Field>
              <Submit>Save</Submit>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
