import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireStaff } from "@/lib/staff";
import { discardDrafts, getDrafts, saveDraft } from "@/lib/site-content";
import { KEY_RE } from "@/lib/site-content-types";

/** Website editor (owner only): read drafts, save a draft for one spot, discard drafts. */
async function guard(fn: (staffId: string) => Promise<Response>) {
  try {
    const staff = await requireStaff({ superAdmin: true });
    return await fn(staff.id);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof Error && e.message === "That content isn't allowed here") return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}

export async function GET() {
  return guard(async () => {
    const drafts = await getDrafts();
    return NextResponse.json({ drafts: Object.fromEntries(Object.entries(drafts).map(([k, d]) => [k, d.value])) }, { headers: { "Cache-Control": "no-store" } });
  });
}

const Put = z.object({ key: z.string().regex(KEY_RE), kind: z.enum(["TEXT", "MEDIA", "ZONE"]), value: z.unknown().optional(), reset: z.boolean().optional() });

export async function PUT(req: Request) {
  return guard(async (staffId) => {
    const p = Put.safeParse(await req.json().catch(() => null));
    if (!p.success) return NextResponse.json({ error: "Invalid change" }, { status: 400 });
    await saveDraft({ ...p.data, staffId });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return guard(async () => {
    const key = new URL(req.url).searchParams.get("key") ?? undefined;
    if (key && !KEY_RE.test(key)) return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    await discardDrafts(key);
    return NextResponse.json({ ok: true });
  });
}
