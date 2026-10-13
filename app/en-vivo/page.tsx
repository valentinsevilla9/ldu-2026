import type { Metadata } from "next";
import { LivePanel } from "@/modules/rules/live-panel";

export const metadata: Metadata = { title: "En vivo" };

export default function LivePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">En vivo</h1>
        <p className="max-w-prose text-muted-foreground">
          Lecturas de los sensores del Distrito Triana y alertas que disparan las reglas automáticas
          («si pasa X, entonces Y») a lo largo de un día de calor.
        </p>
      </div>
      <LivePanel />
    </div>
  );
}
