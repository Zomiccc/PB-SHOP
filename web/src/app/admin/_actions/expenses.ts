"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { resolveExpenseCategory } from "@/lib/categories";
import { EXPENSE_KINDS, expenseDate, type ExpenseKind } from "@/lib/expenses";
import type { FormState } from "./auth";
import { diff, int, optStr, run, str } from "./util";

const kindOf = (f: FormData): ExpenseKind => (str(f, "kind") === "REPAIR" ? "REPAIR" : "DAILY");

async function read(f: FormData, kind: ExpenseKind) {
  const day = str(f, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Choose the date");
  const amount = int(f, "amount");
  if (!amount || amount <= 0) throw new Error("Enter the amount");
  const category = await resolveExpenseCategory(kind, str(f, "category"), str(f, "newCategory"));
  return { date: expenseDate(day), category, amount, note: optStr(f, "note") };
}

/** Any staff member records an expense (Nov 2026). */
export async function addExpenseAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const kind = kindOf(f);
    const data = await read(f, kind);
    const e = await db.expense.create({ data: { ...data, kind, staffId: staff.id } });
    await audit({ staffId: staff.id, action: "EXPENSE_ADDED", entityType: "EXPENSE", entityId: e.id, recordLabel: `${EXPENSE_KINDS[kind].short} · ${data.category}`, after: { ...data, date: str(f, "date") } });
    revalidatePath(EXPENSE_KINDS[kind].href);
    revalidatePath("/admin/reports");
    return `Saved — Rs ${data.amount.toLocaleString("en-PK")} ${data.category}`;
  });
}

/** Owner only: correct an expense. The before / after values go in the audit log. */
export async function updateExpenseAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const before = await db.expense.findUniqueOrThrow({ where: { id: str(f, "id") } });
    const kind = before.kind === "REPAIR" ? "REPAIR" : "DAILY";
    const data = await read(f, kind);
    const d = diff(before as unknown as Record<string, unknown>, data);
    if (!d.changed) return "No changes";
    await db.$transaction(async (tx) => {
      await tx.expense.update({ where: { id: before.id }, data });
      await audit({ staffId: staff.id, action: "EXPENSE_UPDATED", entityType: "EXPENSE", entityId: before.id, recordLabel: `${EXPENSE_KINDS[kind].short} · ${before.category}`, before: d.before, after: d.after }, tx);
    });
    revalidatePath(EXPENSE_KINDS[kind].href);
    revalidatePath("/admin/reports");
    return "Expense updated";
  });
}

/** Owner only: delete an expense (recorded in the audit log with its details). */
export async function deleteExpenseAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const e = await db.expense.findUniqueOrThrow({ where: { id: str(f, "id") } });
    await db.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id: e.id } });
      await audit({ staffId: staff.id, action: "EXPENSE_DELETED", entityType: "EXPENSE", entityId: e.id, recordLabel: `${EXPENSE_KINDS[e.kind as ExpenseKind]?.short ?? e.kind} · ${e.category}`, before: { date: e.date, category: e.category, amount: e.amount, note: e.note } }, tx);
    });
    revalidatePath(EXPENSE_KINDS[e.kind as ExpenseKind]?.href ?? "/admin/expenses");
    revalidatePath("/admin/reports");
    return "Expense deleted";
  });
}
