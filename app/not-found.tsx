import Link from "next/link";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";

// 404 general: cualquier URL que no corresponde a ninguna página.
export default function NotFound() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Página no encontrada</h1>
      <EmptyState
        title="Esta página no existe"
        description="Puede que el enlace esté mal escrito o que la página se haya movido."
        action={
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        }
      />
    </div>
  );
}
