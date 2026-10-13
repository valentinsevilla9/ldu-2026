"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/error-state";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Contenido común de los error.tsx: registra el error y ofrece reintentar el segmento.
// No muestra error.message al usuario porque en producción puede ser técnico o vacío.
export function RouteError({ error, retry }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="No se ha podido cargar esta página"
      message="Ha ocurrido un error inesperado. Puedes reintentarlo; si persiste, vuelve al inicio."
      onRetry={retry}
    />
  );
}
