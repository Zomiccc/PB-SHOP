import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { Badge, Field, PageTitle, Panel, Table, Td, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { NotesList } from "@/components/admin/NotesList";
import { addNoteAction, adjustPointsAction, redeemRewardAction } from "../../../_actions/operations";

export const metadata = { title: "Customer" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: true } },
      repairs: { orderBy: { createdAt: "desc" } },
      loyaltyTx: { orderBy: { createdAt: "desc" }, include: { staff: true, reward: true } },
      careCards: { include: { redemptions: { include: { service: true, staff: true } } }, orderBy: { issuedAt: "desc" } },
      notes: { where: { kind: "CUSTOMER" }, orderBy: { createdAt: "desc" }, include: { author: true } },
    },
  });
  if (!c) notFound();
  const rewards = await db.reward.findMany({ where: { active: true }, orderBy: { pointsCost: "asc" } });
  const spent = c.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageTitle title={c.name} sub={`${c.phone}${c.email ? ` · ${c.email}` : ""} · Passport ${c.passportNo}`}>
        <Link href="/admin/customers" className="text-sm text-blue">← Customers</Link>
      </PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-navy-950 p-5 text-white"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-white/50">Points</p><p className="display mt-2 text-3xl text-gold">{c.loyaltyPoints}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">Lifetime spend</p><p className="display mt-2 text-3xl">{pkr(spent)}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">Orders</p><p className="display mt-2 text-3xl">{c.orders.length}</p></div>
        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">Repairs</p><p className="display mt-2 text-3xl">{c.repairs.length}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Redeem a reward">
          <ActionForm action={redeemRewardAction} className="flex gap-2">
            <input type="hidden" name="customerId" value={c.id} />
            <select name="rewardId" aria-label="Reward" className="field">
              {rewards.map((r) => <option key={r.id} value={r.id} disabled={r.pointsCost > c.loyaltyPoints}>{r.name} — {r.pointsCost} pts</option>)}
            </select>
            <Submit variant="gold">Redeem</Submit>
          </ActionForm>
          <ActionForm action={adjustPointsAction} resetOnSuccess className="mt-5 grid gap-2 border-t border-ink/10 pt-5 sm:grid-cols-[100px_140px_1fr_auto]">
            <input type="hidden" name="customerId" value={c.id} />
            <input name="points" type="number" placeholder="±pts" required aria-label="Points" className="field" />
            <select name="type" aria-label="Type" className="field"><option value="ADJUST">Adjustment</option><option value="PROMO">Promotion</option></select>
            <input name="reason" placeholder="Reason (required)" required className="field" />
            <Submit variant="ghost">Apply</Submit>
          </ActionForm>
        </Panel>

        <Panel title="Care Cards">
          {c.careCards.length === 0 ? <p className="text-sm text-muted">No Care Cards.</p> : c.careCards.map((card) => (
            <div key={card.id} className="mb-3 rounded-xl bg-cream p-3 text-sm">
              <div className="flex items-center justify-between"><b>{card.number}</b><Badge tone={statusTone(card.status)}>{card.status} · {card.redemptions.length}/{card.maxUses}</Badge></div>
              <ul className="mt-2 space-y-1 text-xs">
                {card.redemptions.map((r) => <li key={r.id}>✓ {r.service.name} · {r.staff.name} · {dt(r.createdAt)}</li>)}
              </ul>
            </div>
          ))}
          <Link href={`/admin/care-cards?q=${c.phone}`} className="text-sm text-blue">Open Care Card desk →</Link>
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
                <Td><Badge tone={t.points >= 0 ? "green" : "red"}>{t.type}</Badge></Td>
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
    </>
  );
}
