"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  BikeIcon,
  CircleCheckIcon,
  LocateFixedIcon,
  MapPinIcon,
  RecycleIcon,
  SunIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/hooks/use-api";
import { formatMinute } from "@/modules/rules/engine";
import { useSimClock } from "@/modules/rules/use-sim-clock";
import { usePilotRun } from "./pilot-panel";
import type { Plan } from "./schema";

const SevillaLeaflet = dynamic(() => import("@/modules/sevilla/sevilla-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

type Kind = "heat" | "bins" | "bikes";
const SERVICES: { kind: Kind; label: string; icon: typeof SunIcon }[] = [
  { kind: "heat", label: "Refugio del calor", icon: SunIcon },
  { kind: "bins", label: "Reciclar", icon: RecycleIcon },
  { kind: "bikes", label: "Coger una bici", icon: BikeIcon },
];
const MATERIALS = ["envases", "vidrio", "papel", "ropa", "pilas"] as const;
const REQUEST_OPERATION = { heat: "requestHeat", bins: "requestBins", bikes: "requestBikes" };

// Punto de demostración real (parada de TUSSAM San Jorge, en el Altozano, Triana): se usa si el
// vecino no comparte su ubicación o está fuera de la zona del piloto.
const DEMO_POINT = { latitude: 37.38545, longitude: -6.00412, label: "Plaza del Altozano, Triana" };
// Recuadro aproximado del Distrito Triana (incluye La Cartuja) para saber si se está en el piloto.
const PILOT_BOX = { south: 37.365, north: 37.415, west: -6.03, east: -5.99 };

type Location = { latitude: number; longitude: number; label: string; real: boolean };

/**
 * App del vecino: comparte su ubicación (o usa el punto de demostración), elige qué necesita y
 * recibe una alternativa que se puede usar ahora o la opción de avisar al Ayuntamiento.
 */
export function CitizenApp() {
  const clock = useSimClock();
  const { runId, restart } = usePilotRun();
  const [location, setLocation] = useState<Location>({ ...DEMO_POINT, real: false });
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [kind, setKind] = useState<Kind>("heat");
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]>("envases");
  const [maxDistance, setMaxDistance] = useState(1000);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocationNote(
        "Este navegador no permite compartir la ubicación. Usamos el punto de demostración.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const inside =
          coords.latitude >= PILOT_BOX.south &&
          coords.latitude <= PILOT_BOX.north &&
          coords.longitude >= PILOT_BOX.west &&
          coords.longitude <= PILOT_BOX.east;
        if (inside) {
          setLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: "Tu ubicación actual",
            real: true,
          });
          setLocationNote(
            `Ubicación real con una precisión de unos ${Math.round(coords.accuracy)} m.`,
          );
        } else {
          setLocation({ ...DEMO_POINT, real: false });
          setLocationNote(
            "Estás fuera de la zona del piloto (Distrito Triana). Usamos el punto de demostración.",
          );
        }
        setPlan(null);
      },
      (error) => {
        setLocating(false);
        setLocationNote(
          error.code === error.PERMISSION_DENIED
            ? "No has dado permiso de ubicación. Usamos el punto de demostración."
            : "No se ha podido obtener tu ubicación. Usamos el punto de demostración.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  async function search() {
    setBusy(true);
    setMessage("");
    try {
      setPlan(
        await fetchJson<Plan>("/api/pilot/plan", {
          method: "POST",
          json: {
            runId,
            minute: clock.step,
            maxDistance,
            kind,
            material,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }),
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se ha podido buscar ahora.");
    } finally {
      setBusy(false);
    }
  }

  async function notifyCityHall(targetId: string) {
    setBusy(true);
    setMessage("");
    try {
      await fetchJson("/api/pilot", {
        method: "POST",
        json: {
          runId,
          minute: clock.step,
          maxDistance,
          operation: REQUEST_OPERATION[kind],
          targetId,
        },
      });
      setPlan(null);
      setMessage(
        "Aviso enviado al Ayuntamiento. Vuelve a buscar cuando el responsable lo confirme (en Gestión).",
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se ha podido enviar el aviso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <aside
        aria-label="Controles de la demostración"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm"
      >
        <span className="font-medium">Demo (no forma parte de la app):</span>
        <span className="tabular-nums">hora simulada {formatMinute(clock.minute)}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => (clock.setMinute(13 * 60), setPlan(null))}
        >
          13:00
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => (clock.setMinute(14 * 60 + 30), setPlan(null))}
        >
          14:30 calor
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => (clock.setMinute(20 * 60 + 30), setPlan(null))}
        >
          20:30 reciclaje
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (restart(), setPlan(null), setMessage(""))}
        >
          Nueva sesión
        </Button>
      </aside>

      <section
        aria-label="App de Sevilla Activa para el vecino"
        className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-[2rem] border-8 border-foreground/80 bg-background p-5 shadow-xl"
      >
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Sevilla Activa
            </p>
            <h2 className="text-xl font-semibold">¿Qué necesitas cerca?</h2>
          </div>
          <Badge variant="outline">{formatMinute(clock.minute)}</Badge>
        </header>

        <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <MapPinIcon aria-hidden="true" className="size-4 text-primary" />
            {location.label}
            {!location.real && <span className="text-muted-foreground">(demostración)</span>}
          </p>
          <Button size="sm" variant="outline" onClick={locate} disabled={locating}>
            <LocateFixedIcon aria-hidden="true" />
            {locating ? "Buscando tu ubicación…" : "Usar mi ubicación"}
          </Button>
          {locationNote && (
            <p role="status" className="text-xs text-muted-foreground">
              {locationNote}
            </p>
          )}
        </div>

        <fieldset className="grid grid-cols-3 gap-2">
          <legend className="sr-only">Qué necesitas</legend>
          {SERVICES.map(({ kind: item, label, icon: Icon }) => (
            <Button
              key={item}
              variant={kind === item ? "default" : "outline"}
              aria-pressed={kind === item}
              className="h-auto flex-col gap-1 py-3 text-xs whitespace-normal"
              onClick={() => (setKind(item), setPlan(null))}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Button>
          ))}
        </fieldset>

        {kind === "bins" && (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm font-medium">¿Qué vas a tirar?</legend>
            {MATERIALS.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={material === item ? "default" : "outline"}
                aria-pressed={material === item}
                onClick={() => (setMaterial(item), setPlan(null))}
              >
                {item}
              </Button>
            ))}
          </fieldset>
        )}

        <label className="flex items-center justify-between gap-2 text-sm">
          Como mucho a
          <select
            value={maxDistance}
            onChange={(event) => (setMaxDistance(Number(event.target.value)), setPlan(null))}
            className="rounded-md border bg-background px-2 py-1"
          >
            {[500, 1000, 2000].map((value) => (
              <option key={value} value={value}>
                {value} m
              </option>
            ))}
          </select>
        </label>

        <Button size="lg" onClick={search} disabled={busy || !runId}>
          {busy ? "Buscando…" : "Buscar ahora"}
        </Button>

        {plan && (
          <div role="status" className="flex flex-col gap-3 rounded-xl border p-4">
            <p className="flex items-center gap-2 font-semibold">
              {plan.status === "available" ? (
                <CircleCheckIcon aria-hidden="true" className="size-5 text-status-ok" />
              ) : (
                <TriangleAlertIcon aria-hidden="true" className="size-5 text-status-warning" />
              )}
              {plan.target?.name ??
                (plan.status === "needs-action"
                  ? "Ahora no hay ninguno disponible"
                  : "Sin alternativa cerca")}
            </p>
            {plan.target && (
              <p className="text-sm">A {plan.target.distanceM} m de ti, en línea recta.</p>
            )}
            <p className="text-sm text-muted-foreground">{plan.reason}</p>
            {plan.target && (
              <SevillaLeaflet
                layers={[]}
                points={[
                  {
                    id: "me",
                    name: location.label,
                    detail: "Tu punto de partida",
                    latitude: location.latitude,
                    longitude: location.longitude,
                    colorVar: "--chart-1",
                  },
                  {
                    id: plan.target.id,
                    name: plan.target.name,
                    detail: `A ${plan.target.distanceM} m`,
                    latitude: plan.target.latitude,
                    longitude: plan.target.longitude,
                    colorVar: "--status-ok",
                  },
                ]}
                label={`Mapa: tú y ${plan.target.name}`}
                className="h-48"
              />
            )}
            {plan.requestTargetId && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => notifyCityHall(plan.requestTargetId!)}
              >
                Avisar al Ayuntamiento
              </Button>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer">Cómo se ha decidido</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                {plan.tools.map((tool) => (
                  <li key={tool.name}>
                    <strong>{tool.name}:</strong> {tool.result}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        )}
        {message && (
          <p role="status" className="rounded-md border p-3 text-sm">
            {message}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Ubicaciones reales; disponibilidad simulada en el piloto.
        </p>
      </section>
    </div>
  );
}
