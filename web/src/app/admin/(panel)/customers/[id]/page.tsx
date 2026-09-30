import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { Badge, Field, PageTitle, Panel, Table, Td, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { NotesList } from "@/components/admin/NotesList";
import { addNoteAction, adjustPointsAction, deleteCustomerAction, redeemRewardAction, updatePassportAction } from "../../../_actions/operations";
import { requireStaffPage } from "@/lib/staff";
import { availablePoints } from "@/lib/loyalty";
import { getSetting } from "@/lib/settings";
import { MONTHS, formatCardExpiry } from "@/lib/passport-rules";
import { AwardPointsForm } from "@/components/admin/AwardPointsForm";

const SOURCE_LABEL: Record<string, string> = { WELCOME: "Welcome reward", REFERRAL: "Referral reward", REPAIR: "Repair", NEW_PHONE: "New phone", USED_PHONE: "Used phone", MANUAL: "Staff" };
const TYPE_LABEL: Record<string, string> = { AWARD: "MANUAL AWARD" };

export const metadata = { title: "Customer" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const me = await requireStaffPage();
  const { id } = await props.params;
  if (await db.customer.findUnique({ where: { id }, select: { id: true } })) await availablePoints(db, id);
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      repairs: { orderBy: { createdAt: "desc" } },
      loyaltyTx: { orderBy: { createdAt: "desc" }, include: { staff: true, reward: true } },
      notes: { where: { kind: "CUSTOMER" }, orderBy: { createdAt: "desc" }, include: { author: true } },
      referredBy: { select: { id: true, name: true, passportNo: true } },
      _count: { select: { referrals: true } },
    },
  });
  if (!c) notFound();
  const card = await getSetting("passportCard");
  const rewards = await db.reward.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }] });
  const now = new Date();
  const lots = c.loyaltyTx.filter((t) => (t.remaining ?? 0) > 0 && t.expiresAt && t.expiresAt > now).sort((a, b) => +a.expiresAt! - +b.expiresAt!);
  const openRepairs = c.repairs.filter((r) => r.status !== "CANCELLED" && !r.rewardDiscount);
  const spent = c.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageTitle title={c.name} sub={`${c.phone}${c.email ? ` · ${c.email}` : ""} · Passport ${c.passportNo}`}>
        <Link href={`/admin/customers/${c.id}/card`} className="btn btn-gold !py-2.5 !text-sm">Passport card</Link>
        <Link href="/admin/customers" className="text-sm text-blue">← Customers</Link>
      </PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-navy-950 p-5 text-white"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white/50">Points</p><p className="display mt-2 text-3xl text-gold">{c.loyaltyPoints}</p></div>
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">Lifetime spend</p><p className="display mt-2 text-3xl">{pkr(spent)}</p></div>
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">Orders</p><p className="display mt-2 text-3xl">{c.orders.length}</p></div>
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">Repairs</p><p className="display mt-2 text-3xl">{c.repairs.length}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Award PB Points" id="award">
          <AwardPointsForm customer={{ id: c.id, name: c.name, passportNo: c.passportNo, points: c.loyaltyPoints }} />
          <p className="mt-2 text-xs text-muted">Extra points for this customer (e.g. goodwill or a promotion). Shows in their points history as a separate manual award with your name and the time; the points expire like any other.</p>
        </Panel>

        <Panel title="Passport details" id="passport">
          <ActionForm action={updatePassportAction} className="space-y-3">
            <input type="hidden" name="customerId" value={c.id} />
            <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr_1.2fr]">
              <Field label="Birth month">
                <select name="birthMonth" defaultValue={c.birthMonth ?? ""} className="field">
                  <option value="">Not given</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </Field>
              <Field label="Day" hint="No year"><input name="birthDay" type="number" min={1} max={31} defaultValue={c.birthDay ?? ""} className="field" /></Field>
              <Field label="Card expiry date" hint="Admin only — never printed"><input name="cardExpiresAt" type="date" defaultValue={c.cardExpiresAt ? c.cardExpiresAt.toISOString().slice(0, 10) : ""} className="field" /></Field>
            </div>
            <Submit variant="ghost">Save details</Submit>
          </ActionForm>
          <dl className="mt-4 grid gap-1 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Card expiry</dt><dd>{c.cardExpiresAt ? `${formatCardExpiry(c.cardExpiresAt)}${c.cardExpiresAt < now ? " · expired" : ""}` : "Not set"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">On the digital card</dt><dd>{card.showExpiryOnDigital ? "Shown" : "Hidden"} <Link href="/admin/settings#passport-card" className="text-xs text-blue">change</Link></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Referred by</dt><dd>{c.referredBy ? <Link href={`/admin/customers/${c.referredBy.id}`} className="text-blue">{c.referredBy.name} ({c.referredBy.passportNo})</Link> : "—"}{c.referredBy && <span className="block text-right text-xs text-muted">{c.referralRewardedAt ? `referrer rewarded ${dt(c.referralRewardedAt)}` : "rewarded on first purchase / repair"}</span>}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Friends referred</dt><dd>{c._count.referrals}</dd></div>
          </dl>
        </Panel>

        <Panel title="Redeem a reward">
          <ActionForm action={redeemRewardAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="customerId" value={c.id} />
            <select name="rewardId" aria-label="Reward" className="field">
              {rewards.map((r) => <option key={r.id} value={r.id} disabled={r.pointsCost > c.loyaltyPoints}>{r.name} — {r.pointsCost} pts</option>)}
            </select>
            <select name="repairId" aria-label="Repair (for repair discounts)" className="field">
              <option value="">Repair (for repair discounts)</option>
              {openRepairs.map((r) => <option key={r.id} value={r.id}>{r.ref} · {r.brand} {r.model}</option>)}
            </select>
            <Submit variant="gold">Redeem</Submit>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Only unexpired points can be used; the soonest-expiring points are spent first. Repair discounts apply to labour only (final charge minus parts).</p>
          <p className="mt-5 border-t border-ink/10 pt-5 text-xs font-semibold text-muted">Correct or deduct points</p>
          <ActionForm action={adjustPointsAction} resetOnSuccess className="mt-2 grid gap-2 sm:grid-cols-[100px_140px_1fr_auto]">
            <input type="hidden" name="customerId" value={c.id} />
            <input name="points" type="number" placeholder="±pts" required aria-label="Points" className="field" />
            <select name="type" aria-label="Type" className="field"><option value="ADJUST">Adjustment</option><option value="PROMO">Promotion</option></select>
            <input name="reason" placeholder="Reason (required)" required className="field" />
            <Submit variant="ghost">Apply</Submit>
          </ActionForm>
        </Panel>

        <Panel title="Points by expiry date">
          <Table head={["Earned", "From", "Left", "Expires"]} empty="No unexpired points.">
            {lots.map((l) => (
              <tr key={l.id}>
                <Td className="text-xs text-muted">{dt(l.createdAt)}</Td>
                <Td className="text-xs">{l.reason}</Td>
                <Td className="font-semibold">{l.remaining}</Td>
                <Td className="text-xs">{l.expiresAt?.toLocaleDateString("en-PK")}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Purchase history">
          <Table head={["Order", "Items", "Total", "Status"]} empty="No orders.">
            {c.orders.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-blue">{o.number}</Link><span className="block text-xs text-muted">{dt(o.createdAt)}</span></Td>
                <Td className="max-w-[200px] truncate text-xs">{o.items.map((i) => i.name).join(", ")}</Td>
                <Td>{pkr(o.total)}</Td>
                <Td><Badge tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Repair history">
          <Table head={["Ref", "Device", "Status", "Date"]} empty="No repairs.">
            {c.repairs.map((r) => (
              <tr key={r.id}>
                <Td><Link href={`/admin/repairs/${r.id}`} className="font-semibold hover:text-blue">{r.ref}</Link></Td>
                <Td>{r.brand} {r.model}</Td>
                <Td><Badge tone={statusTone(r.status)}>{r.status}</Badge></Td>
                <Td className="text-xs text-muted">{dt(r.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Loyalty activity">
          <Table head={["When", "Type", "Points", "Reason", "By"]} empty="No activity.">
            {c.loyaltyTx.map((t) => (
              <tr key={t.id}>
                <Td className="text-xs text-muted">{dt(t.createdAt)}</Td>
                <Td><Badge tone={t.points >= 0 ? "green" : "red"}>{TYPE_LABEL[t.type] ?? t.type}</Badge>{t.source && t.type === "EARN" && <span className="block text-[0.65rem] text-muted">{SOURCE_LABEL[t.source] ?? t.source}</span>}</Td>
                <Td className="font-semibold">{t.points > 0 ? `+${t.points}` : t.points}</Td>
                <Td className="text-xs">{t.reward?.name ?? t.reason}</Td>
                <Td className="text-xs">{t.staff?.name ?? "system"}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Customer notes">
          <ActionForm action={addNoteAction} resetOnSuccess className="mb-4 space-y-2">
            <input type="hidden" name="kind" value="CUSTOMER" />
            <input type="hidden" name="customerId" value={c.id} />
            <Field label="Note"><textarea name="body" rows={2} className="field" /></Field>
            <Submit>Add note</Submit>
          </ActionForm>
          <NotesList notes={c.notes} />
        </Panel>
      </div>

      {me.role === "SUPER_ADMIN" && (
        <Panel title="Delete customer" id="delete" className="mt-6 ring-1 ring-red/30">
          <p className="text-sm text-muted">For someone who is no longer a customer. Removes this Phone Passport profile, customer notes and website login, so they no longer appear in customer lists. Orders, repairs and installment sales are kept as business records (unlinked), and their points history is kept in the audit log with your name and the time. This can&apos;t be undone.</p>
          <ActionForm action={deleteCustomerAction} className="mt-4 flex flex-wrap items-center gap-2" confirm={`Delete ${c.name} permanently?`}>
            <input type="hidden" name="customerId" value={c.id} />
            <input name="confirm" placeholder="Type DELETE" aria-label="Type DELETE to confirm" autoComplete="off" className="field !w-40" />
            <Submit variant="red">Delete customer</Submit>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
