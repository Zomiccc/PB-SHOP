import { AuthError } from "@/lib/staff";
import type { FormState } from "./auth";

/** Runs a server action body and converts thrown errors into a form message. */
export async function run(fn: () => Promise<string | void>): Promise<FormState> {
  try {
    const message = await fn();
    return { ok: true, message: message || "Saved" };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    if (e instanceof AuthError) return { error: e.message };
    if (e instanceof Error) return { error: e.message };
    return { error: "Something went wrong" };
  }
}

export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const optStr = (f: FormData, k: string) => str(f, k) || null;
export const int = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === "") return null;
  const n = Number(v.replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error(`${k} must be a number`);
  return Math.round(n);
};
export const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

/** Only the fields that changed, for compact before/after audit entries. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}
