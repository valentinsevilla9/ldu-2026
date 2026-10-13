import type { Metadata } from "next";
import { AlertsPanel } from "@/modules/rules/alerts-panel";

export const metadata: Metadata = { title: "Alertas" };

export default function AlertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Alertas y acciones</h1>
        <p className="max-w-prose text-muted-foreground">
          Lo que han pedido las reglas, agrupado por tarea: qué hacer, dónde y a quién avisar.
        </p>
      </div>
      <AlertsPanel />
    </div>
  );
}
