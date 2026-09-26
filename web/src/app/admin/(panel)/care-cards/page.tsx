import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Badge, PageTitle, Panel, Table, Td, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { redeemCareAction } from "../../_actions/operations";

export const metadata = { title: "Care Card desk" };

/**
 * Employee desk for PB Care Card visits (§18). Staff can redeem an available service;
 * only the owner can change service definitions (Settings).
 */
export default async function CareCardsPage(props: PageProps<"/admin/care-cards">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const digits = q.replace(/\D/g, "");
  const [services, rules] = await Promise.all([db.careCardService.findMany({ orderBy: { visitNumber: "asc" } }), getSetting("careCard")]);
  const cards = q
    ? await db.careCard.findMany({
        where: { OR: [{ number: { contains: q.toUpperCase() } }, ...(digits.length >= 4 ? [{ customer: { phone: { contains: digits } } }] : []), { customer: { passportNo: { contains: q.toUpperCase() } } }] },
        include: { customer: true, order: true, redemptions: { include: { service: true, staff: true }, orderBy: { createdAt: "asc" } } },
        take: 20,
      })
    : [];
  const recent = await db.careCardRedemption.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { careCard: true, service: true, staff: true, customer: true } });

  return (
    <>
      <PageTitle title="Care Card desk" sub={`Up to ${rules.maxUses} uses per card · ${rules.allowRepeatService ? "services may repeat" : "each service once per card"}`} />
      <Panel className="mb-6">
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} autoFocus placeholder="Scan / type card no. (PBC-…), phone or passport no." className="field flex-1" />
          <button className="btn btn-primary !py-2.5 !text-sm">Find card</button>
        </form>
      </Panel>

      {q && cards.length === 0 && <p className="mb-6 rounded-xl bg-card p-6 text-center text-muted shadow-[var(--shadow-card)]">No Care Card found for “{q}”.</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        {cards.map((card) => {
          const used = card.redemptions.length;
          return (
            <Panel key={card.id}>
              <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">PB Care Card</p>
                    <p className="display mt-1 text-2xl">{card.number}</p>
                  </div>
                  <Badge tone={statusTone(card.status)}>{card.status}</Badge>
                </div>
                <p className="mt-3 text-sm">{card.customer.name} · {card.customer.phone}</p>
                <p className="text-xs text-white/50">Issued {dt(card.issuedAt)}{card.order ? ` with ${card.order.number}` : ""}</p>
                <div className="mt-4 flex gap-1.5">
                  {Array.from({ length: card.maxUses }, (_, i) => (
                    <span key={i} className={`h-2 flex-1 rounded-full ${i < used ? "bg-gold" : "bg-white/15"}`} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-white/60">{card.maxUses - used} of {card.maxUses} uses remaining</p>
              </div>

              <ul className="mt-4 space-y-2">
                {services.map((s) => {
                  const r = card.redemptions.find((x) => x.serviceId === s.id);
                  const available = card.status === "ACTIVE" && s.active && s.configured && (!r || rules.allowRepeatService);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-cream p-3 text-sm">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-950 font-mono text-xs text-gold">{s.visitNumber}</span>
                      <span className="flex-1">
                        <b className={s.configured ? "" : "text-muted"}>{s.configured ? s.name : "Not yet defined by owner"}</b>
                        {r && <span className="block text-xs text-muted">Redeemed {dt(r.createdAt)} by {r.staff.name}</span>}
                        {!s.active && s.configured && <span className="block text-xs text-muted">Inactive</span>}
                      </span>
                      {available && (
                        <ActionForm action={redeemCareAction} confirm={`Redeem “${s.name}” for ${card.customer.name}?`} className="flex gap-2">
                          <input type="hidden" name="cardId" value={card.id} />
                          <input type="hidden" name="serviceId" value={s.id} />
                          <input name="note" placeholder="Note (optional)" aria-label="Note" className="field !w-40 !py-1.5" />
                          <Submit variant="gold">Redeem</Submit>
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel title="Recent redemptions" className="mt-6">
        <Table head={["When", "Card", "Customer", "Service", "Employee"]} empty="No redemptions yet.">
          {recent.map((r) => (
            <tr key={r.id}>
              <Td className="text-xs text-muted">{dt(r.createdAt)}</Td>
              <Td><Link href={`/admin/care-cards?q=${r.careCard.number}`} className="font-mono text-xs text-blue">{r.careCard.number}</Link></Td>
              <Td>{r.customer.name}</Td>
              <Td>{r.service.name}</Td>
              <Td>{r.staff.name}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
