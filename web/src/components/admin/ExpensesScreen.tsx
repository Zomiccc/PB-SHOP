import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { requireStaffPage } from "@/lib/staff";
import { EXPENSE_KINDS, pktDay, pktMonthStart, pktNextMonth, type ExpenseKind } from "@/lib/expenses";
import { addExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/admin/_actions/expenses";
import { Field, PageTitle, Panel, Stat } from "./Primitives";
import { ActionForm, Submit } from "./ui";
import { CategorySelect } from "./CategorySelect";

/**
 * Daily Expenses / Repair Parts & Tools Expenses (Nov 2026): a short form (date, category, amount, note) for any
 * staff member, the month's entries by day with daily totals, and owner-only edit / delete (audited).
 */
export async function ExpensesScreen({ kind, month: monthParam }: { kind: ExpenseKind; month?: string }) {
  const staff = await requireStaffPage();
  const owner = staff.role === "SUPER_ADMIN";
  const today = pktDay(new Date());
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const prev = (() => {
    const [y, m] = month.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  })();
  const [rows, cats] = await Promise.all([
    db.expense.findMany({ where: { kind, date: { gte: pktMonthStart(month), lt: pktMonthStart(pktNextMonth(month)) } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { staff: { select: { name: true } } } }),
    getSetting("expenseCategories"),
  ]);
  const options = (cats[kind] ?? []).map((c) => ({ key: c, label: c }));
  const info = EXPENSE_KINDS[kind];
  const days = new Map<string, typeof rows>();
  for (const r of rows) days.set(pktDay(r.date), [...(days.get(pktDay(r.date)) ?? []), r]);
  const monthTotal = rows.reduce((s, r) => s + r.amount, 0);
  const todayTotal = (days.get(today) ?? []).reduce((s, r) => s + r.amount, 0);
  const monthName = pktMonthStart(month).toLocaleDateString("en-PK", { month: "long", year: "numeric", timeZone: "Asia/Karachi" });
  const dayName = (d: string) => new Date(`${d}T12:00:00+05:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Karachi" });

  return (
    <>
      <PageTitle title={info.title} sub={owner ? "Anyone can add an expense. You can edit or delete entries — every change is in the audit log." : "Add each expense as it happens. Only the owner can edit or delete entries."} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Panel title="Add an expense">
          <ActionForm action={addExpenseAction} resetOnSuccess className="grid gap-4">
            <input type="hidden" name="kind" value={kind} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date"><input name="date" type="date" required defaultValue={today} max={today} className="field !py-3" /></Field>
              <Field label="Amount (Rs)"><input name="amount" type="number" inputMode="numeric" min={1} required className="field !py-3 text-lg" /></Field>
            </div>
            <Field label="Category"><CategorySelect name="category" options={options} className="field !py-3" /></Field>
            <Field label="Note (optional)"><input name="note" maxLength={200} placeholder={kind === "REPAIR" ? "e.g. 2 × Infinix Hot 60 battery" : "e.g. October electricity bill"} className="field !py-3" /></Field>
            <Submit variant="gold" className="!py-3.5 !text-base">Save expense</Submit>
          </ActionForm>
        </Panel>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Today" value={pkr(todayTotal)} />
            <Stat label={monthName} value={pkr(monthTotal)} hint={`${rows.length} entr${rows.length === 1 ? "y" : "ies"}`} />
          </div>
          <Panel
            title={`Entries — ${monthName}`}
            action={
              <span className="flex gap-3 text-sm">
                <Link href={`${info.href}?month=${prev}`} className="text-blue">← Earlier</Link>
                {month < today.slice(0, 7) && <Link href={`${info.href}?month=${pktNextMonth(month)}`} className="text-blue">Later →</Link>}
              </span>
            }
          >
            {rows.length === 0 ? (
              <p className="text-sm text-muted">No expenses recorded this month.</p>
            ) : (
              <div className="space-y-5">
                {[...days.entries()].map(([d, list]) => (
                  <div key={d}>
                    <p className="mb-2 flex justify-between border-b border-ink/10 pb-1 text-sm font-semibold">
                      <span>{dayName(d)}</span>
                      <span>{pkr(list.reduce((s, r) => s + r.amount, 0))}</span>
                    </p>
                    <ul className="space-y-1.5">
                      {list.map((r) => (
                        <li key={r.id} className="text-sm">
                          <details className="group rounded-lg px-2 py-1.5 open:bg-cream/40">
                            <summary className={owner ? "flex cursor-pointer items-center gap-3" : "pointer-events-none flex items-center gap-3"}>
                              <span className="min-w-0 flex-1">
                                <b>{r.category}</b>
                                {r.note && <span className="text-muted"> · {r.note}</span>}
                                <span className="block text-xs text-muted">by {r.staff.name}</span>
                              </span>
                              <b>{pkr(r.amount)}</b>
                              {owner && <span className="text-xs text-blue group-open:hidden">Edit</span>}
                            </summary>
                            {owner && (
                              <div className="mt-3 space-y-2">
                                <ActionForm action={updateExpenseAction} className="grid gap-2 sm:grid-cols-2">
                                  <input type="hidden" name="id" value={r.id} />
                                  <input name="date" type="date" required defaultValue={pktDay(r.date)} aria-label="Date" className="field !py-2" />
                                  <input name="amount" type="number" min={1} required defaultValue={r.amount} aria-label="Amount" className="field !py-2" />
                                  <div><CategorySelect name="category" options={options.some((o) => o.key === r.category) ? options : [...options, { key: r.category, label: r.category }]} defaultValue={r.category} className="field !py-2" /></div>
                                  <input name="note" defaultValue={r.note ?? ""} aria-label="Note" className="field !py-2" />
                                  <Submit className="sm:col-span-2">Save changes</Submit>
                                </ActionForm>
                                <ActionForm action={deleteExpenseAction} confirm="Delete this expense? It stays in the audit log.">
                                  <input type="hidden" name="id" value={r.id} />
                                  <Submit variant="ghost">Delete</Submit>
                                </ActionForm>
                              </div>
                            )}
                          </details>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
