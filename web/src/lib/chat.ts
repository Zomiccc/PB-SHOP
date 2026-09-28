import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { parseJson } from "./format";

/**
 * Chat storage (master brief §13): every message keeps sender, receiver side, timestamp,
 * delivery / read state, and attachment or voice-note metadata.
 */

export type ChatSide = "VISITOR" | "STAFF";

export const messageInclude = {
  attachments: { select: { id: true, fileName: true, mimeType: true, size: true, kind: true } },
  staff: { select: { name: true } },
} satisfies Prisma.ChatMessageInclude;

type Row = Prisma.ChatMessageGetPayload<{ include: typeof messageInclude }>;

export type ChatMessageDTO = {
  id: string;
  from: "VISITOR" | "BOT" | "STAFF";
  kind: "TEXT" | "FILE" | "VOICE";
  body: string;
  staffName: string | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  durationSec: number | null;
  waveform: number[] | null;
  attachments: { id: string; fileName: string; mimeType: string; size: number }[];
};

export function toDTO(m: Row): ChatMessageDTO {
  return {
    id: m.id,
    from: m.from as ChatMessageDTO["from"],
    kind: m.kind as ChatMessageDTO["kind"],
    body: m.body,
    staffName: m.staff?.name ?? null,
    createdAt: m.createdAt.toISOString(),
    deliveredAt: m.deliveredAt?.toISOString() ?? null,
    readAt: m.readAt?.toISOString() ?? null,
    durationSec: m.durationSec,
    waveform: parseJson<number[] | null>(m.waveform, null),
    attachments: m.attachments.map((a) => ({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, size: a.size })),
  };
}

/**
 * Loads a thread for one side and records delivery / read receipts for the other side's messages.
 * `read` = the thread is actually open on screen (not just polled in the background).
 */
export async function loadThread(conversationId: string, viewer: ChatSide, read: boolean) {
  const now = new Date();
  const other = viewer === "VISITOR" ? { from: { in: ["STAFF", "BOT"] } } : { from: "VISITOR" };
  await db.chatMessage.updateMany({ where: { conversationId, ...other, deliveredAt: null }, data: { deliveredAt: now } });
  if (read) {
    await db.chatMessage.updateMany({ where: { conversationId, ...other, readAt: null }, data: { readAt: now } });
    await db.chatConversation.update({ where: { id: conversationId }, data: viewer === "VISITOR" ? { visitorReadAt: now } : { staffReadAt: now } });
  }
  const rows = await db.chatMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 200, include: messageInclude });
  return rows.map(toDTO);
}

/** Validates voice-note metadata sent by the browser recorder. */
export function voiceMeta(durationRaw: unknown, waveformRaw: unknown) {
  const duration = Math.min(300, Math.max(0, Number(durationRaw) || 0));
  let peaks: number[] = [];
  try {
    const parsed = JSON.parse(String(waveformRaw ?? "[]"));
    if (Array.isArray(parsed)) peaks = parsed.slice(0, 64).map((n) => Math.min(1, Math.max(0, Number(n) || 0)));
  } catch {}
  return { durationSec: Math.round(duration * 10) / 10, waveform: JSON.stringify(peaks) };
}

export const previewOf = (kind: string, body: string) => (kind === "VOICE" ? "🎤 Voice note" : kind === "FILE" ? `📎 ${body}` : body.slice(0, 120));
