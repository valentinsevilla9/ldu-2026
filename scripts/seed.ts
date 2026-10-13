import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "../lib/zod";
import { loadEnvFile, resolveDatabase, type DatabaseConfig } from "../lib/db-config";
import { ruleInputSchema } from "../modules/rules/schema";

// Carga las tres reglas del reto (calor, Sevici y contenedores) desde data/rules.json.
// Es idempotente: usa upsert por id, así que se puede ejecutar varias veces sin duplicar nada.

const SEED_FILE = "data/rules.json";

const seedFileSchema = z.array(ruleInputSchema.extend({ id: z.string().min(1) }));

export async function seed(config: DatabaseConfig = resolveDatabase()): Promise<number> {
  const rules = seedFileSchema.parse(JSON.parse(readFileSync(SEED_FILE, "utf8")));

  // DATABASE_URL must be set before lib/db is evaluated, so import it here.
  process.env.DATABASE_URL = config.url;
  const { prisma } = await import("../lib/db");

  for (const { id, ...fields } of rules) {
    await prisma.rule.upsert({ where: { id }, create: { id, ...fields }, update: fields });
  }
  return rules.length;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  loadEnvFile();
  seed()
    .then((count) => {
      console.log(`Reglas cargadas: ${count} desde ${SEED_FILE}.`);
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("No se han podido cargar las reglas:");
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
