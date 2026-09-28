import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/staff";
import { ipFrom, rateLimit } from "@/lib/rate-limit";

const Sub = z.object({
  audience: z.enum(["VISITOR", "STAFF"]),
  conversationId: z.string().max(64).nullish(),
  subscription: z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }),
});

/** Turns chat notifications on for this browser (customer: per conversation, staff: per account). */
export async function POST(req: Request) {
  if (!rateLimit(`push:${ipFrom(req)}`, 20, 600_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = Sub.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { audience, conversationId, subscription } = parsed.data;
  // Only push services' https endpoints are accepted.
  if (!subscription.endpoint.startsWith("https://")) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  let staffId: string | null = null;
  if (audience === "STAFF") {
    const staff = await getStaff();
    if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    staffId = staff.id;
  } else if (!conversationId || !(await db.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Start a chat first" }, { status: 400 });
  }
  const data = { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, audience, conversationId: audience === "VISITOR" ? conversationId! : null, staffId };
  await db.pushSubscription.upsert({ where: { endpoint: subscription.endpoint }, create: { endpoint: subscription.endpoint, ...data }, update: data });
  return NextResponse.json({ ok: true });
}

/** Turns notifications off for this browser. */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
