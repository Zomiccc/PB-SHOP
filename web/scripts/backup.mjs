// Backup strategy (§10): run nightly (cron / GitHub Action / Vercel Cron → server).
//   node scripts/backup.mjs
// SQLite: copies the database file. PostgreSQL: runs pg_dump (must be installed).
// Always also writes a portable JSON export of business-critical tables.
// If STORAGE_BUCKET is set, the backup is uploaded to object storage under backups/.
import { mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.join(process.cwd(), "backups", stamp);
await mkdir(dir, { recursive: true });

if (url.startsWith("file:")) {
  const file = path.resolve("prisma", url.replace("file:", ""));
  await copyFile(file, path.join(dir, "database.sqlite"));
} else if (url.startsWith("postgres")) {
  execFileSync("pg_dump", ["--no-owner", "--format=custom", "--file", path.join(dir, "database.dump"), url], { stdio: "inherit" });
}

const db = new PrismaClient();
const tables = ["product", "variant", "stockMovement", "order", "orderItem", "payment", "repairRequest", "repairStatusChange", "customer", "loyaltyTransaction", "careCard", "careCardRedemption", "careCardService", "note", "auditLog", "staffLoginEvent", "setting", "reward"];
const dump = {};
for (const t of tables) dump[t] = await db[t].findMany();
await db.$disconnect();
await writeFile(path.join(dir, "export.json"), JSON.stringify(dump));
console.log(`Backup written to ${dir}`);

if (process.env.STORAGE_BUCKET) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "" },
  });
  for (const f of ["export.json", "database.sqlite", "database.dump"]) {
    try {
      const body = await readFile(path.join(dir, f));
      await client.send(new PutObjectCommand({ Bucket: process.env.BACKUP_BUCKET ?? process.env.STORAGE_BUCKET, Key: `backups/${stamp}/${f}`, Body: body }));
      console.log(`Uploaded backups/${stamp}/${f}`);
    } catch {}
  }
}
