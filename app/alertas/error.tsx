"use client";

import { RouteError } from "@/components/states/route-error";

// Los límites de error deben ser componentes de cliente; el contenido es común a todas las rutas.
export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} />;
}
