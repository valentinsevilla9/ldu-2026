import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { browserCandidates, findBrowser } from "./screenshots";

// Verificación del recorrido real en navegador y de la confirmación persistida vía API.
async function main() {
  const base = process.env.PILOT_URL ?? "http://localhost:3000";
  const executablePath = findBrowser(browserCandidates());
  if (!executablePath) throw new Error("No hay un navegador instalado para verificar el piloto.");
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    // tsx conserva nombres de funciones con este ayudante al serializar evaluate.
    await page.evaluateOnNewDocument("globalThis.__name = (fn) => fn");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(`${base}/app`, { waitUntil: "networkidle0" });
    await page.waitForSelector("select");
    const metrics = await page.evaluate(async () => {
      const runId = localStorage.getItem("pilot-run")!;
      const query = { runId, minute: 1230, maxDistance: 3000 };
      async function state() {
        const response = await fetch(
          `/api/pilot?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`,
        );
        if (!response.ok) throw new Error(`Estado: ${response.status}`);
        return response.json();
      }
      const before = await state();
      const refuge = before.resources.find(
        (resource: { id: string; open: boolean }) =>
          resource.id.startsWith("refuge-") && !resource.open,
      );
      const response = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...query, operation: "open", targetId: refuge.id }),
      });
      if (!response.ok) throw new Error(`Confirmación: ${response.status}`);
      const after = await state();
      if (!after.resources.find((resource: { id: string }) => resource.id === refuge.id).open)
        throw new Error("La apertura no cambia el estado.");
      return after.metrics;
    });
    const search = await page.$("button::-p-text(Buscar una alternativa disponible)");
    assert(search);
    await search.click();
    await page.waitForSelector("details");
    const text = await page.$eval("details", (element) => element.textContent);
    assert(text?.includes("Comprobar restricciones"));
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      false,
      "Desbordamiento en móvil",
    );
    mkdirSync("docs/screenshots", { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "docs/screenshots/app-verificada-movil.png", fullPage: true });
    for (const route of ["/", "/gestion"]) {
      const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle0" });
      assert.equal(response?.status(), 200);
      await page.waitForSelector("h1");
    }
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        pages: "Inicio, App y Gestión verificadas",
        mobile: "Sin desbordamiento",
        actions: "Apertura cambia disponibilidad",
        metrics,
      }),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
