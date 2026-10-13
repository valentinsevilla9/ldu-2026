import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

// Plan B sin internet para desplegar: sirve la versión de producción (ya compilada por
// el `preserve:lan` de package.json) en la red local, para abrirla desde el móvil o desde
// el portátil del jurado conectados a la misma wifi o al punto de acceso del portátil.

const PORT = Number(process.env.PORT) || 3000;

if (!existsSync(path.join(".next", "BUILD_ID"))) {
  console.error("No hay build de producción. Ejecuta npm run serve:lan (compila primero).");
  process.exit(1);
}

// With the adapter name: Wi-Fi vs. VPN or virtual adapters, so it's clear which one to use.
const addresses = Object.entries(networkInterfaces()).flatMap(([name, nets]) =>
  (nets ?? [])
    .filter((net) => net.family === "IPv4" && !net.internal)
    .map((net) => `http://${net.address}:${PORT}  (${name})`),
);

console.log("\nPlan B: aplicación en la red local");
console.log(`  En este portátil: http://localhost:${PORT}`);
for (const address of addresses) console.log(`  Desde otro dispositivo: ${address}`);
if (addresses.length === 0)
  console.log("  (sin red local: conecta el wifi o crea un punto de acceso)");
console.log(
  "  Si el móvil no carga, permite el acceso de Node.js en el aviso del firewall de Windows.\n",
);

spawn(
  process.execPath,
  [
    path.join("node_modules", "next", "dist", "bin", "next"),
    "start",
    "-H",
    "0.0.0.0",
    "-p",
    String(PORT),
  ],
  { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
).on("exit", (code) => process.exit(code ?? 0));
