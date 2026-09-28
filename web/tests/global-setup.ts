import { execSync } from "node:child_process";

/** Dedicated SQLite test database (never touches dev.db). Tests use unique ids, so no reset is needed. */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  // Same one-off Care Card clean-up as deploys, so an older test.db upgrades without data-loss prompts.
  execSync("node scripts/remove-care-card.mjs", { env, stdio: "ignore" });
  execSync("npx prisma db push --skip-generate", { env, stdio: "ignore" });
}
