import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La raíz es siempre esta carpeta, aunque haya otros package-lock.json más arriba.
  turbopack: { root: import.meta.dirname },
  // Sin el botón flotante de Next en desarrollo: dev:offline también sirve para hacer la demo.
  // Los errores se siguen mostrando.
  devIndicators: false,
  // Archivos que el análisis automático no ve y el servidor necesita en Vercel: la base de
  // datos de demostración creada en el build y las capas de Sevilla sobre las que se colocan
  // los sensores.
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db"],
    "/api/live": ["./public/data/sevilla/*.geojson"],
  },
  // NEXT_OUTPUT=standalone genera un servidor autocontenido (.next/standalone): sirve para
  // comprobar en local que el empaquetado incluye todo, como en Vercel (docs/DEPLOY.md).
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" as const }),
};

export default nextConfig;
