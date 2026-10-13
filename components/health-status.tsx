"use client";

import { useApi } from "@/hooks/use-api";
import type { HealthResponse } from "@/lib/health";
import { cn } from "@/lib/utils";

const STYLES = {
  loading: "border-border bg-muted text-foreground",
  ok: "border-green-700 bg-green-50 text-green-900 dark:border-green-500 dark:bg-green-950 dark:text-green-100",
  error:
    "border-red-700 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-100",
};

// Indicador del estado del servidor. Anuncia cada cambio a lectores de pantalla
// (role="status") y nunca depende solo del color: el texto siempre explica el estado.
export function HealthStatus() {
  const { data, error, isLoading } = useApi<HealthResponse>("/api/health");
  const kind = isLoading ? "loading" : error || !data ? "error" : "ok";

  return (
    <p role="status" className={cn("rounded-md border px-4 py-3", STYLES[kind])}>
      {kind === "loading" && "Comprobando el servidor…"}
      {kind === "ok" && data && (
        <>
          Servidor y base de datos operativos.{" "}
          <span className="text-sm">
            Última comprobación: {new Date(data.timestamp).toLocaleTimeString("es-ES")}
          </span>
        </>
      )}
      {/* The API explains what failed (e.g. the database); the hint covers the usual cause. */}
      {kind === "error" &&
        `${error ?? "No se ha podido contactar con el servidor."} Comprueba que \`npm run dev\` está en marcha y recarga la página.`}
    </p>
  );
}
