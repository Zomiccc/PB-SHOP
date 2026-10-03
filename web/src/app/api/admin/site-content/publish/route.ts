import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AuthError, clientIp, requireStaff } from "@/lib/staff";
import { publishDrafts } from "@/lib/site-content";

/** Website editor: Publish — every draft goes live for all visitors at once (owner only, audited). */
export async function POST() {
  try {
    const staff = await requireStaff({ superAdmin: true });
    const count = await db.$transaction(async (tx) => {
      const n = await publishDrafts(tx);
      if (n) await audit({ staffId: staff.id, action: "WEBSITE_PUBLISHED", entityType: "WEBSITE", recordLabel: `${n} change(s)`, ip: await clientIp() }, tx);
      return n;
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, published: count });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
