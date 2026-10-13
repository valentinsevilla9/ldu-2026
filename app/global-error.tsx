"use client";

import { useEffect } from "react";
import "./globals.css";

// Último recurso: sustituye al layout raíz si este falla, así que trae su propio
// <html> y estilos. Se mantiene mínimo para que no pueda fallar a su vez.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center p-6">
        <title>Error · Plantilla LDU 2026</title>
        <main role="alert" className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">La aplicación ha encontrado un error</h1>
          <p className="text-muted-foreground">
            Puedes reintentarlo. Si el problema continúa, recarga la página.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
