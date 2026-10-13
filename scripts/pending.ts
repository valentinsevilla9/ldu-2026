import { existsSync, readFileSync } from "node:fs";
import { findContentHoles, findMarkdownHoles } from "../lib/placeholders";
import { APP_DESCRIPTION, APP_NAME } from "../lib/site";

// npm run docs:pending: lista los huecos «[…]» que quedan en lo que se entrega (README,
// one-pager, guion y /idea) y avisa si la aplicación sigue llamándose como la plantilla.
// Termina con error si queda algo en lo obligatorio, así que sirve de última comprobación
// antes de enseñar nada al jurado.

const DOCUMENTS = [
  { file: "README.md", required: true },
  { file: "docs/ONEPAGER.md", required: true },
  { file: "docs/DEMO_SCRIPT.md", required: true },
];
const IDEA_FILE = "app/idea/content.ts";
// The template's own name and description: seeing them in the app means lib/site.ts was
// never updated, and they would show on every page title and on /idea.
const TEMPLATE_SITE = {
  APP_NAME: "Plantilla LDU 2026",
  APP_DESCRIPTION: "Plantilla base para la prueba de Líderes Digitales Universitarios",
};

type Report = { file: string; required: boolean; holes: { where: string; text: string }[] };

async function collect(): Promise<Report[]> {
  const site = { APP_NAME, APP_DESCRIPTION };
  const reports: Report[] = [
    {
      file: "lib/site.ts",
      required: true,
      holes: (Object.keys(site) as (keyof typeof site)[])
        .filter((key) => site[key] === TEMPLATE_SITE[key])
        .map((key) => ({ where: key, text: `[sigue siendo «${site[key]}»]` })),
    },
  ];
  reports.push(
    ...DOCUMENTS.filter(({ file }) => existsSync(file)).map(({ file, required }) => ({
      file,
      required,
      holes: findMarkdownHoles(readFileSync(file, "utf8")).map((hole) => ({
        where: `línea ${hole.line}`,
        text: hole.text,
      })),
    })),
  );
  // /idea is optional: if the route was deleted, there is nothing to check.
  if (existsSync(IDEA_FILE)) {
    const { IDEA } = await import("../app/idea/content");
    reports.push({
      file: IDEA_FILE,
      required: true,
      holes: findContentHoles(IDEA).map((hole) => ({ where: hole.path, text: hole.text })),
    });
  }
  return reports;
}

async function main() {
  const reports = await collect();
  for (const { file, required, holes } of reports) {
    const label = required ? file : `${file} (opcional: solo si piden un informe)`;
    if (holes.length === 0) {
      console.log(`✓ ${label}: sin huecos`);
      continue;
    }
    console.log(`✗ ${label}: ${holes.length} huecos`);
    for (const hole of holes) {
      const text = hole.text.length > 90 ? `${hole.text.slice(0, 89)}…]` : hole.text;
      console.log(`    ${hole.where}: ${text}`);
    }
  }

  const pending = reports
    .filter((report) => report.required)
    .reduce((total, report) => total + report.holes.length, 0);
  console.log(
    pending === 0
      ? "\nTodo relleno."
      : `\nQuedan ${pending} huecos en lo obligatorio. Si un dato no existe, escríbelo como hipótesis.`,
  );
  process.exit(pending === 0 ? 0 : 1);
}

void main();
