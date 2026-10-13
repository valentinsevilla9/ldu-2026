import { rmSync } from "node:fs";
import type { TestProject } from "vitest/node";
import { resolveDatabase } from "./lib/db-config";
import { prepare, sqliteFilePath } from "./scripts/db";

// Antes de los tests de servidor: base de datos SQLite de pruebas, vacía y migrada.
// La URL sale de `env` en vitest.config.mts, que es la única fuente de verdad.
export default async function setup(project: TestProject) {
  const url = project.config.env.DATABASE_URL;
  if (!url?.startsWith("file:")) {
    throw new Error("Los tests de servidor deben usar una base SQLite propia (file:…).");
  }
  const config = resolveDatabase(url);
  rmSync(sqliteFilePath(config.url), { force: true });
  await prepare(config, { seedIfNew: false });
}
