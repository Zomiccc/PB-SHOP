// `npm run build` for any host. With a PostgreSQL DATABASE_URL (e.g. Hostinger + Supabase) it first prepares the
// database — switch Prisma to PostgreSQL, create / update the tables, add the starting data once — then builds
// with webpack (Hostinger's build machine can't start Turbopack's CSS worker). Locally (SQLite) it just builds.
// Vercel runs `npm run vercel-build` instead, so it isn't affected.
import { execSync } from "node:child_process";

try {
  process.loadEnvFile(".env"); // hosts that write the variables to .env instead of the environment
} catch {}

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
const url = process.env.DATABASE_URL ?? "";

if (/^postgres(ql)?:\/\//.test(url)) {
  console.log("PostgreSQL database detected — preparing it before the build.");
  run("node scripts/use-postgres.mjs");
  run("npx prisma generate");
  run("node scripts/remove-care-card.mjs");
  run("npx prisma db push --skip-generate");
  run("npx prisma db seed", { SEED_ONLY_IF_EMPTY: "1" });
  run("npx next build --webpack");
} else {
  run("npx next build");
}
