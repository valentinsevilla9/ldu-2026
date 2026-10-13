import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Viewport } from "puppeteer-core";

// npm run screenshots: captura las pantallas principales, en escritorio y en móvil, en
// docs/screenshots/, y escribe el bloque Markdown listo para pegar en el README.
// Usa el Chrome o Edge instalado en el portátil (no descarga ningún navegador). Si la
// aplicación no está arrancada, arranca `next dev` y lo para al terminar.
//
//   npm run screenshots                                  → http://localhost:3000
//   npm run screenshots -- --url https://mi-app.vercel.app

/** Pantallas que se capturan. El día de la prueba: las del reto, en el orden del README. */
export const SCREENS = [
  { name: "inicio", path: "/", title: "Inicio" },
  { name: "app", path: "/app", title: "App para el vecino" },
  { name: "gestion", path: "/gestion", title: "Gestión del piloto" },
];

const OUTPUT_DIR = path.join("docs", "screenshots");

const VIEWPORTS: { suffix: string; viewport: Viewport }[] = [
  { suffix: "", viewport: { width: 1280, height: 800 } },
  {
    suffix: "-movil",
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
];

/** Chrome or Edge executables to try, most common first. CHROME_PATH wins. */
export function browserCandidates(
  env: Record<string, string | undefined> = process.env,
  platform = process.platform,
) {
  if (env.CHROME_PATH) return [env.CHROME_PATH];
  if (platform === "win32") {
    const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean);
    return [
      ...roots.map((root) => path.join(root!, "Google", "Chrome", "Application", "chrome.exe")),
      ...roots.map((root) => path.join(root!, "Microsoft", "Edge", "Application", "msedge.exe")),
    ];
  }
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/snap/bin/chromium",
  ];
}

export function findBrowser(candidates: string[], exists: (file: string) => boolean = existsSync) {
  return candidates.find((file) => exists(file)) ?? null;
}

/** The Markdown block for the README: desktop captures, then the phone ones side by side. */
export function markdownSnippet(screens: typeof SCREENS, dir = "docs/screenshots") {
  const desktop = screens.map(
    (screen) => `![Pantalla «${screen.title}» en escritorio](${dir}/${screen.name}.png)`,
  );
  const phone = screens.map(
    (screen) =>
      `  <img src="${dir}/${screen.name}-movil.png" alt="Pantalla «${screen.title}» en el móvil" width="195">`,
  );
  return [...desktop, "", "<p>", ...phone, "</p>"].join("\n");
}

async function isUp(base: string) {
  try {
    const response = await fetch(base, { signal: AbortSignal.timeout(3000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

function startDevServer(port: string): ChildProcess {
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  return spawn(process.execPath, [next, "dev", "-p", port], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "ignore",
    // Own process group on macOS/Linux, so stopping it also stops Next's worker.
    detached: process.platform !== "win32",
  });
}

function stopDevServer(server: ChildProcess) {
  if (!server.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    process.kill(-server.pid, "SIGTERM");
  }
}

async function main() {
  const urlFlag = process.argv.indexOf("--url");
  const base = (urlFlag > 0 ? process.argv[urlFlag + 1] : "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  const executablePath = findBrowser(browserCandidates());
  if (!executablePath) {
    console.error(
      "No encuentro Chrome ni Edge. Instala uno o indica la ruta con CHROME_PATH=/ruta/al/navegador.",
    );
    process.exit(1);
  }

  let server: ChildProcess | null = null;
  if (!(await isUp(base))) {
    const { hostname, port } = new URL(base);
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      console.error(`${base} no responde.`);
      process.exit(1);
    }
    console.log(`La aplicación no está arrancada: arranco next dev en el puerto ${port || 80}…`);
    server = startDevServer(port || "80");
    const deadline = Date.now() + 120_000;
    while (!(await isUp(base))) {
      if (Date.now() > deadline) {
        stopDevServer(server);
        console.error("next dev no ha arrancado en 2 minutos. Prueba con npm run dev y repite.");
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    for (const { suffix, viewport } of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      // Still frames: no transitions or animated skeletons caught half way.
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "prefers-color-scheme", value: "light" },
      ]);
      for (const screen of SCREENS) {
        const file = path.join(OUTPUT_DIR, `${screen.name}${suffix}.png`);
        // The first visit compiles the page in development: allow it time.
        await page.goto(`${base}${screen.path}`, { waitUntil: "networkidle0", timeout: 90_000 });
        await page.evaluate(() => document.fonts.ready);
        await new Promise((resolve) => setTimeout(resolve, 400));
        await page.screenshot({ path: file as `${string}.png` });
        console.log(`  ${file}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    if (server) stopDevServer(server);
  }

  console.log("\nPara el README (cambia los textos alternativos si quieres describir más):\n");
  console.log(markdownSnippet(SCREENS));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
