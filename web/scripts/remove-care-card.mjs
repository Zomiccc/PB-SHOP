// One-off, idempotent clean-up for the updated master brief: the Care Card system was removed completely.
// Drops ONLY the three Care Card tables and Product.careCardEligible so `prisma db push` can run without
// --accept-data-loss (which would also allow any other destructive change). Safe to run on every build.
//   node scripts/remove-care-card.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const postgres = /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");

try {
  if (postgres) {
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "CareCardRedemption", "CareCard", "CareCardService" CASCADE`);
    await db.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Product" DROP COLUMN IF EXISTS "careCardEligible"`);
  } else {
    for (const t of ["CareCardRedemption", "CareCard", "CareCardService"]) await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}"`);
    const cols = await db.$queryRawUnsafe(`PRAGMA table_info("Product")`);
    if (cols.some((c) => c.name === "careCardEligible")) await db.$executeRawUnsafe(`ALTER TABLE "Product" DROP COLUMN "careCardEligible"`);
  }
  console.log("Care Card tables removed (if they existed).");
} catch (e) {
  // A brand-new database has nothing to remove.
  console.log("Care Card clean-up skipped:", e instanceof Error ? e.message.split("\n")[0] : e);
} finally {
  await db.$disconnect();
}
