import type { Metadata } from "next";
import { RulesPanel } from "@/modules/rules/rules-panel";

export const metadata: Metadata = { title: "Reglas" };

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reglas automáticas</h1>
        <p className="max-w-prose text-muted-foreground">
          Cada regla dice «si pasa X, entonces Y». Se evalúan sobre las lecturas de los sensores y,
          al cumplirse, crean una alerta con la acción y a quién avisar.
        </p>
      </div>
      <RulesPanel />
    </div>
  );
}
