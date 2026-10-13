import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

// Estado de error: role="alert" para que el lector de pantalla lo anuncie al aparecer,
// con un mensaje comprensible y, cuando se puede, una forma de reintentar.
export function ErrorState({ title = "Algo ha fallado", message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 px-6 py-10 text-center"
    >
      <TriangleAlertIcon aria-hidden="true" className="size-8 text-destructive" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcwIcon aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
