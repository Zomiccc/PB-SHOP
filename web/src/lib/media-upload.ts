import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

/**
 * Large public media (broadcast videos and pictures, v6 §2) uploaded in pieces, so no single request goes
 * over hosting body limits (Vercel ≈ 4.5 MB). Pieces are kept in the database (MediaChunk) and served by
 * /api/media/[id] with Range support (needed for video playback); with STORAGE_BUCKET set, the finished
 * file is moved to object storage instead.
 */

export const CHUNK_SIZE = 3 * 1024 * 1024;

export const MEDIA_LIMITS: Record<string, number> = {
  "image/jpeg": 10 * 1024 * 1024,
  "image/png": 10 * 1024 * 1024,
  "image/webp": 10 * 1024 * 1024,
  "image/gif": 10 * 1024 * 1024,
  "video/mp4": 60 * 1024 * 1024,
  "video/webm": 60 * 1024 * 1024,
  "video/quicktime": 60 * 1024 * 1024,
};

export class MediaUploadError extends Error {}

export const mediaKind = (mime: string) => (mime.startsWith("video/") ? "VIDEO" : "IMAGE");
const chunkCount = (size: number) => Math.max(1, Math.ceil(size / CHUNK_SIZE));

/** Checks the file's first bytes really are the declared kind of image / video. */
export function sniffMedia(head: Buffer, mime: string) {
  const ascii = (a: number, b: number) => head.toString("ascii", a, b);
  switch (mime) {
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/gif":
      return ascii(0, 4) === "GIF8";
    case "video/mp4":
    case "video/quicktime":
      return ascii(4, 8) === "ftyp";
    case "video/webm":
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    default:
      return false;
  }
}

export async function startUpload(input: { fileName: string; mimeType: string; size: number; folder: string }) {
  const limit = MEDIA_LIMITS[input.mimeType];
  if (!limit) throw new MediaUploadError("Use a JPG, PNG, WebP or GIF picture, or an MP4, WebM or MOV video");
  if (!Number.isInteger(input.size) || input.size <= 0) throw new MediaUploadError("The file is empty");
  if (input.size > limit) throw new MediaUploadError(`Too large — ${mediaKind(input.mimeType) === "VIDEO" ? "videos" : "pictures"} can be up to ${limit / 1024 / 1024} MB`);
  // Tidy up uploads that were abandoned more than a day ago.
  await db.mediaFile.deleteMany({ where: { complete: false, createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
  const ext = (input.fileName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const m = await db.mediaFile.create({
    data: { folder: input.folder.replace(/[^a-z0-9/_-]/gi, ""), fileName: `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`, mimeType: input.mimeType, size: input.size, chunked: true, complete: false },
    select: { id: true },
  });
  return { id: m.id, chunkSize: CHUNK_SIZE, chunks: chunkCount(input.size) };
}

export async function putChunk(id: string, idx: number, bytes: Buffer) {
  const m = await db.mediaFile.findUnique({ where: { id }, select: { size: true, complete: true, chunked: true } });
  if (!m || !m.chunked || m.complete) throw new MediaUploadError("Upload not found");
  const total = chunkCount(m.size);
  if (!Number.isInteger(idx) || idx < 0 || idx >= total) throw new MediaUploadError("Bad piece number");
  const expected = idx === total - 1 ? m.size - CHUNK_SIZE * (total - 1) : CHUNK_SIZE;
  if (bytes.length !== expected) throw new MediaUploadError("Piece size doesn't match");
  await db.mediaChunk.upsert({ where: { mediaId_idx: { mediaId: id, idx } }, create: { mediaId: id, idx, data: new Uint8Array(bytes) }, update: { data: new Uint8Array(bytes) } });
}

/** Verifies every piece arrived and the content is what it claims, then publishes the file. Returns its URL. */
export async function finishUpload(id: string) {
  const m = await db.mediaFile.findUnique({ where: { id }, include: { chunks: { select: { idx: true }, orderBy: { idx: "asc" } } } });
  if (!m || !m.chunked) throw new MediaUploadError("Upload not found");
  if (m.complete) return { url: `/api/media/${m.id}`, type: mediaKind(m.mimeType) };
  if (m.chunks.length !== chunkCount(m.size)) throw new MediaUploadError("Some pieces are missing — try the upload again");
  const first = await db.mediaChunk.findUniqueOrThrow({ where: { mediaId_idx: { mediaId: id, idx: 0 } } });
  if (!sniffMedia(Buffer.from(first.data), m.mimeType)) {
    await db.mediaFile.delete({ where: { id } });
    throw new MediaUploadError("That file isn't a valid picture or video");
  }
  if (process.env.STORAGE_BUCKET) {
    const parts = await db.mediaChunk.findMany({ where: { mediaId: id }, orderBy: { idx: "asc" } });
    const body = Buffer.concat(parts.map((p) => Buffer.from(p.data)));
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.STORAGE_REGION ?? "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "" },
    });
    const key = `${m.folder}/${m.fileName}`;
    await client.send(new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: key, Body: body, ContentType: m.mimeType, CacheControl: "public, max-age=31536000, immutable" }));
    await db.mediaFile.delete({ where: { id } });
    return { url: `${(process.env.STORAGE_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`, type: mediaKind(m.mimeType) };
  }
  await db.mediaFile.update({ where: { id }, data: { complete: true } });
  return { url: `/api/media/${m.id}`, type: mediaKind(m.mimeType) };
}
