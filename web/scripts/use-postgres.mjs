// Switches the Prisma datasource from SQLite (dev) to PostgreSQL (production).
//   node scripts/use-postgres.mjs && npx prisma db push   (or prisma migrate deploy)
// Set DATABASE_URL to your Neon / Supabase / RDS connection string first.
import { readFile, writeFile } from "node:fs/promises";

const file = "prisma/schema.prisma";
const s = await readFile(file, "utf8");
if (s.includes('provider = "postgresql"')) {
  console.log("Already using PostgreSQL.");
} else {
  await writeFile(file, s.replace('provider = "sqlite"', 'provider = "postgresql"'));
  console.log("Datasource switched to PostgreSQL. Now run: npx prisma generate && npx prisma db push");
}
