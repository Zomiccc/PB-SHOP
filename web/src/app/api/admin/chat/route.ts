import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/staff";
import { AttachmentError, inspectUpload, saveAttachment } from "@/lib/attachments";
import { loadThread, messageInclude, previewOf, toDTO, voiceMeta } from "@/lib/chat";
import { notifyVisitor } from "@/lib/push";

async function staffOr401() {
  const staff = await getStaff();
  return staff && !staff.mustChangePassword ? staff : null;
}

/** Staff side of a chat thread; opening it marks the customer's messages as read. */
export async function GET(req: Request) {
  const staff = await staffOr401();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  // Summary for background alerts: the latest customer message per recent conversation.
  if (!id && url.searchParams.get("summary") === "1") {
    const rows = await db.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, staffReadAt: true, messages: { where: { from: "VISITOR" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, kind: true, body: true, createdAt: true } } },
    });
    const latest = rows.filter((r) => r.messages[0]).map((r) => ({ conversationId: r.id, messageId: r.messages[0].id, preview: previewOf(r.messages[0].kind, r.messages[0].body), unread: !r.staffReadAt || r.messages[0].createdAt > r.staffReadAt }));
    return NextResponse.json({ latest });
  }
  if (!id || !(await db.chatConversation.findUnique({ where: { id }, select: { id: true } }))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ messages: await loadThread(id, "STAFF", url.searchParams.get("read") !== "0") });
}

/**
 * Staff message to a customer: text (JSON) or a file / voice note (multipart).
 * The customer gets a phone / browser notification if they enabled it (master brief §13).
 */
export async function POST(req: Request) {
  const staff = await staffOr401();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const multipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  const form = multipart ? await req.formData().catch(() => null) : null;
  const json = multipart ? null : ((await req.json().catch(() => null)) as { conversationId?: string; body?: string } | null);
  const conversationId = String(form?.get("conversationId") ?? json?.conversationId ?? "");
  const convo = conversationId ? await db.chatConversation.findUnique({ where: { id: conversationId } }) : null;
  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  let msgId: string;
  if (form) {
    const file = form.get("file");
    const voice = form.get("kind") === "VOICE";
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose a file" }, { status: 400 });
    try {
      await inspectUpload(file, voice ? "VOICE_NOTE" : "CHAT_FILE");
    } catch (e) {
      if (e instanceof AttachmentError) return NextResponse.json({ error: e.message }, { status: 422 });
      throw e;
    }
    const meta = voice ? voiceMeta(form.get("durationSec"), form.get("waveform")) : null;
    msgId = await db.$transaction(async (tx) => {
      const m = await tx.chatMessage.create({ data: { conversationId, from: "STAFF", staffId: staff.id, kind: voice ? "VOICE" : "FILE", body: voice ? "Voice note" : file.name.slice(0, 120), ...(meta ?? {}) } });
      await saveAttachment(file, { kind: voice ? "VOICE_NOTE" : "CHAT_FILE", chatMessageId: m.id, uploadedById: staff.id, sensitive: false }, tx);
      return m.id;
    });
  } else {
    const body = String(json?.body ?? "").trim().slice(0, 2000);
    if (!body) return NextResponse.json({ error: "Write a message" }, { status: 400 });
    msgId = (await db.chatMessage.create({ data: { conversationId, from: "STAFF", staffId: staff.id, body } })).id;
  }
  await db.chatConversation.update({ where: { id: conversationId }, data: { status: "HANDED_OFF", updatedAt: new Date(), staffReadAt: new Date() } });
  const msg = await db.chatMessage.findUniqueOrThrow({ where: { id: msgId }, include: messageInclude });
  const pushed = await notifyVisitor(conversationId, previewOf(msg.kind, msg.body)).catch(() => 0);
  return NextResponse.json({ message: toDTO(msg), pushed }, { status: 201 });
}
