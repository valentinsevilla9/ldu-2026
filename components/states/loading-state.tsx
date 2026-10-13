import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de página para los loading.tsx. El texto oculto avisa a los lectores
// de pantalla de que se está cargando, ya que los bloques grises no dicen nada.
export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
