import { execSync } from "node:child_process";

/** Dedicated SQLite test database (never touches dev.db). Tests use unique ids, so no reset is needed. */
export default function setup() {
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
