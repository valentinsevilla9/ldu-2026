import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile, resolveDatabase, type DatabaseConfig } from "../lib/db-config";

// Prepara la base de datos para el proveedor que indique DATABASE_URL.
// Se ejecuta solo (postinstall, predev, prebuild); a mano solo hace falta para
// crear migraciones nuevas (`npm run db:migrate -- --name …`) o reiniciar datos.
//
//   generate  genera el cliente de Prisma para el proveedor activo
//   prepare   generate + aplica el esquema + carga datos de ejemplo si la base es nueva
//   migrate   SQLite: crea y aplica una migración nueva · Postgres: sincroniza el esquema
//   reset     borra los datos, reaplica el esquema y vuelve a cargar los datos de ejemplo

/** Absolute path of a SQLite file; relative URLs resolve from the project root. */
export function sqliteFilePath(url: string): string {
  return path.resolve(process.cwd(), url.replace(/^file:/, ""));
}

const PRISMA_CLI = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

function prisma(args: string[], url: string): void {
  // Run the CLI through Node directly: no shell, so it behaves the same on Windows and Unix.
  execFileSync(process.execPath, [PRISMA_CLI, ...args], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

/** Postgres schema = the canonical SQLite schema with only the provider line changed. */
function writePostgresSchema(config: DatabaseConfig): void {
  const source = readFileSync("prisma/schema.prisma", "utf8");
  const derived = source
    .replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"')
    // The copy lives one folder deeper, so the client output path gains one "../".
    .replace(/output\s*=\s*"\.\.\/generated\/prisma"/, 'output   = "../../generated/prisma"');
  mkdirSync(path.dirname(config.schemaPath), { recursive: true });
  writeFileSync(
    config.schemaPath,
    `// GENERADO por scripts/db.ts a partir de prisma/schema.prisma. No editar.\n\n${derived}`,
  );
}

export function generate(config: DatabaseConfig): void {
  if (config.provider === "postgresql") writePostgresSchema(config);
  prisma(["generate"], config.url);
}

function applySchema(config: DatabaseConfig): void {
  if (config.provider === "sqlite") prisma(["migrate", "deploy"], config.url);
  else prisma(["db", "push"], config.url);
}

async function seedSampleData(config: DatabaseConfig): Promise<void> {
  // Imported lazily: the generated client must exist before this module loads.
  const { seed } = await import("./seed");
  await seed(config);
}

async function isEmpty(config: DatabaseConfig): Promise<boolean> {
  process.env.DATABASE_URL = config.url;
  const { prisma } = await import("../lib/db");
  return (await prisma.rule.count()) === 0;
}

export async function prepare(config: DatabaseConfig, { seedIfNew = true } = {}): Promise<void> {
  const isNewSqlite = config.provider === "sqlite" && !existsSync(sqliteFilePath(config.url));
  if (isNewSqlite) {
    // Crear el archivo antes de migrate deploy evita el fallo de apertura de SQLite en Windows.
    const file = sqliteFilePath(config.url);
    mkdirSync(path.dirname(file), { recursive: true });
    const Database = createRequire(import.meta.url)("better-sqlite3");
    new Database(file).close();
  }
  generate(config);
  applySchema(config);
  if (seedIfNew && isNewSqlite) {
    console.log("Base de datos nueva: cargando datos de ejemplo…");
    await seedSampleData(config);
  } else if (seedIfNew && process.env.SEED_IF_EMPTY === "true" && (await isEmpty(config))) {
    // Typical first deploy against a new Postgres: no data yet.
    console.log("Base de datos vacía (SEED_IF_EMPTY=true): cargando datos de ejemplo…");
    await seedSampleData(config);
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  const config = resolveDatabase();
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "generate":
      generate(config);
      break;
    case "prepare":
      await prepare(config);
      break;
    case "migrate":
      generate(config);
      if (config.provider === "sqlite") prisma(["migrate", "dev", ...rest], config.url);
      else prisma(["db", "push"], config.url);
      break;
    case "reset":
      generate(config);
      if (config.provider === "sqlite") prisma(["migrate", "reset", "--force"], config.url);
      else prisma(["db", "push", "--force-reset"], config.url);
      await seedSampleData(config);
      break;
    default:
      console.error("Uso: tsx scripts/db.ts <generate|prepare|migrate|reset>");
      process.exit(1);
  }
}

// Run only when executed directly, not when imported by the test setup.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
