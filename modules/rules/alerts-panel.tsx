"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJson, useApi } from "@/hooks/use-api";
import { STEP_MIN, formatMinute } from "./engine";
import { KIND_LABELS, liveStateSchema, type LiveAlert } from "./live-schema";
import { formatDay } from "./live-panel";
import { useSimClock } from "./use-sim-clock";

const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

type Group = {
  key: string;
  alerts: LiveAlert[];
  first: LiveAlert;
  acknowledged: boolean;
};

/**
 * Las alertas se agrupan por acción: si 14 paradas piden abrir el mismo refugio, es una sola
 * tarea para la técnica, no 14 avisos. Calor: por refugio; Sevici y contenedores: por punto.
 */
function groupAlerts(alerts: LiveAlert[]): Group[] {
  const groups = new Map<string, LiveAlert[]>();
  for (const alert of alerts) {
    const key = `${alert.ruleId}:${alert.kind === "heat" ? alert.target?.name : alert.sensorId}`;
    groups.set(key, [...(groups.get(key) ?? []), alert]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.minute - b.minute);
      return {
        key,
        alerts: sorted,
        first: sorted[0],
        acknowledged: list.every((a) => a.acknowledged),
      };
    })
    .sort(
      (a, b) => Number(a.acknowledged) - Number(b.acknowledged) || a.first.minute - b.first.minute,
    );
}

/** Pantalla de alertas y acciones: qué hay que hacer, dónde, a quién avisar, y marcarlo como hecho. */
export function AlertsPanel() {
  const clock = useSimClock();
  const { data, error, refetch, mutate } = useApi(
    `/api/live?minute=${clock.step}`,
    liveStateSchema,
  );
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) {
    if (error) return <ErrorState message={error} onRetry={refetch} />;
    return <LoadingState label="Cargando alertas…" />;
  }

  const groups = groupAlerts(data.alerts);
  const pending = groups.filter((group) => !group.acknowledged);

  async function acknowledge(group: Group) {
    setBusy(group.key);
    try {
      for (const alert of group.alerts) {
        await fetchJson(`/api/alerts/${encodeURIComponent(alert.id)}`, { method: "POST" });
      }
      const ids = new Set(group.alerts.map((alert) => alert.id));
      mutate(
        (current) =>
          current && {
            ...current,
            alerts: current.alerts.map((alert) =>
              ids.has(alert.id) ? { ...alert, acknowledged: true } : alert,
            ),
          },
      );
      toast.success("Acción marcada como atendida.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se ha podido guardar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          Distrito {data.district} · {formatDay(data.day)} · hasta las {formatMinute(clock.minute)}
          <Badge variant="outline">Lecturas simuladas</Badge>
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span>Ver las alertas hasta esta hora del día simulado</span>
          <input
            type="range"
            min={0}
            max={1439}
            step={STEP_MIN}
            value={clock.minute}
            aria-valuetext={formatMinute(clock.minute)}
            onChange={(event) => clock.setMinute(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </label>
        <p role="status" className="text-sm text-muted-foreground">
          {pending.length} acciones pendientes · {data.alerts.length} disparos de reglas
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          Ninguna regla se ha disparado hasta las {formatMinute(clock.minute)}. Mueve la hora hacia
          la tarde para ver el calor.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => {
            const { first } = group;
            const peak = Math.max(...group.alerts.map((alert) => alert.value));
            const lowest = Math.min(...group.alerts.map((alert) => alert.value));
            return (
              <li key={group.key} className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground">
                      {KIND_LABELS[first.kind].short} · {first.ruleName} · desde las {first.time}
                    </p>
                    <h2 className="font-semibold">
                      {first.action}
                      {first.target && `: ${first.target.name}`}
                    </h2>
                  </div>
                  <Badge variant={group.acknowledged ? "outline" : "default"}>
                    {group.acknowledged
                      ? "Atendida"
                      : group.alerts.some((a) => a.active)
                        ? "Activa"
                        : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-sm">
                  {first.kind === "heat"
                    ? `${group.alerts.length} ${group.alerts.length === 1 ? "parada" : "paradas"} por encima del umbral (máx. ${number.format(peak)} °C): ${group.alerts.map((a) => a.sensorName).join(", ")}.`
                    : `${first.sensorName}: ${number.format(first.kind === "bikes" ? lowest : peak)} ${first.unit}.`}
                  {first.target && ` Distancia: ${first.target.distanceM} m.`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avisar a: {first.notify || "sin indicar"}
                </p>
                {!group.acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    disabled={busy === group.key}
                    onClick={() => acknowledge(group)}
                  >
                    <CheckIcon aria-hidden="true" />
                    {busy === group.key ? "Guardando…" : "Marcar como atendida"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
