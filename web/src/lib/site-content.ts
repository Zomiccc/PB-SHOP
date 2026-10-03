import "server-only";
import { cache } from "react";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { RESET, isReset, validValue, type ContentKind, type ContentValue } from "./site-content-types";

type Tx = Prisma.TransactionClient | PrismaClient;

const parse = (s: string | null): unknown => {
  if (s == null) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
};

/** Everything visitors see that the owner has edited (key → value). Read once per request. */
export const getPublishedContent = cache(async (): Promise<Record<string, ContentValue>> => {
  try {
    const rows = await db.siteContent.findMany({ where: { published: { not: null } }, select: { key: true, kind: true, published: true } });
    const out: Record<string, ContentValue> = {};
    for (const r of rows) {
      const v = validValue(r.kind as ContentKind, parse(r.published));
      if (v !== null) out[r.key] = v;
    }
    return out;
  } catch {
    return {}; // e.g. building without a database: the built-in text is shown
  }
});

/** Unpublished changes (key → new value, or RESET). */
export async function getDrafts(tx: Tx = db) {
  const rows = await tx.siteContent.findMany({ where: { draft: { not: null } }, select: { key: true, kind: true, draft: true, updatedAt: true } });
  const out: Record<string, { kind: string; value: unknown; updatedAt: Date }> = {};
  for (const r of rows) out[r.key] = { kind: r.kind, value: parse(r.draft), updatedAt: r.updatedAt };
  return out;
}

/** Saves a draft for one spot (validated). `reset` puts it back to the built-in default on publish. */
export async function saveDraft(input: { key: string; kind: ContentKind; value?: unknown; reset?: boolean; staffId: string }, tx: Tx = db) {
  let draft: string;
  if (input.reset) draft = JSON.stringify(RESET);
  else {
    const v = validValue(input.kind, input.value);
    if (v === null) throw new Error("That content isn't allowed here");
    draft = JSON.stringify(v);
  }
  return tx.siteContent.upsert({
    where: { key: input.key },
    create: { key: input.key, kind: input.kind, draft, updatedById: input.staffId },
    update: { kind: input.kind, draft, updatedById: input.staffId },
  });
}

/** Makes every draft live. Returns how many spots changed. */
export async function publishDrafts(tx: Tx = db) {
  const rows = await tx.siteContent.findMany({ where: { draft: { not: null } } });
  for (const r of rows) {
    const v = parse(r.draft);
    if (isReset(v)) await tx.siteContent.delete({ where: { key: r.key } });
    else await tx.siteContent.update({ where: { key: r.key }, data: { published: r.draft, draft: null } });
  }
  return rows.length;
}

/** Throws away unpublished changes (all, or one spot). */
export async function discardDrafts(key?: string, tx: Tx = db) {
  await tx.siteContent.updateMany({ where: { draft: { not: null }, ...(key ? { key } : {}) }, data: { draft: null } });
  await tx.siteContent.deleteMany({ where: { draft: null, published: null } });
}
