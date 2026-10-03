import Link from "next/link";
import type { InstallmentListing } from "@prisma/client";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { AVAILABILITY, maskCnic, monthlyPayment } from "@/lib/installments";
import { INSTALLMENT_BRANDS, brandBySlug } from "@/lib/brands";
import { Badge, Field, PageTitle, Panel, Table, Td, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { deleteListingAction, installmentRequestStatusAction, moveListingAction, saveListingAction } from "../../_actions/content";
import { formatPkt } from "@/lib/appointments";
import { recentInstallmentRequests } from "@/lib/installment-requests";

export const metadata = { title: "Installments" };

/**
 * Installment phones shown on the homepage (add / edit / reorder / remove) and in-store installment
 * sales (master brief §3, §5). There is no online installment checkout.
 */
export default async function InstallmentsAdminPage() {
  const [listings, sales, requests] = await Promise.all([
    db.installmentListing.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { sales: true } } } }),
    db.installmentSale.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { staff: true, _count: { select: { attachments: true } } } }),
    // Upcoming and recent online requests with their appointment (v6 §7).
    recentInstallmentRequests(),
  ]);
  return (
    <>
      <PageTitle title="Installments" sub="Listings appear in the homepage “Phones on easy installments” section in this order. Customers complete purchases in store with their CNIC.">
        <Link href="/admin/installments/sales/new" className="btn btn-gold !py-2.5 !text-sm">+ New installment sale</Link>
        <Link href="/#installments" target="_blank" className="btn btn-ghost !py-2.5 !text-sm text-ink"><span>View on homepage</span></Link>
      </PageTitle>

      <Panel title={`Appointment requests (${requests.length})`} className="mb-6">
        <p className="mb-3 text-sm text-muted">Booked online from the Installments page. Times are Pakistan time. Cancelling frees the slot.</p>
        <Table head={["Appointment", "Customer", "Phone & plan", "Status", ""]} empty="No appointment requests yet.">
          {requests.map((r) => (
            <tr key={r.id}>
              <Td><b>{formatPkt(r.appointmentAt)}</b><span className="block font-mono text-xs text-muted">{r.ref}</span></Td>
              <Td>
                <b>{r.name}</b>
                <span className="block text-xs"><a href={`tel:${r.phone}`} className="text-blue">{r.phone}</a> · <a href={`https://wa.me/92${r.phone.slice(1)}`} target="_blank" rel="noreferrer" className="text-blue">WhatsApp</a></span>
                {(r.email || r.city) && <span className="block text-xs text-muted">{[r.email, r.city].filter(Boolean).join(" · ")}</span>}
              </Td>
              <Td className="max-w-xs text-xs">
                <b className="text-sm">{r.phoneModel}</b>
                <span className="block text-muted">{[r.price && pkr(r.price), r.downPercent != null && `${r.downPercent}% down`, r.terms && r.perInstallment && `${r.terms} × ${pkr(r.perInstallment)}`].filter(Boolean).join(" · ") || "No plan chosen"}</span>
                {r.notes && <span className="mt-1 block italic text-muted">“{r.notes}”</span>}
              </Td>
              <Td><Badge tone={r.status === "NEW" ? "gold" : r.status === "CONFIRMED" ? "blue" : r.status === "COMPLETED" ? "green" : "red"}>{r.status.replace("_", " ")}</Badge></Td>
              <Td>
                <ActionForm action={installmentRequestStatusAction} className="flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} aria-label="Status" className="field !w-36 !py-2 !text-sm">
                    <option value="NEW">New</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed (visited)</option>
                    <option value="NO_SHOW">No-show</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <Submit variant="ghost">Save</Submit>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid gap-6 2xl:grid-cols-[1.3fr_1fr]">
        <Panel title={`Homepage listings (${listings.length})`}>
          <div className="space-y-3">
            {listings.map((l, i) => (
              <details key={l.id} className="rounded-xl border border-ink/10 open:bg-cream/50">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="font-mono text-xs text-muted">#{i + 1}</span>
                  <span className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[0.65rem] uppercase">{brandBySlug(l.brand)?.name ?? l.brand ?? "—"}</span>
                  <b>{l.model}</b>
                  <span className="text-muted">{pkr(monthlyPayment(l))}/mo · {l.durationMonths} mo</span>
                  <Badge tone={l.availability === "AVAILABLE" ? "green" : l.availability === "LIMITED" ? "gold" : "red"}>{AVAILABILITY[l.availability as keyof typeof AVAILABILITY]}</Badge>
                  {!l.active && <Badge>hidden</Badge>}
                  <span className="ml-auto flex gap-1">
                    <Move id={l.id} dir="up" disabled={i === 0} />
                    <Move id={l.id} dir="down" disabled={i === listings.length - 1} />
                  </span>
                </summary>
                <div className="space-y-3 border-t border-ink/10 p-4">
                  <ListingForm l={l} />
                  <ActionForm action={deleteListingAction} confirm={`Remove “${l.model}” from the homepage?${l._count.sales ? " Past sales keep their record." : ""}`}>
                    <input type="hidden" name="id" value={l.id} />
                    <Submit variant="ghost">Remove listing</Submit>
                  </ActionForm>
                </div>
              </details>
            ))}
            <details className="rounded-xl border-2 border-dashed border-ink/15" open={listings.length === 0}>
              <summary className="cursor-pointer p-3 text-sm font-semibold text-blue">+ Add installment phone</summary>
              <div className="border-t border-ink/10 p-4"><ListingForm /></div>
            </details>
          </div>
        </Panel>

        <Panel title="Recent installment sales">
          <Table head={["Ref", "Customer", "Phone", "Plan", "Status"]} empty="No installment sales yet.">
            {sales.map((s) => (
              <tr key={s.id}>
                <Td><Link href={`/admin/installments/sales/${s.id}`} className="font-semibold hover:text-blue">{s.ref}</Link><span className="block text-xs text-muted">{dt(s.createdAt)} · {s.staff.name}</span></Td>
                <Td>{s.customerName}<span className="block font-mono text-xs text-muted">{maskCnic(s.cnicNumber)}</span></Td>
                <Td className="text-xs">{s.phoneModel}</Td>
                <Td className="text-xs">{pkr(s.monthlyPayment)} × {s.durationMonths}</Td>
                <Td><Badge tone={statusTone(s.status)}>{s.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}

function Move({ id, dir, disabled }: { id: string; dir: "up" | "down"; disabled: boolean }) {
  return (
    <ActionForm action={moveListingAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dir" value={dir} />
      <button disabled={disabled} aria-label={`Move ${dir}`} className="grid h-7 w-7 place-items-center rounded-lg bg-ink/5 text-xs disabled:opacity-30">{dir === "up" ? "↑" : "↓"}</button>
    </ActionForm>
  );
}

function ListingForm({ l }: { l?: InstallmentListing }) {
  return (
    <ActionForm action={saveListingAction} resetOnSuccess={!l} className="space-y-3">
      <input type="hidden" name="id" value={l?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <Field label="Brand">
          <select name="brand" defaultValue={l?.brand ?? ""} className="field">
            <option value="">Detect from model</option>
            {INSTALLMENT_BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Phone model"><input name="model" defaultValue={l?.model} required placeholder="Infinix Hot 50 · 8GB / 256GB" className="field" /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Regular price (Rs)"><input name="regularPrice" type="number" min={1} defaultValue={l?.regularPrice} required className="field" /></Field>
        <Field label="Installment total (Rs)"><input name="installmentTotal" type="number" min={1} defaultValue={l?.installmentTotal} required className="field" /></Field>
        <Field label="Interest / markup %"><input name="interestPercent" type="number" step="0.01" min={0} defaultValue={l?.interestPercent ?? 0} className="field" /></Field>
        <Field label="Down payment (Rs)"><input name="downPayment" type="number" min={0} defaultValue={l?.downPayment} required className="field" /></Field>
        <Field label="Duration (months)"><input name="durationMonths" type="number" min={1} max={60} defaultValue={l?.durationMonths ?? 9} required className="field" /></Field>
        <Field label="Availability">
          <select name="availability" defaultValue={l?.availability ?? "AVAILABLE"} className="field">
            {Object.entries(AVAILABILITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Model number (optional)"><input name="modelNo" defaultValue={l?.modelNo ?? ""} placeholder="X6879" className="field" /></Field>
        <Field label="Colours (optional)" hint="Comma-separated"><input name="colors" defaultValue={l?.colors ?? ""} placeholder="Mist Titanium, Midnight Black" className="field" /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan label (optional)"><input name="planLabel" defaultValue={l?.planLabel ?? ""} placeholder="9 monthly payments" className="field" /></Field>
        <Field label="Image URL (optional)" hint="https://… or /path"><input name="imageUrl" defaultValue={l?.imageUrl ?? ""} className="field" /></Field>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={l?.active ?? true} className="h-4 w-4" /> Show on homepage</label>
        <Submit variant="gold">{l ? "Save listing" : "Add listing"}</Submit>
      </div>
    </ActionForm>
  );
}
