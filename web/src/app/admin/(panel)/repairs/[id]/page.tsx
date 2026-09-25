import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseJson, pkr } from "@/lib/format";
import { DROP_OFF, REPAIR_CATEGORIES, REPAIR_STATUSES } from "@/lib/constants";
import { Badge, Field, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { NotesList } from "@/components/admin/NotesList";
import { addNoteAction, redeemCareAction, repairDetailsAction, repairStatusAction } from "../../../_actions/operations";

export const metadata = { title: "Repair" };

export default async function RepairPage(props: PageProps<"/admin/repairs/[id]">) {
  const { id } = await props.params;
  const r = await db.repairRequest.findUnique({
    where: { id },
    include: {
      statusChanges: { orderBy: { createdAt: "asc" }, include: { staff: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      customer: { include: { careCards: { where: { status: "ACTIVE" }, include: { redemptions: true } } } },
      careRedemptions: { include: { service: true, staff: true } },
      assignedTo: true,
    },
  });
  if (!r) notFound();
  const [staff, services] = await Promise.all([db.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }), db.careCardService.findMany({ where: { active: true, configured: true }, orderBy: { visitNumber: "asc" } })]);
  const photos = parseJson<string[]>(r.photos, []);
  const idx = REPAIR_STATUSES.findIndex((s) => s.key === r.status);
  const next = REPAIR_STATUSES[idx + 1];

  return (
    <>
      <PageTitle title={`Repair ${r.ref}`} sub={`${r.brand} ${r.model} · ${REPAIR_CATEGORIES[r.category as keyof typeof REPAIR_CATEGORIES] ?? r.category}`}>
        <Link href="/admin/repairs" className="text-sm text-blue">← Repair board</Link>
      </PageTitle>

      {/* Workflow stepper */}
      <Panel className="mb-6">
        <ol className="flex flex-wrap gap-2">
          {REPAIR_STATUSES.map((s, i) => (
            <li key={s.key} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${i < idx ? "bg-emerald-600/10 text-emerald-700" : i === idx ? "bg-navy-950 text-white" : "bg-cream text-muted"}`}>
              {i + 1}. {s.label}
            </li>
          ))}
          {r.status === "CANCELLED" && <li className="rounded-full bg-red px-3 py-1.5 text-xs font-semibold text-white">Cancelled</li>}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {next && r.status !== "CANCELLED" && (
            <ActionForm action={repairStatusAction}>
              <input type="hidden" name="repairId" value={r.id} />
              <input type="hidden" name="status" value={next.key} />
              <Submit variant="red">Move to “{next.label}” →</Submit>
            </ActionForm>
          )}
          <ActionForm action={repairStatusAction} className="flex gap-2">
            <input type="hidden" name="repairId" value={r.id} />
            <select name="status" defaultValue={r.status} aria-label="Set status" className="field !py-2">
              {[...REPAIR_STATUSES, { key: "CANCELLED", label: "Cancelled" }].map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <Submit variant="ghost">Set</Submit>
          </ActionForm>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Customer’s description">
            <p className="whitespace-pre-line text-sm">{r.description}</p>
            {photos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {photos.map((p) => (
                  <a key={p} href={p} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="Damage photo" className="h-24 w-24 rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Repair notes (§17)">
            <ActionForm action={addNoteAction} resetOnSuccess className="mb-5 space-y-3">
              <input type="hidden" name="kind" value="REPAIR" />
              <input type="hidden" name="repairId" value={r.id} />
              {r.customerId && <input type="hidden" name="customerId" value={r.customerId} />}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Reported issue"><input name="issue" className="field" /></Field>
                <Field label="Inspection findings"><input name="findings" className="field" /></Field>
                <Field label="Work completed"><input name="work" className="field" /></Field>
                <Field label="Parts used"><input name="parts" className="field" /></Field>
              </div>
              <Field label="Note"><textarea name="body" rows={2} required className="field" /></Field>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="important" className="h-4 w-4" /> Important</label>
                <Submit>Add note</Submit>
              </div>
            </ActionForm>
            <NotesList notes={r.notes} />
          </Panel>

          <Panel title="Status history">
            <ul className="space-y-2 text-sm">
              {r.statusChanges.map((s) => (
                <li key={s.id} className="flex gap-3">
                  <span className="w-36 shrink-0 text-xs text-muted">{dt(s.createdAt)}</span>
                  <span>{s.from ? `${s.from} → ` : ""}<b>{s.to}</b> · {s.staff?.name ?? "Customer (online)"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold">{r.name}</p>
            <p className="text-sm">{r.phone}{r.email ? ` · ${r.email}` : ""}</p>
            <p className="mt-2 text-xs text-muted">{DROP_OFF[r.dropOff as keyof typeof DROP_OFF]}{r.preferredAt ? ` · preferred ${dt(r.preferredAt)}` : ""}</p>
            {r.customer && <Link href={`/admin/customers/${r.customer.id}`} className="mt-3 inline-block text-sm text-blue">Passport {r.customer.passportNo} · {r.customer.loyaltyPoints} pts →</Link>}
          </Panel>

          <Panel title="Quote & assignment">
            <ActionForm action={repairDetailsAction} className="space-y-3">
              <input type="hidden" name="repairId" value={r.id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quote (PKR)"><input name="quote" type="number" defaultValue={r.quote ?? ""} className="field" /></Field>
                <Field label="Final price"><input name="finalPrice" type="number" defaultValue={r.finalPrice ?? ""} className="field" /></Field>
              </div>
              <Field label="Assigned technician">
                <select name="assignedToId" defaultValue={r.assignedToId ?? ""} className="field">
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Submit>Save</Submit>
            </ActionForm>
            {r.quote != null && <p className="mt-3 text-xs text-muted">Quote {pkr(r.quote)} is shown to the customer on the tracking page.</p>}
          </Panel>

          <Panel title="Care Card (§18)">
            {r.careRedemptions.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {r.careRedemptions.map((c) => (
                  <li key={c.id}><Badge tone="green">Redeemed</Badge> {c.service.name} · {c.staff.name} · {dt(c.createdAt)}</li>
                ))}
              </ul>
            )}
            {!r.customer?.careCards.length ? (
              <p className="text-sm text-muted">No active Care Card for this customer.</p>
            ) : (
              r.customer.careCards.map((card) => {
                const available = services.filter((s) => !card.redemptions.some((x) => x.serviceId === s.id));
                return (
                  <ActionForm key={card.id} action={redeemCareAction} className="space-y-2 rounded-xl bg-navy-950 p-3 text-white">
                    <p className="text-sm"><b className="text-gold">{card.number}</b> · {card.maxUses - card.redemptions.length} of {card.maxUses} uses left</p>
                    <input type="hidden" name="cardId" value={card.id} />
                    <input type="hidden" name="repairId" value={r.id} />
                    <select name="serviceId" aria-label="Service" className="field field-dark">
                      {available.map((s) => <option key={s.id} value={s.id}>Visit {s.visitNumber}: {s.name}</option>)}
                    </select>
                    <Submit variant="gold">Redeem with this repair</Submit>
                  </ActionForm>
                );
              })
            )}
          </Panel>

          <Panel title="Status">
            <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            <p className="mt-2 text-xs text-muted">Created {dt(r.createdAt)}{r.completedAt ? ` · completed ${dt(r.completedAt)}` : ""}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
