import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { Badge, Field, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { NotesList } from "@/components/admin/NotesList";
import { addNoteAction, cancelOrReturnAction, markPaidAction, setFulfilmentAction } from "../../../_actions/operations";

export const metadata = { title: "Order" };

export default async function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: true } },
      payments: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      movements: { orderBy: { createdAt: "asc" }, include: { staff: true, variant: true } },
      careCard: true,
      loyaltyTx: true,
      customer: true,
      staff: true,
    },
  });
  if (!o) notFound();
  const closed = ["CANCELLED", "RETURNED"].includes(o.fulfilmentStatus);
  const audit = await db.auditLog.findMany({ where: { entityType: "ORDER", entityId: o.id }, orderBy: { createdAt: "asc" }, include: { staff: true } });

  return (
    <>
      <PageTitle title={`Order ${o.number}`} sub={`${o.channel === "POS" ? "In-store sale" : "Online order"} · ${dt(o.createdAt)}${o.staff ? ` · by ${o.staff.name}` : ""}`}>
        <Link href={`/admin/orders/${o.id}/receipt`} target="_blank" className="btn btn-ghost !py-2.5 !text-sm text-navy-950"><span>Print receipt</span></Link>
        <Link href="/admin/orders" className="text-sm text-blue">← Orders</Link>
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-ink/5 text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2.5">
                  <span>{i.qty} × {i.name} <span className="font-mono text-xs text-muted">{i.sku}</span></span>
                  <b>{pkr(i.unitPrice * i.qty)}</b>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
              <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{pkr(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-muted"><dt>Discount</dt><dd>−{pkr(o.discount)}</dd></div>}
              <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>{o.shippingFee ? pkr(o.shippingFee) : "Free"}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{pkr(o.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Payments (§3)">
            {o.payments.map((p) => (
              <div key={p.id} className="grid gap-2 rounded-xl bg-cream p-3 text-sm sm:grid-cols-4">
                <div><span className="label !mb-0">Provider</span>{p.provider}</div>
                <div><span className="label !mb-0">Method</span>{p.method ?? "—"}</div>
                <div><span className="label !mb-0">Status</span><Badge tone={statusTone(p.status)}>{p.status}</Badge></div>
                <div><span className="label !mb-0">Txn reference</span><span className="font-mono text-xs">{p.providerRef ?? "—"}</span></div>
                <div className="sm:col-span-4 text-xs text-muted">Amount {pkr(p.amount)} · created {dt(p.createdAt)}{p.verifiedAt ? ` · verified ${dt(p.verifiedAt)}` : ""}</div>
              </div>
            ))}
          </Panel>

          <Panel title="Sale notes (§17)">
            <ActionForm action={addNoteAction} resetOnSuccess className="mb-4 space-y-2">
              <input type="hidden" name="kind" value="SALE" />
              <input type="hidden" name="orderId" value={o.id} />
              {o.customerId && <input type="hidden" name="customerId" value={o.customerId} />}
              <textarea name="body" rows={2} placeholder="What was sold, special instructions, anything the team should know…" className="field" />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="important" className="h-4 w-4" /> Important</label>
                <Submit>Add note</Submit>
              </div>
            </ActionForm>
            <NotesList notes={o.notes} />
          </Panel>

          <Panel title="History">
            <ul className="space-y-2 text-sm">
              {o.movements.map((m) => (
                <li key={m.id} className="flex gap-3"><span className="w-36 shrink-0 text-xs text-muted">{dt(m.createdAt)}</span><span>Stock {m.type.toLowerCase()} {m.qtyChange > 0 ? "+" : ""}{m.qtyChange} · {m.variant.sku} → {m.qtyAfter} · {m.staff?.name ?? "system"}</span></li>
              ))}
              {audit.map((a) => (
                <li key={a.id} className="flex gap-3"><span className="w-36 shrink-0 text-xs text-muted">{dt(a.createdAt)}</span><span>{a.action.replaceAll("_", " ").toLowerCase()} · {a.staff?.name ?? "system"}</span></li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone={statusTone(o.paymentStatus)}>Payment: {o.paymentStatus}</Badge>
              <Badge tone={statusTone(o.fulfilmentStatus)}>Fulfilment: {o.fulfilmentStatus.replace("_", " ")}</Badge>
            </div>
            {!closed && (
              <ActionForm action={setFulfilmentAction} className="flex gap-2">
                <input type="hidden" name="orderId" value={o.id} />
                <select name="status" defaultValue={o.fulfilmentStatus} aria-label="Fulfilment status" className="field">
                  {["NEW", "PROCESSING", "READY", "SHIPPED", "COMPLETED", "ON_HOLD"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                <Submit>Update</Submit>
              </ActionForm>
            )}
            {o.paymentStatus !== "PAID" && o.stockCommitted && !closed && (
              <ActionForm action={markPaidAction} className="mt-4 space-y-2 rounded-xl bg-gold/10 p-3" confirm="Confirm payment was received?">
                <p className="text-sm font-semibold">Payment received (COD / manual)</p>
                <input type="hidden" name="orderId" value={o.id} />
                <input name="ref" placeholder="Receipt / reference (optional)" className="field" />
                <Submit variant="gold">Mark as paid</Submit>
              </ActionForm>
            )}
          </Panel>

          <Panel title="Customer">
            <p className="font-semibold">{o.customerName}</p>
            <p className="text-sm">{o.customerPhone}{o.customerEmail ? ` · ${o.customerEmail}` : ""}</p>
            {o.shippingAddress && <p className="mt-2 text-sm text-muted">{o.shippingAddress}, {o.city}</p>}
            <p className="mt-2 text-xs text-muted">{o.fulfilment === "PICKUP" ? "Collect in store" : o.fulfilment === "IN_STORE" ? "Sold in store" : "Home delivery"}</p>
            {o.customer && <Link href={`/admin/customers/${o.customer.id}`} className="mt-3 inline-block text-sm text-blue">Passport {o.customer.passportNo} →</Link>}
            {o.careCard && <p className="mt-3"><Badge tone="navy">Care Card {o.careCard.number}</Badge></p>}
            {o.loyaltyTx.length > 0 && <p className="mt-2 text-sm">Points: {o.loyaltyTx.map((t) => (t.points > 0 ? `+${t.points}` : t.points)).join(", ")}</p>}
            {o.socialProofLabel && <p className="mt-2 text-xs text-muted">Social-proof label: “{o.socialProofLabel}”</p>}
          </Panel>

          {!closed && (
            <Panel title="Cancel or return">
              <ActionForm action={cancelOrReturnAction} className="space-y-3" confirm="Finalise this? Stock will be restored and points reversed.">
                <input type="hidden" name="orderId" value={o.id} />
                <Field label="Type">
                  <select name="kind" className="field">
                    <option value="RETURN">Return (item came back)</option>
                    <option value="CANCEL">Cancel (never fulfilled)</option>
                  </select>
                </Field>
                <Field label="Reason"><input name="reason" required className="field" /></Field>
                <Submit variant="red">Finalise</Submit>
                <p className="text-xs text-muted">Refund the customer through the original payment method; stock and loyalty are updated automatically.</p>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
