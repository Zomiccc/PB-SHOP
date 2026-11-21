import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { ACCESSORY_TYPES } from "./constants";
import { SETTING_DEFAULTS, getSetting, type SettingKey } from "./settings";
import type { ExpenseKind } from "./expenses";

type Client = Prisma.TransactionClient | typeof db;

/** Built-in accessory categories plus the ones the shop created itself (stored by their name). */
export async function accessoryCategories(client: Client = db) {
  const { custom } = await getSetting("accessoryCategories", client);
  return [...Object.entries(ACCESSORY_TYPES).map(([key, label]) => ({ key, label: label as string })), ...custom.map((c) => ({ key: c, label: c }))];
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 40);

async function saveSetting(client: Client, key: SettingKey, value: unknown) {
  await client.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
}

/**
 * The accessory category from a form: "+ Create new category" (field `newCategory`) adds it to the list,
 * otherwise a known category is kept and anything else falls back to Other.
 */
export async function resolveAccessoryCategory(f: FormData, client: Client = db) {
  const typed = clean(String(f.get("newCategory") ?? ""));
  const picked = String(f.get("accessoryType") ?? "");
  const list = await accessoryCategories(client);
  if (picked === "__new__" || (typed && !picked)) {
    if (typed.length < 2) throw new Error("Type the new category name");
    const existing = list.find((c) => c.label.toLowerCase() === typed.toLowerCase());
    if (existing) return existing.key;
    const { custom } = await getSetting("accessoryCategories", client);
    await saveSetting(client, "accessoryCategories", { custom: [...custom, typed] });
    return typed;
  }
  return list.some((c) => c.key === picked) ? picked : "OTHER";
}

/** Expense categories for a kind; a new one typed in the form is added to that list. */
export async function resolveExpenseCategory(kind: ExpenseKind, picked: string, typed: string, client: Client = db) {
  const cats = await getSetting("expenseCategories", client);
  const list = cats[kind] ?? SETTING_DEFAULTS.expenseCategories[kind] ?? [];
  const name = clean(picked === "__new__" ? typed : picked);
  if (name.length < 2) throw new Error(picked === "__new__" ? "Type the new category name" : "Choose a category");
  const existing = list.find((c) => c.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  await saveSetting(client, "expenseCategories", { ...cats, [kind]: [...list, name] });
  return name;
}
