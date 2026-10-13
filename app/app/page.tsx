import type { Metadata } from "next";
import { CitizenApp } from "@/modules/pilot/citizen-app";

export const metadata: Metadata = { title: "App del vecino" };

export default function CitizenPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">App del vecino</h1>
        <p className="max-w-prose text-muted-foreground">
          Lo que vería un vecino de Triana en su móvil: comparte su ubicación, dice qué necesita y
          recibe una alternativa que puede usar ahora o avisa al Ayuntamiento si no la hay.
        </p>
      </header>
      <CitizenApp />
    </div>
  );
}
