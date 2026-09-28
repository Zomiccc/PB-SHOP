import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";
import { Badge, Field, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { Attachments } from "@/components/admin/Attachments";
import { updateInstallmentSaleAction } from "../../../../_actions/workflows";

export const metadata = { title: "Installment sale" };

export default async function InstallmentSalePage(props: PageProps<"/admin/installments/sales/[id]">) {
  const me = await requireStaffPage();
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const s = await db.installmentSale.findUnique({ where: { id }, include: { staff: true, customer: true, listing: true, attachments: { orderBy: { createdAt: "asc" }, include: { uploadedBy: true } } } });
  if (!s) notFound();
  const hasFront = s.attachments.some((a) => a.kind === "CNIC_FRONT");
  const hasBack = s.attachments.some((a) => a.kind === "CNIC_BACK");
  return (
    <>
      <PageTitle title={`Installment ${s.ref}`} sub={`${s.phoneModel} · ${s.customerName}`}>
        <Link href="/admin/installments" className="text-sm text-blue">← Installments</Link>
      </PageTitle>
      {created && <p className="mb-6 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Installment sale saved with the customer&apos;s ID documents.</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold">{s.customerName}</p>
            <p className="text-sm">{s.customerPhone}{s.address ? ` · ${s.address}` : ""}</p>
            <p className="mt-1 font-mono text-sm">CNIC {s.cnicNumber}</p>
            {s.customer && <Link href={`/admin/customers/${s.customer.id}`} className="mt-2 inline-block text-sm text-blue">Passport {s.customer.passportNo} →</Link>}
          </Panel>
          <Panel title="Plan">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">Total on plan</dt><dd className="font-semibold">{pkr(s.totalPrice)}</dd></div>
              <div><dt className="text-muted">Down payment</dt><dd className="font-semibold">{pkr(s.downPayment)}</dd></div>
              <div><dt className="text-muted">Monthly</dt><dd className="font-semibold text-gold">{pkr(s.monthlyPayment)}</dd></div>
              <div><dt className="text-muted">Duration</dt><dd className="font-semibold">{s.durationMonths} months</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Created {dt(s.createdAt)} by {s.staff.name}{s.listing ? ` · from listing “${s.listing.model}”` : ""}</p>
          </Panel>
          <Panel title="Status">
            <Badge tone={statusTone(s.status)}>{s.status}</Badge>
            <ActionForm action={updateInstallmentSaleAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Status">
                  <select name="status" defaultValue={s.status} className="field">
                    {["PENDING", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="IMEI of the phone handed over"><input name="imei" defaultValue={s.imei ?? ""} className="field font-mono" /></Field>
              </div>
              <Field label="Notes"><textarea name="notes" rows={2} defaultValue={s.notes ?? ""} className="field" /></Field>
              <Submit>Save</Submit>
            </ActionForm>
          </Panel>
        </div>
        <Panel title="ID & supporting documents">
          {(!hasFront || !hasBack) && <p className="mb-3 rounded-lg bg-red/10 px-3 py-2 text-sm text-red">Missing: {[!hasFront && "ID card front", !hasBack && "ID card back"].filter(Boolean).join(", ")}</p>}
          <Attachments items={s.attachments} target="installment" id={s.id} isSuper={me.role === "SUPER_ADMIN"} />
        </Panel>
      </div>
    </>
  );
}
