import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * File storage for uploads (repair photos, product photos, 6-view 3D source photos, GLB models).
 *
 * Production: set STORAGE_BUCKET (+ STORAGE_ENDPOINT for Cloudflare R2, STORAGE_REGION,
 * STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_PUBLIC_URL) and uploads go to
 * S3-compatible object storage. Without it (local dev) files are written to /public/uploads.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export class UploadError extends Error {}
/** No object storage configured and the server disk is read-only (e.g. a Vercel demo). */
export class StorageUnavailableError extends UploadError {}

export async function saveUpload(file: File, folder: string, opts: { maxBytes?: number; types?: string[] } = {}) {
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024;
  const types = opts.types ?? IMAGE_TYPES;
  if (!types.includes(file.type)) throw new UploadError(`Unsupported file type: ${file.type || "unknown"}`);
  if (file.size > maxBytes) throw new UploadError(`File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)`);

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
  const body = Buffer.from(await file.arrayBuffer());

  if (process.env.STORAGE_BUCKET) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.STORAGE_REGION ?? "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "" },
    });
    const key = `${safeFolder}/${name}`;
    await client.send(new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: key, Body: body, ContentType: file.type, CacheControl: "public, max-age=31536000, immutable" }));
    return `${(process.env.STORAGE_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads", safeFolder);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), body);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM" || code === "ENOENT") {
      throw new StorageUnavailableError("File uploads aren't enabled on this server yet (object storage not configured)");
    }
    throw e;
  }
  return `/uploads/${safeFolder}/${name}`;
}
