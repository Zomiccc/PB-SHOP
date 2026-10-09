import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { PAYMENT_ACCOUNTS, isManualMethod } from "@/lib/payment-accounts";
import { Badge, Panel, dt } from "./Primitives";
import { ActionForm, Submit } from "./ui";
import { confirmPaymentAction, rejectPaymentAction } from "@/app/admin/_actions/payments";

const methodLabel = (p?: string | null) => (isManualMethod(p) ? PAYMENT_ACCOUNTS[p].label : p ?? "—");

/** Admin → Inbox → Payments: receipts waiting for a decision, then the latest decisions (client request). */
export async function PaymentReviews() {
  const [waiting, recent] = await Promise.all([
    db.order.findMany({
      where: { paymentStatus: "UNDER_REVIEW" },
      orderBy: { updatedAt: "asc" },
      include: {
        items: { select: { id: true, name: true, qty: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        attachments: { where: { kind: "PAYMENT_PROOF" }, orderBy: { createdAt: "desc" }, select: { id: true, mimeType: true, fileName: true, createdAt: true } },
      },
    }),
    db.payment.findMany({
      where: { status: { in: ["SUCCESS", "REJECTED"] }, submittedAt: { not: null } },
      orderBy: { reviewedAt: "desc" },
      take: 15,
      include: { order: { select: { id: true, number: true, customerName: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      {waiting.length === 0 && (
        <Panel>
          <p className="text-sm text-muted">No payment receipts waiting. When a customer pays by Easypaisa, JazzCash or Faysal Bank and uploads their receipt, it appears here.</p>
        </Panel>
      )}
      {waiting.map((o) => {
        const p = o.payments[0];
        const proof = o.attachments[0];
        return (
          <Panel key={o.id}>
            <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
              <div>
                {proof ? (
                  <a href={`/api/files/${proof.id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10" title="Open the receipt full size">
                    {proof.mimeType.startsWith("image/") && proof.mimeType !== "image/heic" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- private file served by /api/files (staff only)
                      <img src={`/api/files/${proof.id}`} alt={`Payment receipt for ${o.number}`} className="max-h-80 w-full object-contain" />
                    ) : (
                      <span className="flex h-40 items-center justify-center p-4 text-center text-sm text-gold">Open receipt ({proof.fileName})</span>
                    )}
                  </a>
                ) : (
                  <p className="text-sm text-red">No receipt file found.</p>
                )}
                {o.attachments.length > 1 && <p className="mt-1 text-xs text-muted">{o.attachments.length - 1} earlier receipt(s) on this order</p>}
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-sm font-bold text-blue">{o.number}</Link>
                  <Badge tone="gold">Payment under review</Badge>
                  <span className="text-xs text-muted">sent {p?.submittedAt ? dt(p.submittedAt) : "—"}</span>
                </div>
                <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <div><dt className="inline text-muted">Customer: </dt><dd className="inline font-medium">{o.customerName} · {o.customerPhone}</dd></div>
                  <div><dt className="inline text-muted">Paid by: </dt><dd className="inline font-medium">{methodLabel(p?.provider)}</dd></div>
                  <div><dt className="inline text-muted">Amount due: </dt><dd className="inline text-lg font-bold text-gold">{pkr(o.total)}</dd></div>
                  <div><dt className="inline text-muted">Transaction ID: </dt><dd className="inline font-mono">{p?.providerRef ?? "not given"}</dd></div>
                </dl>
                <p className="text-xs text-muted">{o.items.map((i) => `${i.qty} × ${i.name}`).join(" · ")}</p>
                <p className="rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold-soft">Check that {pkr(o.total)} actually arrived in the {methodLabel(p?.provider)} account before confirming.</p>
                <div className="grid gap-3 md:grid-cols-[auto_1fr]">
                  <ActionForm action={confirmPaymentAction} confirm={`Confirm that ${pkr(o.total)} for ${o.number} has been received?`}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <Submit variant="gold">Confirm payment</Submit>
                  </ActionForm>
                  <ActionForm action={rejectPaymentAction} confirm={`Reject this receipt for ${o.number}? The customer will be asked to send a new one.`} className="flex flex-wrap items-start gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input name="reason" maxLength={300} placeholder="Reason (optional) — e.g. amount not received" className="field min-w-0 flex-1 !py-2 text-sm" />
                    <Submit variant="red">Reject</Submit>
                  </ActionForm>
                </div>
              </div>
            </div>
          </Panel>
        );
      })}

      {recent.length > 0 && (
        <Panel title="Recently reviewed">
          <ul className="divide-y divide-ink/10 text-sm">
            {recent.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link href={`/admin/orders/${p.order.id}`} className="font-mono font-semibold text-blue">{p.order.number}</Link> · {p.order.customerName} · {methodLabel(p.provider)} · {pkr(p.amount)}
                  {p.reviewNote && <span className="text-muted"> — “{p.reviewNote}”</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={p.status === "SUCCESS" ? "green" : "red"}>{p.status === "SUCCESS" ? "Confirmed" : "Rejected"}</Badge>
                  <span className="text-xs text-muted">{p.reviewedAt ? dt(p.reviewedAt) : ""}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
