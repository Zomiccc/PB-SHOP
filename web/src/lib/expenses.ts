import { db } from "./db";

export type ExpenseKind = "DAILY" | "REPAIR" | "GIFT";
export const EXPENSE_KINDS: Record<ExpenseKind, { title: string; short: string; href: string }> = {
  DAILY: { title: "Daily Expenses", short: "Daily expenses", href: "/admin/expenses" },
  REPAIR: { title: "Repair Parts & Tools Expenses", short: "Repair parts & tools", href: "/admin/repair-expenses" },
  // Part 2: gifts handed to customers (rewards) — counted as an expense in Reports.
  GIFT: { title: "Rewards Gifting", short: "Rewards gifting", href: "/admin/rewards-gifting" },
};

const PKT = 5 * 3600_000;
/** "YYYY-MM-DD" of a moment, in Pakistan time. */
export const pktDay = (d: Date) => new Date(d.getTime() + PKT).toISOString().slice(0, 10);
/** Start of a Pakistan day / month, as an instant. */
export const pktDayStart = (day: string) => new Date(`${day}T00:00:00+05:00`);
export const pktMonthStart = (month: string) => new Date(`${month}-01T00:00:00+05:00`);
export function pktNextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
/** An expense's day is stored at noon PKT, so it never slips into the day before or after. */
export const expenseDate = (day: string) => new Date(`${day}T12:00:00+05:00`);

/** Today's and this month's expenses (both kinds), for the reports page. */
export async function expenseTotals(now = new Date()) {
  const today = pktDay(now);
  const month = today.slice(0, 7);
  const rows = await db.expense.findMany({ where: { date: { gte: pktMonthStart(month), lt: pktMonthStart(pktNextMonth(month)) } }, select: { kind: true, date: true, amount: true, category: true } });
  const sum = (list: typeof rows) => list.reduce((s, r) => s + r.amount, 0);
  const todays = rows.filter((r) => pktDay(r.date) === today);
  const byCategory = new Map<string, number>();
  const prefix = (k: string) => (k === "REPAIR" ? "Repair · " : k === "GIFT" ? "Gift · " : "");
  for (const r of rows) byCategory.set(`${prefix(r.kind)}${r.category}`, (byCategory.get(`${prefix(r.kind)}${r.category}`) ?? 0) + r.amount);
  return {
    today: { total: sum(todays), daily: sum(todays.filter((r) => r.kind === "DAILY")), repair: sum(todays.filter((r) => r.kind === "REPAIR")), gift: sum(todays.filter((r) => r.kind === "GIFT")) },
    month: { label: month, total: sum(rows), daily: sum(rows.filter((r) => r.kind === "DAILY")), repair: sum(rows.filter((r) => r.kind === "REPAIR")), gift: sum(rows.filter((r) => r.kind === "GIFT")) },
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
  };
}
