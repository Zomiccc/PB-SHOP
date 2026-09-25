/**
 * Case-insensitive "contains" filter that works on both SQLite (dev, LIKE is already
 * case-insensitive for ASCII) and PostgreSQL (needs mode: "insensitive").
 */
const pg = (process.env.DATABASE_URL ?? "").startsWith("postgres");

export function like(q: string) {
  return (pg ? { contains: q, mode: "insensitive" } : { contains: q }) as { contains: string };
}
