"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BellRingIcon,
  CircleCheckIcon,
  OctagonAlertIcon,
  PauseIcon,
  PlayIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { PlaceProperties } from "@/modules/sevilla/layers";
import { STATUS_LABELS, type SensorStatus } from "@/modules/sensors/simulate";
import { STEP_MIN, formatMinute } from "./engine";
import { KIND_LABELS, liveStateSchema, type LiveState } from "./live-schema";
import { RULE_KINDS, type RuleKind } from "./schema";
import { SPEEDS, useSimClock } from "./use-sim-clock";

const SevillaLeaflet = dynamic(() => import("@/modules/sevilla/sevilla-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

// Status colours always come with an icon and a word: never colour alone.
export const STATUS_STYLE: Record<
  SensorStatus,
  { icon: LucideIcon; colorVar: string; text: string }
> = {
  ok: { icon: CircleCheckIcon, colorVar: "--status-ok", text: "text-status-ok" },
  warning: { icon: TriangleAlertIcon, colorVar: "--status-warning", text: "text-status-warning" },
  critical: { icon: OctagonAlertIcon, colorVar: "--status-critical", text: "text-status-critical" },
};

export function StatusLabel({ status }: { status: SensorStatus }) {
  const { icon: Icon, text } = STATUS_STYLE[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className={cn("size-4", text)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const dayFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" });
export const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));

type Filter = RuleKind | "all";

function useDistrictArea(name: string) {
  const { data } = useApi<FeatureCollection<Geometry, PlaceProperties>>(
    "/data/sevilla/distritos.geojson",
  );
  return useMemo(() => {
    const feature = data?.features.find((f) => f.properties.nombre === name);
    return feature ? { type: "FeatureCollection" as const, features: [feature] } : null;
  }, [data, name]);
}

function Summary({ data }: { data: LiveState }) {
  return (
    <ul aria-label="Resumen por tipo de sensor" className="grid gap-3 sm:grid-cols-3">
      {RULE_KINDS.map((kind) => {
        const group = data.sensors.filter((sensor) => sensor.kind === kind);
        const counts = { ok: 0, warning: 0, critical: 0 };
        for (const sensor of group) counts[sensor.status] += 1;
        const values = group.map((sensor) => sensor.value);
        const extreme = kind === "bikes" ? Math.min(...values) : Math.max(...values);
        const unit = group[0]?.unit ?? "";
        return (
          <li key={kind} className="flex flex-col gap-2 rounded-lg border p-3">
            <span className="text-sm font-medium">{KIND_LABELS[kind].title}</span>
            <span className="text-2xl font-semibold tabular-nums">
              {kind === "bikes" ? "mín." : "máx."} {extreme} {unit}
            </span>
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {(["critical", "warning", "ok"] as const).map((status) => (
                <span key={status} className="tabular-nums">
                  <StatusLabel status={status} />: {counts[status]}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Pantalla principal: el día de calor de Triana a la hora del reloj simulado. Mapa con los
 * sensores sobre puntos reales, resumen por tipo y últimas alertas que han disparado las reglas.
 */
export function LivePanel() {
  const clock = useSimClock();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, refetch } = useApi(`/api/live?minute=${clock.step}`, liveStateSchema);
  const area = useDistrictArea("Triana");

  if (!data) {
    if (error) return <ErrorState message={error} onRetry={refetch} />;
    return <LoadingState label="Conectando con los sensores…" />;
  }

  const visible = data.sensors.filter((sensor) => filter === "all" || sensor.kind === filter);
  const latest = data.alerts.slice(0, 6);
  const pending = data.alerts.filter((alert) => !alert.acknowledged).length;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="clock-title" className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="clock-title" className="flex flex-wrap items-center gap-2 font-medium">
              Distrito {data.district} · {formatDay(data.day)}
              <Badge variant="outline">Lecturas simuladas</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Temperatura anclada al día más caluroso de 2025 (Open-Meteo, ERA5) · sensores sobre
              paradas, estaciones y puntos de reciclaje reales
              {error && " · no se ha podido actualizar, se volverá a intentar"}
            </p>
          </div>
          <p
            className="text-4xl font-semibold tabular-nums"
            aria-label={`Hora simulada ${formatMinute(clock.minute)}`}
          >
            {formatMinute(clock.minute)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => clock.setPlaying(!clock.playing)}>
            {clock.playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
            {clock.playing ? "Pausar el día" : "Reproducir el día"}
          </Button>
          <fieldset className="flex items-center gap-1">
            <legend className="sr-only">Velocidad</legend>
            {SPEEDS.map((speed) => (
              <Button
                key={speed}
                size="sm"
                variant={clock.speed === speed ? "default" : "outline"}
                aria-pressed={clock.speed === speed}
                onClick={() => clock.setSpeed(speed)}
              >
                {speed} min/s
              </Button>
            ))}
          </fieldset>
          <Button size="sm" variant="outline" onClick={() => clock.setMinute(14 * 60 + 30)}>
            Ir a las 14:30
          </Button>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>Hora del día simulado</span>
          <input
            type="range"
            min={0}
            max={1439}
            step={STEP_MIN}
            value={clock.minute}
            aria-valuetext={formatMinute(clock.minute)}
            onChange={(event) => {
              clock.setPlaying(false);
              clock.setMinute(Number(event.target.value));
            }}
            className="w-full accent-primary"
          />
        </label>
      </section>

      <Summary data={data} />

      <section aria-labelledby="map-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="map-title" className="text-xl font-semibold">
            Mapa de sensores
          </h2>
          <fieldset className="flex flex-wrap gap-1">
            <legend className="sr-only">Qué sensores mostrar</legend>
            {(["all", ...RULE_KINDS] as const).map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant={filter === kind ? "default" : "outline"}
                aria-pressed={filter === kind}
                onClick={() => setFilter(kind)}
              >
                {kind === "all" ? "Todos" : KIND_LABELS[kind].short}
              </Button>
            ))}
          </fieldset>
        </div>
        {area ? (
          <SevillaLeaflet
            layers={[{ id: "triana", data: area, colorVar: "--chart-4", geometry: "polygon" }]}
            fitToLayers
            points={visible.map((sensor) => ({
              id: sensor.id,
              name: sensor.name,
              detail: `${KIND_LABELS[sensor.kind].short}: ${sensor.value} ${sensor.unit} · ${STATUS_LABELS[sensor.status]}`,
              latitude: sensor.latitude,
              longitude: sensor.longitude,
              colorVar: STATUS_STYLE[sensor.status].colorVar,
            }))}
            label={`Mapa de sensores del Distrito ${data.district}`}
            className="h-96"
            credits={["Ayuntamiento de Sevilla"]}
          />
        ) : (
          <Skeleton className="h-96 w-full" />
        )}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          Leyenda:
          {(["ok", "warning", "critical"] as const).map((status) => (
            <StatusLabel key={status} status={status} />
          ))}
          · Calor: aviso desde 35 °C y crítico desde 40 °C (los cortes de la serie de clima)
        </p>
      </section>

      <section aria-labelledby="alerts-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="alerts-title" className="flex items-center gap-2 text-xl font-semibold">
            <BellRingIcon aria-hidden="true" className="size-5" />
            Últimas alertas
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/alertas">Ver las {pending} pendientes</Link>
          </Button>
        </div>
        <p aria-live="polite" className="sr-only">
          {data.alerts.length} alertas hasta las {data.time}
        </p>
        {latest.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguna regla se ha disparado todavía hoy. Prueba a reproducir el día o ir a las 14:30.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {latest.map((alert) => (
              <li key={alert.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {alert.time} · {alert.ruleName}
                  </span>
                  <Badge variant={alert.acknowledged ? "outline" : "default"}>
                    {alert.acknowledged ? "Atendida" : "Pendiente"}
                  </Badge>
                </span>
                <span>
                  {alert.sensorName}: {alert.value} {alert.unit}
                </span>
                <span className="text-muted-foreground">
                  {alert.action}
                  {alert.target && `: ${alert.target.name} (a ${alert.target.distanceM} m)`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground hover:text-foreground">
          Ver todas las lecturas en una tabla
        </summary>
        <Table className="mt-2">
          <TableCaption className="sr-only">Lecturas simuladas a las {data.time}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Punto</TableHead>
              <TableHead>Sensor</TableHead>
              <TableHead className="text-right">Lectura</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((sensor) => (
              <TableRow key={sensor.id}>
                <TableCell>{sensor.name}</TableCell>
                <TableCell>{KIND_LABELS[sensor.kind].short}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {sensor.value} {sensor.unit}
                </TableCell>
                <TableCell>
                  <StatusLabel status={sensor.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  );
}
