import Link from "next/link";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { PHONE_BRANDS, REPAIR_CATEGORIES, REPAIR_STATUSES } from "@/lib/constants";
import { Badge, Field, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { createWalkInRepairAction } from "../../_actions/operations";

export const metadata = { title: "Repairs" };

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

/** Repair board across the §8 workflow columns, plus counter booking for walk-ins. */
export default async function RepairsPage(props: PageProps<"/admin/repairs">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const showDone = sp.done === "1";
  const repairs = await db.repairRequest.findMany({
    where: {
      ...(showDone ? {} : { OR: [{ status: { notIn: ["COMPLETED", "CANCELLED"] } }, { completedAt: { gte: daysAgo(3) } }] }),
      ...(q ? { AND: [{ OR: [{ ref: { contains: q.toUpperCase() } }, { name: like(q) }, { phone: { contains: q.replace(/\D/g, "") || q } }, { model: like(q) }] }] } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { assignedTo: true },
    take: 300,
  });

  return (
    <>
      <PageTitle title="Repairs" sub="New → Received → Diagnosing → Awaiting approval/parts → Repairing → Ready → Completed">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Ref, name, phone, model…" className="field !w-56 !rounded-full !py-2" />
        </form>
        <Link href={showDone ? "/admin/repairs" : "/admin/repairs?done=1"} className="btn btn-ghost !py-2.5 !text-sm text-navy-950"><span>{showDone ? "Hide closed" : "Show all history"}</span></Link>
      </PageTitle>

      <details className="mb-6 rounded-2xl bg-white shadow-[var(--shadow-card)]" open={sp.new === "1"}>
        <summary className="cursor-pointer p-5 font-semibold text-blue">+ Book a walk-in repair at the counter</summary>
        <ActionForm action={createWalkInRepairAction} resetOnSuccess className="grid gap-3 border-t border-ink/10 p-5 md:grid-cols-3">
          <Field label="Customer name"><input name="name" required className="field" /></Field>
          <Field label="Mobile number"><input name="phone" type="tel" required className="field" /></Field>
          <Field label="Brand">
            <select name="brand" required className="field">{PHONE_BRANDS.map((b) => <option key={b}>{b}</option>)}</select>
          </Field>
          <Field label="Model"><input name="model" required className="field" /></Field>
          <Field label="Issue category">
            <select name="category" required className="field">{Object.entries(REPAIR_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
          <Field label="Problem description" className="md:col-span-3"><textarea name="description" rows={2} required className="field" /></Field>
          <div className="md:col-span-3"><Submit variant="red">Create repair (status: Received)</Submit></div>
        </ActionForm>
      </details>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...REPAIR_STATUSES, { key: "CANCELLED", label: "Cancelled" }].map((col) => {
          const items = repairs.filter((r) => r.status === col.key);
          if (col.key === "CANCELLED" && !items.length) return null;
          return (
            <div key={col.key} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">{col.label}</p>
                <Badge>{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((r) => (
                  <Link key={r.id} href={`/admin/repairs/${r.id}`} className="block rounded-xl bg-white p-3 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-red">{r.ref}</span>
                      <span className="text-[0.65rem] text-muted">{dt(r.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{r.brand} {r.model}</p>
                    <p className="text-xs text-muted">{REPAIR_CATEGORIES[r.category as keyof typeof REPAIR_CATEGORIES] ?? r.category} · {r.name}</p>
                    {r.assignedTo && <p className="mt-1 text-[0.65rem] text-blue">→ {r.assignedTo.name}</p>}
                  </Link>
                ))}
                {!items.length && <p className="rounded-xl border border-dashed border-ink/10 p-3 text-center text-xs text-muted">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
      <Panel className="mt-2"><p className="text-sm text-muted">Showing active repairs and those closed in the last 3 days. Customers are notified by WhatsApp/SMS at Received, Awaiting approval, Ready and Completed (once a provider is configured).</p></Panel>
    </>
  );
}
