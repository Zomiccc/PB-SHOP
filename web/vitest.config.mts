import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    root: import.meta.dirname,
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", AUTH_SECRET: "test-secret", NODE_ENV: "test" },
    fileParallelism: false,
    testTimeout: 30000,
    server: { deps: { inline: ["server-only"] } },
  },
});
