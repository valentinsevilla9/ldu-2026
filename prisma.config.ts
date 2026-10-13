import { defineConfig } from "prisma/config";
import path from "node:path";
import { loadEnvFile, resolveDatabase } from "./lib/db-config";

// Configuración del CLI de Prisma. Elige esquema y migraciones según DATABASE_URL,
// de modo que cualquier comando `prisma …` funciona igual con SQLite o con Postgres.
loadEnvFile();
const database = resolveDatabase();

export default defineConfig({
  schema: database.schemaPath,
  migrations: { path: database.migrationsPath },
  // El CLI y el adaptador deben abrir el mismo archivo, relativo a la raíz del proyecto.
  datasource: {
    url:
      database.provider === "sqlite"
        ? `file:${path.resolve(database.url.slice(5)).replace(/\\/g, "/")}`
        : database.url,
  },
});
