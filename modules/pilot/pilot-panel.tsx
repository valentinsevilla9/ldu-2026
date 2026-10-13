"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { fetchJson, useApi } from "@/hooks/use-api";
import { formatMinute } from "@/modules/rules/engine";
import { useSimClock } from "@/modules/rules/use-sim-clock";
import type { getPilotState } from "./server";
import type { Plan, Resource } from "./schema";

type State = Awaited<ReturnType<typeof getPilotState>>;
const labels = { heat: "Refugios", bins: "Reciclaje", bikes: "Sevici" };

export function usePilotRun() {
  const [runId, setRunId] = useState("");
  useEffect(() => {
    let id = crypto.randomUUID();
    try {
      const stored = localStorage.getItem("pilot-run");
      if (stored && /^[0-9a-f-]{36}$/i.test(stored)) id = stored as typeof id;
      localStorage.setItem("pilot-run", id);
    } catch {
      /* El piloto funciona también sin almacenamiento local. */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura inicial de sesión tras hidratar
    setRunId(id);
  }, []);
  function restart() {
    const id = crypto.randomUUID();
    try {
      localStorage.setItem("pilot-run", id);
    } catch {
      /* Sesión solo en memoria. */
    }
    setRunId(id);
  }
  return { runId, restart };
}

export function PilotPanel({ management = false }: { management?: boolean }) {
  const clock = useSimClock();
  const { runId, restart } = usePilotRun();
  const [kind, setKind] = useState<"heat" | "bins" | "bikes">("heat");
  const [originId, setOriginId] = useState("");
  const [material, setMaterial] = useState("envases");
  const [maxDistance, setMaxDistance] = useState(1000);
  const [proposal, setProposal] = useState<{ key: string; value: Plan } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const url = runId
    ? `/api/pilot?runId=${runId}&minute=${clock.step}&maxDistance=${maxDistance}`
    : null;
  const { data, error, refetch } = useApi<State>(url);
  // Una propuesta caduca al cambiar el reloj, la solicitud o la sesión.
  const queryKey = `${runId}:${clock.step}:${kind}:${originId}:${material}:${maxDistance}`;
  const plan = proposal?.key === queryKey ? proposal.value : null;
  const setPlan = (value: Plan | null) => setProposal(value ? { key: queryKey, value } : null);
  if (!runId || !data?.resources) {
    return error && runId ? (
      <ErrorState message={error} onRetry={refetch} />
    ) : (
      <LoadingState label="Preparando el piloto…" />
    );
  }
  const origins = data.resources.filter(
    (item) => item.kind === kind && !item.id.startsWith("refuge-"),
  );
  const selectedId = origins.some((item) => item.id === originId)
    ? originId
    : (origins[0]?.id ?? "");
  const requests = data.actions.filter((action) => action.operation.startsWith("request"));

  async function propose() {
    setBusy(true);
    setMessage("");
    try {
      setPlan(
        await fetchJson<Plan>("/api/pilot/plan", {
          method: "POST",
          json: {
            runId,
            minute: clock.step,
            kind,
            originId: selectedId,
            material,
            maxDistance,
          },
        }),
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se ha podido preparar la propuesta.");
    } finally {
      setBusy(false);
    }
  }
  async function act(operation: string, targetId: string) {
    setBusy(true);
    setMessage("");
    try {
      await fetchJson("/api/pilot", {
        method: "POST",
        json: { runId, minute: clock.step, maxDistance, operation, targetId },
      });
      setPlan(null);
      setMessage(
        operation.startsWith("request")
          ? "Solicitud registrada. El responsable debe confirmar la actuación en Gestión."
          : "Actuación confirmada en el piloto. La disponibilidad se ha actualizado.",
      );
      refetch();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se ha podido guardar la actuación.");
    } finally {
      setBusy(false);
    }
  }
  const improvement = data.metrics.assistedPct - data.metrics.baselinePct;
  const hasPendingRequest = (id: string) =>
    requests.some(
      (request) =>
        request.targetId === id &&
        !data.actions.some(
          (action) =>
            action.targetId === request.targetId &&
            !action.operation.startsWith("request") &&
            action.minute >= request.minute,
        ),
    );
  // Primero lo que necesita actuación: solicitudes de vecinos, refugios cerrados o llenos,
  // contenedores llenos y estaciones vacías. El resto, solo si se pide.
  const needsAttention = (item: Resource) =>
    hasPendingRequest(item.id) ||
    (item.kind === "heat"
      ? !item.open || item.occupied >= item.capacity
      : item.kind === "bins"
        ? item.value >= 85
        : item.value === 0);
  const resourcesToManage = data.resources
    .filter((item) => item.id.startsWith("refuge-") || item.kind !== "heat")
    .filter((item) => showAll || needsAttention(item))
    .sort((a, b) => Number(hasPendingRequest(b.id)) - Number(hasPendingRequest(a.id)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div>
          <Badge variant="outline">Piloto simulado · Triana</Badge>
          <p className="mt-2 text-sm">
            Rol: {management ? "Responsable municipal / operador" : "Vecino"} ·{" "}
            {formatMinute(clock.minute)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              clock.setMinute(14 * 60 + 30);
              clock.setPlaying(false);
            }}
          >
            Escenario de calor
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clock.setMinute(20 * 60 + 30);
              clock.setPlaying(false);
            }}
          >
            Escenario de reciclaje
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              restart();
              setPlan(null);
            }}
          >
            Nueva sesión
          </Button>
        </div>
        <label className="flex w-full flex-col gap-1 text-sm">
          Hora del piloto
          <input
            type="range"
            min={0}
            max={1435}
            step={5}
            value={clock.step}
            aria-valuetext={formatMinute(clock.step)}
            onChange={(event) => {
              clock.setPlaying(false);
              clock.setMinute(Number(event.target.value));
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Ubicaciones reales. Lecturas, habilitación, horarios, plazas y actuaciones simulados. No
          se envían avisos ni se ejecutan acciones fuera de esta demo.
        </p>
      </div>

      <section
        aria-labelledby={management ? "manager-metric" : "app-metric"}
        className="rounded-xl border bg-muted/30 p-4"
      >
        <h2 id={management ? "manager-metric" : "app-metric"} className="font-semibold">
          Solicitudes con alternativa válida
        </h2>
        <p className="mt-2 text-2xl font-semibold">
          {data.metrics.baselinePct} % → {data.metrics.assistedPct} %{" "}
          <span className="text-base">
            ({improvement >= 0 ? "+" : ""}
            {improvement} puntos porcentuales)
          </span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.metrics.total === 0
            ? "Ninguna incidencia a esta hora: no hay solicitudes que comparar."
            : `De ${data.metrics.total} incidencias a esta hora (parada a 40 °C o más, estación sin bicis o contenedor lleno), mapa estático: ${data.metrics.baseline} con alternativa válida (el recurso más cercano, sin comprobar su estado ni actuaciones); Sevilla Activa: ${data.metrics.assisted}, comprobando disponibilidad y con las actuaciones confirmadas. Pendientes de actuación: ${data.metrics.pending}.`}{" "}
          Misma distancia para ambos. Valida el método; no mide aún impacto real.
        </p>
      </section>

      {!management && (
        <section
          aria-label="Aplicación para el vecino"
          className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-[2rem] border-4 border-primary/20 bg-background p-6 shadow-lg"
        >
          <header>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Sevilla Activa
            </p>
            <h2 className="mt-2 text-2xl font-semibold">¿Qué necesitas cerca?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Del dato a la acción, en tu barrio.
            </p>
          </header>
          <div className="grid grid-cols-3 gap-2" aria-label="Servicio">
            {(Object.keys(labels) as (keyof typeof labels)[]).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={kind === item ? "default" : "outline"}
                aria-pressed={kind === item}
                onClick={() => {
                  setKind(item);
                  setOriginId("");
                }}
              >
                {labels[item]}
              </Button>
            ))}
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Estoy cerca de
            <select
              value={selectedId}
              onChange={(event) => setOriginId(event.target.value)}
              className="rounded-md border bg-background p-3"
            >
              {origins.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.id.split("-").at(-1)}
                </option>
              ))}
            </select>
          </label>
          {kind === "bins" && (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Residuo
              <select
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
                className="rounded-md border bg-background p-3"
              >
                {["envases", "vidrio", "papel", "ropa", "pilas"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-2 text-sm font-medium">
            Distancia máxima: {maxDistance} m en línea recta
            <input
              type="range"
              min={100}
              max={3000}
              step={100}
              value={maxDistance}
              onChange={(event) => setMaxDistance(Number(event.target.value))}
            />
          </label>
          <Button disabled={busy || !selectedId} onClick={propose}>
            {busy ? "Consultando…" : "Buscar una alternativa disponible"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Agente simulado: consulta recursos, comprueba restricciones y valida la propuesta. Sin
            modelo de IA conectado ni rutas peatonales calculadas.
          </p>
          {plan && (
            <div className="flex flex-col gap-3 rounded-xl border p-4" role="status">
              <h3 className="font-semibold">
                {plan.target?.name ??
                  (plan.status === "needs-action"
                    ? "Hace falta una actuación"
                    : "Sin alternativa disponible")}
              </h3>
              <p className="text-sm">{plan.reason}</p>
              {plan.target && (
                <p className="text-sm">
                  A {plan.target.distanceM} m en línea recta · {plan.target.latitude.toFixed(4)},{" "}
                  {plan.target.longitude.toFixed(4)}
                </p>
              )}
              {plan.requestTargetId && (
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() =>
                    act(
                      kind === "heat"
                        ? "requestHeat"
                        : kind === "bins"
                          ? "requestBins"
                          : "requestBikes",
                      plan.requestTargetId!,
                    )
                  }
                >
                  Solicitar actuación simulada
                </Button>
              )}
              <details>
                <summary className="cursor-pointer text-sm">Cómo se ha decidido</summary>
                <ol className="mt-2 list-decimal space-y-2 pl-4 text-xs">
                  {plan.tools.map((tool) => (
                    <li key={tool.name}>
                      <strong>{tool.name}:</strong> {tool.result}
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          )}
        </section>
      )}

      {management && (
        <section aria-labelledby="operations-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="operations-title" className="text-xl font-semibold">
              {showAll ? "Todos los recursos" : "Necesitan actuación"}
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Ver solo lo que necesita actuación" : "Ver todos los recursos"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada confirmación cambia la disponibilidad simulada en esta sesión desde el minuto
            actual. Rebobinar el reloj excluye actuaciones futuras. Las sesiones nuevas conservan el
            escenario base.
          </p>
          <p role="status" className="text-sm">
            {
              requests.filter(
                (request) =>
                  !data.actions.some(
                    (action) =>
                      action.targetId === request.targetId &&
                      !action.operation.startsWith("request") &&
                      action.minute >= request.minute,
                  ),
              ).length
            }{" "}
            solicitudes pendientes
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {resourcesToManage.map((item: Resource) => {
              const pending = requests.some(
                (request) =>
                  request.targetId === item.id &&
                  !data.actions.some(
                    (action) =>
                      action.targetId === request.targetId &&
                      !action.operation.startsWith("request") &&
                      action.minute >= request.minute,
                  ),
              );
              return (
                <li key={item.id} className="flex flex-col gap-2 rounded-xl border p-4">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm">
                    {item.kind === "heat"
                      ? `${item.open ? "Abierto" : "Cerrado"} · ${item.capacity - item.occupied} plazas libres simuladas`
                      : item.kind === "bins"
                        ? `${item.value} % de llenado · ${item.materials.join(", ") || "Material no documentado"}`
                        : `${item.value} bicicletas simuladas`}
                  </p>
                  {pending && <Badge className="w-fit">Solicitud pendiente</Badge>}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      busy || (item.kind === "heat" && item.open && item.occupied < item.capacity)
                    }
                    onClick={() =>
                      act(
                        item.kind === "heat" ? "open" : item.kind === "bins" ? "empty" : "refill",
                        item.id,
                      )
                    }
                  >
                    {item.kind === "heat"
                      ? "Confirmar apertura / ampliar hasta las 24 h"
                      : item.kind === "bins"
                        ? "Confirmar recogida simulada"
                        : "Confirmar reposición de 8 bicicletas"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {message && (
        <p role="status" className="rounded-md border p-3 text-sm">
          {message}
        </p>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}
    </div>
  );
}
