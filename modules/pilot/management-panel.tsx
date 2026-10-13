"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LivePanel } from "@/modules/rules/live-panel";
import { RulesPanel } from "@/modules/rules/rules-panel";
import { AlertsPanel } from "@/modules/rules/alerts-panel";
import { PilotPanel } from "./pilot-panel";

export function ManagementPanel() {
  const [view, setView] = useState("operations");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" aria-label="Vista de gestión">
        {[
          { id: "operations", label: "Coordinación" },
          { id: "live", label: "Sensores" },
          { id: "rules", label: "Reglas" },
          { id: "alerts", label: "Alertas" },
        ].map((item) => (
          <Button
            key={item.id}
            aria-pressed={view === item.id}
            variant={view === item.id ? "default" : "outline"}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {view === "operations" ? (
        <PilotPanel management />
      ) : view === "live" ? (
        <LivePanel />
      ) : view === "rules" ? (
        <RulesPanel />
      ) : (
        <AlertsPanel />
      )}
    </div>
  );
}
