"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp, requireStaff } from "@/lib/staff";
import { discardDrafts, publishDrafts, saveDraft } from "@/lib/site-content";
import { KEY_RE, type ContentKind } from "@/lib/site-content-types";
import type { FormState } from "./auth";
import { run, str } from "./util";

/** Website editor actions from Admin → Edit website (owner only, audited). */

export async function publishWebsiteAction(): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const n = await db.$transaction(async (tx) => {
      const count = await publishDrafts(tx);
      if (count) await audit({ staffId: staff.id, action: "WEBSITE_PUBLISHED", entityType: "WEBSITE", recordLabel: `${count} change(s)`, ip: await clientIp() }, tx);
      return count;
    });
    revalidatePath("/", "layout");
    return n ? `Published ${n} change${n === 1 ? "" : "s"} — everyone sees them now.` : "Nothing to publish.";
  });
}

export async function discardWebsiteAction(_: FormState, f: FormData): Promise<FormState> {
  await requireStaff({ superAdmin: true });
  return run(async () => {
    const key = str(f, "key");
    if (key && !KEY_RE.test(key)) throw new Error("Unknown item");
    await discardDrafts(key || undefined);
    revalidatePath("/admin/website");
    return key ? "Change undone." : "All unpublished changes thrown away.";
  });
}

/** Puts one edited spot back to the original text / picture (takes effect when published). */
export async function resetWebsiteItemAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff({ superAdmin: true });
  return run(async () => {
    const key = str(f, "key");
    const row = await db.siteContent.findUnique({ where: { key } });
    if (!row) throw new Error("Unknown item");
    await saveDraft({ key, kind: row.kind as ContentKind, reset: true, staffId: staff.id });
    revalidatePath("/admin/website");
    return "Will go back to the original when you publish.";
  });
}
