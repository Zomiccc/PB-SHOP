import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Hosted Postgres poolers (e.g. Supabase's session pooler, ~15 clients on the free plan) refuse connections past
 * their limit, while Prisma by default opens up to 2 × CPU cores + 1 per server — on a many-core host the busier
 * pages (the homepage runs ~10 queries at once) then fail. Unless the URL already sets one, cap it at 5.
 */
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url) || /[?&]connection_limit=/.test(url)) return undefined;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=5&pool_timeout=20`;
}

const url = databaseUrl();
export const db = globalForPrisma.prisma ?? new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
