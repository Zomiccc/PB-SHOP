import "server-only";
import crypto from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

/**
 * Secure documents & attachments (master brief §5–§7, §13, §17).
 *
 *  - The file type is checked from the file's own bytes (magic numbers), not the name or browser label.
 *  - Size-limited (4 MB each; photos are compressed in the browser first).
 *  - Stored privately: in the database by default, or in the S3/R2 bucket under private/ when
 *    STORAGE_BUCKET is set. Never given a public URL — /api/files/[id] checks permissions first.
 *  - CNIC / ID images are `sensitive`: only signed-in staff can open them, and every view is audited.
 */

type Tx = Prisma.TransactionClient | PrismaClient;

export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_FILES_PER_FORM = 6;

export class AttachmentError extends Error {}

export type AttachmentKind = "CNIC_FRONT" | "CNIC_BACK" | "OTHER" | "PHOTO" | "CHAT_FILE" | "VOICE_NOTE";

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  { mime: "image/gif", ext: "gif", test: (b) => b.toString("ascii", 0, 4) === "GIF8" },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.toString("ascii", 0, 5) === "%PDF-" },
  { mime: "audio/wav", ext: "wav", test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE" },
  { mime: "audio/ogg", ext: "ogg", test: (b) => b.toString("ascii", 0, 4) === "OggS" },
  { mime: "audio/webm", ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: "audio/mpeg", ext: "mp3", test: (b) => b.toString("ascii", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  // ISO-BMFF: HEIC photos, and MP4/M4A audio (Safari records voice notes as audio/mp4).
  {
    mime: "image/heic",
    ext: "heic",
    test: (b) => b.toString("ascii", 4, 8) === "ftyp" && /^(heic|heix|hevc|mif1|msf1)$/.test(b.toString("ascii", 8, 12)),
  },
  { mime: "audio/mp4", ext: "m4a", test: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  // Office documents are ZIP containers; accepted only with a matching extension.
  { mime: "application/zip", ext: "zip", test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
];

const OFFICE: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Which detected types each kind of upload may contain. */
const ALLOWED: Record<AttachmentKind, string[]> = {
  CNIC_FRONT: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
  CNIC_BACK: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
  PHOTO: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  OTHER: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif", "application/pdf", OFFICE.docx, OFFICE.xlsx],
  CHAT_FILE: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif", "application/pdf", OFFICE.docx, OFFICE.xlsx],
  VOICE_NOTE: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"],
};

/** Detects the real file type from its first bytes. Returns null for anything unrecognised. */
export function sniffType(bytes: Buffer, fileName = "") {
  const hit = SIGNATURES.find((s) => bytes.length >= 12 && s.test(bytes));
  if (!hit) return null;
  if (hit.mime === "application/zip") {
    const ext = fileName.toLowerCase().split(".").pop() ?? "";
    return OFFICE[ext] ? { mime: OFFICE[ext], ext } : null;
  }
  return { mime: hit.mime, ext: hit.ext };
}

export function allowedLabel(kind: AttachmentKind) {
  return kind === "VOICE_NOTE" ? "an audio recording" : kind === "PHOTO" ? "a JPG, PNG, WebP or HEIC photo" : kind.startsWith("CNIC") ? "a photo or PDF of the ID card" : "a photo, PDF, Word or Excel file";
}

export type AttachmentLinks = {
  repairId?: string | null;
  contactMessageId?: string | null;
  installmentSaleId?: string | null;
  usedPurchaseId?: string | null;
  chatMessageId?: string | null;
  orderId?: string | null;
};

/** Validates one uploaded file and returns the bytes + detected type (no writes yet). */
export async function inspectUpload(file: File, kind: AttachmentKind) {
  if (!file || !file.size) throw new AttachmentError("The file is empty");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new AttachmentError(`"${file.name}" is too large — max ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffType(bytes, file.name);
  if (!type || !ALLOWED[kind].includes(type.mime)) throw new AttachmentError(`"${file.name}" isn't allowed here — upload ${allowedLabel(kind)}`);
  const base = (file.name || "file").replace(/\.[^.]+$/, "").replace(/[^\w .-]+/g, "").trim().slice(0, 60) || "file";
  return { bytes, mime: type.mime, fileName: `${base}.${type.ext}` };
}

/** Stores a validated file privately and links it to its record. */
export async function saveAttachment(
  file: File,
  opts: { kind: AttachmentKind; sensitive?: boolean; uploadedById?: string | null } & AttachmentLinks,
  tx: Tx = db,
) {
  const { bytes, mime, fileName } = await inspectUpload(file, opts.kind);
  let storageKey: string | null = null;
  if (process.env.STORAGE_BUCKET) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    storageKey = `private/${opts.kind.toLowerCase()}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    await s3(S3Client).send(new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: storageKey, Body: bytes, ContentType: mime, CacheControl: "private, no-store" }));
  }
  const sensitive = opts.sensitive ?? (opts.kind === "CNIC_FRONT" || opts.kind === "CNIC_BACK");
  return tx.attachment.create({
    data: {
      kind: opts.kind,
      fileName,
      mimeType: mime,
      size: bytes.length,
      sensitive,
      data: storageKey ? null : new Uint8Array(bytes),
      storageKey,
      repairId: opts.repairId ?? null,
      contactMessageId: opts.contactMessageId ?? null,
      installmentSaleId: opts.installmentSaleId ?? null,
      usedPurchaseId: opts.usedPurchaseId ?? null,
      chatMessageId: opts.chatMessageId ?? null,
      orderId: opts.orderId ?? null,
      uploadedById: opts.uploadedById ?? null,
    },
    select: { id: true, kind: true, fileName: true, mimeType: true, size: true },
  });
}

function s3(S3Client: typeof import("@aws-sdk/client-s3").S3Client) {
  return new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "" },
  });
}

/** Loads an attachment's bytes (from the database or the private bucket). */
export async function attachmentBody(a: { data: Uint8Array | null; storageKey: string | null }) {
  if (a.data) return Buffer.from(a.data);
  if (!a.storageKey || !process.env.STORAGE_BUCKET) return null;
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const r = await s3(S3Client).send(new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: a.storageKey }));
  return r.Body ? Buffer.from(await r.Body.transformToByteArray()) : null;
}

/**
 * Who may open a file:
 *  - signed-in staff: everything (sensitive ID documents are audited on every view);
 *  - a customer: only non-sensitive files in their own chat conversation.
 */
export function canViewAttachment(
  a: { sensitive: boolean; chatMessage: { conversationId: string } | null },
  viewer: { staff: boolean; conversationId?: string | null },
) {
  if (viewer.staff) return true;
  if (a.sensitive) return false;
  return !!a.chatMessage && !!viewer.conversationId && a.chatMessage.conversationId === viewer.conversationId;
}

/** Collects the files from a multipart form field, ignoring empty inputs. */
export function filesFrom(form: FormData, field: string) {
  return form.getAll(field).filter((x): x is File => typeof x === "object" && x !== null && "arrayBuffer" in x && (x as File).size > 0);
}
