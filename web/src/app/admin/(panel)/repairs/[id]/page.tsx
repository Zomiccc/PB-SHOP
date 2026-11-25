import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseJson, pkr } from "@/lib/format";
import { DROP_OFF, REPAIR_CATEGORIES, REPAIR_STATUSES } from "@/lib/constants";
import { Badge, Field, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { NotesList } from "@/components/admin/NotesList";
import { getSetting } from "@/lib/settings";
import { pointsForRepair } from "@/lib/loyalty";
import { addNoteAction, linkRepairRewardsAction, redeemRewardAction, repairDetailsAction, repairStatusAction } from "../../../_actions/operations";
import { Attachments } from "@/components/admin/Attachments";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Repair" };

export default async function RepairPage(props: PageProps<"/admin/repairs/[id]">) {
  const me = await requireStaffPage();
  const { id } = await props.params;
  const r = await db.repairRequest.findUnique({
    where: { id },
    include: {
      statusChanges: { orderBy: { createdAt: "asc" }, include: { staff: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      customer: true,
      attachments: { orderBy: { createdAt: "asc" }, include: { uploadedBy: true } },
      assignedTo: true,
    },
  });
  if (!r) notFound();
  const [staff, repairRewards, rules, earnedTx] = await Promise.all([
    db.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.reward.findMany({ where: { active: true, kind: "REPAIR_DISCOUNT" }, orderBy: { pointsCost: "asc" } }),
    getSetting("passport"),
    db.loyaltyTransaction.findMany({ where: { repairId: id, type: "EARN" }, select: { points: true } }),
  ]);
  const earned = earnedTx.reduce((s, t) => s + t.points, 0);
  const charge = r.finalPrice ?? r.quote;
  const photos = parseJson<string[]>(r.photos, []);
  const idx = REPAIR_STATUSES.findIndex((s) => s.key === r.status);
  const next = REPAIR_STATUSES[idx + 1];

  return (
    <>
      <PageTitle title={`Repair ${r.ref}`} sub={`${r.brand} ${r.model} · ${REPAIR_CATEGORIES[r.category as keyof typeof REPAIR_CATEGORIES] ?? r.category}`}>
        <Link href={`/admin/repairs/${r.id}/print`} target="_blank" className="btn btn-gold !py-2.5 !text-sm">
          Print repair information
        </Link>
        <Link href="/admin/repairs" className="text-sm text-blue">← Repair board</Link>
      </PageTitle>

      {/* Workflow stepper */}
      <Panel className="mb-6">
        <ol className="flex flex-wrap gap-2">
          {REPAIR_STATUSES.map((s, i) => (
            <li key={s.key} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${i < idx ? "bg-emerald-600/10 text-emerald-400" : i === idx ? "bg-navy-950 text-white" : "bg-cream text-muted"}`}>
              {i + 1}. {s.label}
            </li>
          ))}
          {r.status === "CANCELLED" && <li className="rounded-full bg-red px-3 py-1.5 text-xs font-semibold text-white">Cancelled</li>}
          {r.status === "COMPLETED" && r.completedAt && <li className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Delivered {dt(r.completedAt)}</li>}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Deliver (Nov 2026): handing the phone back to the customer completes the repair in one tap. */}
          {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
            <ActionForm action={repairStatusAction}>
              <input type="hidden" name="repairId" value={r.id} />
              <input type="hidden" name="status" value="COMPLETED" />
              <Submit variant="gold">Deliver — mark Completed ✓</Submit>
            </ActionForm>
          )}
          {next && next.key !== "COMPLETED" && r.status !== "CANCELLED" && (
            <ActionForm action={repairStatusAction}>
              <input type="hidden" name="repairId" value={r.id} />
              <input type="hidden" name="status" value={next.key} />
              <Submit variant="red">Move to “{next.label}” →</Submit>
            </ActionForm>
          )}
          <ActionForm action={repairStatusAction} className="flex w-full flex-wrap gap-2 sm:w-auto">
            <input type="hidden" name="repairId" value={r.id} />
            <select name="status" defaultValue={r.status} aria-label="Set status" className="field !w-auto min-w-[15rem] flex-1 !py-2">
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

          <Panel title="Repair notes">
            <ActionForm action={addNoteAction} resetOnSuccess className="mb-5 space-y-3">
              <input type="hidden" name="kind" value="REPAIR" />
              <input type="hidden" name="repairId" value={r.id} />
              {r.customerId && <input type="hidden" name="customerId" value={r.customerId} />}
              <Field label="Note"><textarea name="body" rows={2} required placeholder="What was done, what the customer said…" className="field" /></Field>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">More detail (optional)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Reported issue"><input name="issue" className="field" /></Field>
                <Field label="Inspection findings"><input name="findings" className="field" /></Field>
                <Field label="Work completed"><input name="work" className="field" /></Field>
                <Field label="Parts used"><input name="parts" className="field" /></Field>
              </div>
              </details>
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
            {r.imei && <p className="mt-1 font-mono text-xs text-muted">IMEI/serial: {r.imei}</p>}
            <p className="mt-2 text-xs text-muted">{DROP_OFF[r.dropOff as keyof typeof DROP_OFF]}{r.preferredAt ? ` · preferred ${dt(r.preferredAt)}` : ""}</p>
          </Panel>

          <Panel title="Price">
            <ActionForm action={repairDetailsAction} className="space-y-3">
              <input type="hidden" name="repairId" value={r.id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (PKR)" hint="What the customer pays"><input name="finalPrice" type="number" inputMode="numeric" defaultValue={r.finalPrice ?? ""} className="field !py-3 text-base" /></Field>
                <Field label="Parts cost (PKR)" hint="What the parts cost the shop"><input name="partsCost" type="number" inputMode="numeric" min={0} defaultValue={r.partsCost ?? ""} className="field !py-3 text-base" /></Field>
              </div>
              {charge != null && (
                <p className="rounded-lg bg-emerald-600/10 px-3 py-2 text-sm">
                  Profit: <b className="text-emerald-400">{pkr(charge - (r.rewardDiscount ?? 0) - (r.partsCost ?? 0))}</b>
                  <span className="text-xs text-muted"> = price {pkr(charge)}{r.rewardDiscount ? ` − rewards discount ${pkr(r.rewardDiscount)}` : ""} − parts {pkr(r.partsCost ?? 0)}</span>
                </p>
              )}
              <details className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-muted">More (quote, IMEI, technician)</summary>
                <div className="mt-3 space-y-3">
                  <Field label="Quote (PKR)" hint="Shown to the customer on the tracking page"><input name="quote" type="number" defaultValue={r.quote ?? ""} className="field" /></Field>
                  <Field label="IMEI / serial"><input name="imei" defaultValue={r.imei ?? ""} className="field" /></Field>
                  <Field label="Assigned technician">
                    <select name="assignedToId" defaultValue={r.assignedToId ?? ""} className="field">
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
              </details>
              <Submit>Save</Submit>
            </ActionForm>
          </Panel>

          <Panel title="PB Rewards">
            {/* Follow-up (25 Nov): the repair is linked to the customer's account and earns points when delivered. */}
            {r.customer ? (
              <div className="mb-3 text-sm">
                <Link href={`/admin/customers/${r.customer.id}`} className="font-semibold text-blue">Rewards ID {r.customer.passportNo} · {r.customer.loyaltyPoints} points →</Link>
                <p className="mt-1 text-muted">
                  {earned > 0
                    ? `+${earned} PB Points given for this repair.`
                    : r.status === "COMPLETED"
                      ? "No points — this repair has no price."
                      : `Earns ${pointsForRepair(r, rules)} PB Points when delivered (1 point per Rs ${rules.rupeesPerPoint} of the price).`}
                </p>
              </div>
            ) : (
              <ActionForm action={linkRepairRewardsAction} className="mb-3 space-y-2">
                <input type="hidden" name="repairId" value={r.id} />
                <p className="text-sm text-muted">Not linked to a PB Rewards account yet. Linking uses the mobile number {r.phone} (a new account is made if needed).</p>
                <Submit variant="gold">Link to PB Rewards</Submit>
              </ActionForm>
            )}
            {r.rewardDiscount ? (
              <p className="text-sm"><Badge tone="green">Applied</Badge> Rs {r.rewardDiscount.toLocaleString("en-PK")} off labour{charge != null ? ` · customer pays ${pkr(charge - r.rewardDiscount)}` : ""}</p>
            ) : !r.customer || repairRewards.length === 0 ? null : (
              <ActionForm action={redeemRewardAction} className="space-y-2">
                <input type="hidden" name="customerId" value={r.customer.id} />
                <input type="hidden" name="repairId" value={r.id} />
                <p className="text-sm">{r.customer.loyaltyPoints} points available</p>
                <select name="rewardId" aria-label="Reward" className="field">
                  {repairRewards.map((w) => <option key={w.id} value={w.id} disabled={w.pointsCost > r.customer!.loyaltyPoints}>{w.name} — {w.pointsCost} pts</option>)}
                </select>
                <p className="text-xs text-muted">Set the final charge and parts cost first — the discount applies to labour only.</p>
                <Submit variant="gold">Apply to this repair</Submit>
              </ActionForm>
            )}
          </Panel>

          <Panel title="Photos & documents">
            <Attachments items={r.attachments} target="repair" id={r.id} isSuper={me.role === "SUPER_ADMIN"} />
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
