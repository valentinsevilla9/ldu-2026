// Decide qué base de datos usar a partir de DATABASE_URL. Lo comparten la app,
// prisma.config.ts y scripts/db.ts, así que no importa nada de Prisma.

export type DatabaseProvider = "sqlite" | "postgresql";

export const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

export type DatabaseConfig = {
  url: string;
  provider: DatabaseProvider;
  /** Schema file Prisma should use for this provider (relative to the project root). */
  schemaPath: string;
  /** Migrations are versioned for SQLite only; Postgres is synced with `prisma db push`. */
  migrationsPath: string;
};

export function detectProvider(url: string): DatabaseProvider {
  if (url.startsWith("file:")) return "sqlite";
  if (/^postgres(ql)?:\/\//.test(url)) return "postgresql";
  // Never echo the URL: it may contain a password.
  throw new Error(
    "DATABASE_URL no reconocida. Usa file:./ruta.db para SQLite o postgresql://… para Postgres.",
  );
}

export function resolveDatabase(
  url = process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
): DatabaseConfig {
  const provider = detectProvider(url);
  return provider === "sqlite"
    ? { url, provider, schemaPath: "prisma/schema.prisma", migrationsPath: "prisma/migrations" }
    : {
        url,
        provider,
        schemaPath: "prisma/generated/schema.postgresql.prisma",
        migrationsPath: "prisma/generated/migrations-postgresql",
      };
}

/**
 * Vercel without DATABASE_URL: demo with the SQLite file created during the build. The
 * deployment is read-only, so the app works on a copy in /tmp: changes last while that
 * server instance lives and are lost afterwards. For lasting data, use Postgres.
 */
export function isEphemeralDemoDatabase(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.VERCEL) && !env.DATABASE_URL;
}

/** Loads .env for tools that do not do it themselves (the Prisma CLI and our scripts). */
export function loadEnvFile(file = ".env"): void {
  try {
    process.loadEnvFile(file);
  } catch {
    // No .env: defaults apply.
  }
}
