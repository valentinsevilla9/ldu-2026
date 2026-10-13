import { copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isEphemeralDemoDatabase, resolveDatabase } from "@/lib/db-config";

// Cliente de base de datos único para toda la app. El adaptador se elige por
// DATABASE_URL; el cliente generado ya coincide porque scripts/db.ts lo regenera
// al arrancar (predev / prebuild) para el proveedor activo.

/** Copies the database built during deployment to a writable place (see isEphemeralDemoDatabase). */
function ephemeralDemoUrl(): string {
  const built = path.join(process.cwd(), "prisma", "dev.db");
  const writable = path.join(tmpdir(), "ldu-demo.db");
  if (!existsSync(writable)) copyFileSync(built, writable);
  return `file:${writable}`;
}

function createClient(): PrismaClient {
  const { url, provider } = resolveDatabase();
  const adapter =
    provider === "postgresql"
      ? new PrismaPg({ connectionString: url })
      : new PrismaBetterSqlite3({ url: isEphemeralDemoDatabase() ? ephemeralDemoUrl() : url });
  return new PrismaClient({ adapter });
}

// In development, hot reload re-evaluates modules: reuse the client instead of
// opening a new connection on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
