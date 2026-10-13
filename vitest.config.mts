import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  plugins: [react()],
  // Mirrors the "@/*" alias from tsconfig.json without an extra plugin.
  resolve: { alias: [{ find: /^@\//, replacement: `${root}/` }] },
  test: {
    exclude: [...configDefaults.exclude, ".next/**", "generated/**"],
    projects: [
      {
        // Components, pages and hooks: browser-like environment, files run in parallel.
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: [
            "app/**/*.test.tsx",
            "components/**/*.test.tsx",
            "hooks/**/*.test.ts",
            "modules/**/*.test.tsx",
          ],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        // API routes and services against a real SQLite test database. Files run one
        // after another because they share that database.
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: [
            "app/**/*.test.ts",
            "lib/**/*.test.ts",
            "scripts/**/*.test.ts",
            "modules/**/*.test.ts",
          ],
          globalSetup: ["./vitest.global-setup.ts"],
          fileParallelism: false,
          // Separate database so the tests never touch prisma/dev.db.
          env: { DATABASE_URL: "file:./prisma/test.db", LOG_LEVEL: "silent" },
        },
      },
    ],
  },
});
