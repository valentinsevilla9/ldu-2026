import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// npm run deploy: publica en Vercel (producción) y escribe la URL pública al final.
// Usa la CLI oficial de Vercel con versión fija vía npx, sin añadirla a las dependencias.
// La primera vez hay que iniciar sesión: npx vercel@<versión> login (ver docs/DEPLOY.md).

export const VERCEL_CLI = "vercel@62.2.0";

function vercel(args: string[], capture: boolean) {
  // npx is a .cmd file on Windows, which Node only runs through a shell. One command string
  // (the arguments are fixed, nothing comes from the user) avoids Node's DEP0190 warning.
  return spawnSync(`npx --yes ${VERCEL_CLI} ${args.join(" ")}`, {
    shell: true,
    encoding: "utf8",
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
  });
}

/** The CLI prints progress on stderr and the deployment URL on stdout; take the last one. */
export function parseDeploymentUrl(stdout: string): string | null {
  const urls = stdout.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi);
  return urls?.at(-1) ?? null;
}

async function main(): Promise<void> {
  console.log(`Comprobando la sesión de Vercel (${VERCEL_CLI})…`);
  if (vercel(["whoami"], true).status !== 0) {
    console.error(
      `\nNo has iniciado sesión en Vercel. Ejecuta:\n\n  npx ${VERCEL_CLI} login\n\n` +
        "y vuelve a lanzar npm run deploy. Más ayuda en docs/DEPLOY.md.",
    );
    process.exit(1);
  }

  console.log("Desplegando en producción (tarda unos minutos la primera vez)…\n");
  const deploy = vercel(["deploy", "--prod", "--yes"], true);
  const url = parseDeploymentUrl(deploy.stdout ?? "");
  if (deploy.status !== 0 || !url) {
    console.error("\nEl despliegue ha fallado. Revisa el mensaje de arriba y docs/DEPLOY.md.");
    process.exit(1);
  }

  let health = "sin respuesta";
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(20_000) });
    health = response.ok ? "servidor y base de datos operativos" : `responde ${response.status}`;
  } catch {
    // Reported below; the deployment itself succeeded.
  }

  console.log(`\n  URL pública: ${url}\n  Comprobación: ${health}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
