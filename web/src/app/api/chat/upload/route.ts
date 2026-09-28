import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { AttachmentError, inspectUpload, saveAttachment } from "@/lib/attachments";
import { messageInclude, previewOf, toDTO, voiceMeta } from "@/lib/chat";
import { notifyStaffChat } from "@/lib/push";

/** Customer sends a file or a voice note in the chat (master brief §13). */
export async function POST(req: Request) {
  if (!rateLimit(`chat-upload:${ipFrom(req)}`, 12, 10 * 60_000).ok) return NextResponse.json({ error: "Too many uploads — please wait a few minutes." }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const conversationId = String(form?.get("conversationId") ?? "");
  const voice = form?.get("kind") === "VOICE";
  if (!form || !(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose a file" }, { status: 400 });

  let convo = conversationId ? await db.chatConversation.findUnique({ where: { id: conversationId } }) : null;
  if (!convo) convo = await db.chatConversation.create({ data: { visitorId: crypto.randomUUID() } });

  try {
    await inspectUpload(file, voice ? "VOICE_NOTE" : "CHAT_FILE");
  } catch (e) {
    if (e instanceof AttachmentError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
  const meta = voice ? voiceMeta(form.get("durationSec"), form.get("waveform")) : null;
  const msg = await db.$transaction(async (tx) => {
    const m = await tx.chatMessage.create({ data: { conversationId: convo.id, from: "VISITOR", kind: voice ? "VOICE" : "FILE", body: voice ? "Voice note" : file.name.slice(0, 120), ...(meta ?? {}) } });
    await saveAttachment(file, { kind: voice ? "VOICE_NOTE" : "CHAT_FILE", chatMessageId: m.id, sensitive: false }, tx);
    await tx.chatConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
    return tx.chatMessage.findUniqueOrThrow({ where: { id: m.id }, include: messageInclude });
  });
  await notifyStaffChat(convo.id, previewOf(msg.kind, msg.body)).catch(() => 0);
  return NextResponse.json({ conversationId: convo.id, message: toDTO(msg) }, { status: 201 });
}
