import type { Metadata } from "next";
import { ManagementPanel } from "@/modules/pilot/management-panel";
export const metadata: Metadata = { title: "Gestión municipal" };
export default function ManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Centro de coordinación municipal</h1>
        <p className="mt-2 text-muted-foreground">
          Disponibilidad, reglas y actuaciones municipales simuladas. El rol es demostrativo; no hay
          autenticación de producción.
        </p>
      </header>
      <ManagementPanel />
    </div>
  );
}
