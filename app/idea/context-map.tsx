"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MultiPolygon, Polygon } from "geojson";
import { fetchJson } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import type { LayerId, PlaceCollection } from "@/modules/sevilla/layers";

export const MAP_KEYS = [
  {
    id: "tussam-paradas",
    label: "Paradas TUSSAM · sensores de calor simulados",
    symbol: "T",
    color: "#b45309",
  },
  { id: "sevici", label: "Estaciones de Sevici", symbol: "S", color: "#1d4ed8" },
  { id: "reciclaje", label: "Puntos de reciclaje", symbol: "R", color: "#15803d" },
  {
    id: "bibliotecas",
    label: "Bibliotecas · equipamientos candidatos",
    symbol: "B",
    color: "#7e22ce",
  },
  {
    id: "centros-civicos",
    label: "Centros cívicos · equipamientos candidatos",
    symbol: "C",
    color: "#be123c",
  },
] as const;
export type ContextData = Partial<Record<LayerId, PlaceCollection>>;
const ContextLeaflet = dynamic(() => import("./context-leaflet"), {
  ssr: false,
  loading: () => <LoadingState label="Preparando el mapa…" />,
});

function insideRing(point: number[], ring: number[][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inDistrict(point: number[], area: Polygon | MultiPolygon) {
  const polygons = area.type === "Polygon" ? [area.coordinates] : area.coordinates;
  return polygons.some(
    ([outer, ...holes]) =>
      insideRing(point, outer) && !holes.some((hole) => insideRing(point, hole)),
  );
}

/** Mapa exclusivo del inicio: no modifica la vista de la app ni sus componentes compartidos. */
export function ContextMap({ initial }: { initial: readonly LayerId[] }) {
  const [data, setData] = useState<ContextData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<string[]>(MAP_KEYS.map((key) => key.id));
  useEffect(() => {
    const controller = new AbortController();
    const ids = [...new Set(["distritos", ...initial])] as LayerId[];
    Promise.all(
      ids.map(
        async (id) =>
          [
            id,
            await fetchJson<PlaceCollection>(`/data/sevilla/${id}.geojson`, {
              signal: controller.signal,
            }),
          ] as const,
      ),
    )
      .then((entries) => {
        const raw = Object.fromEntries(entries) as ContextData;
        const district = raw.distritos?.features.find(
          (feature) => feature.properties.nombre === "Triana",
        );
        if (!district || !["Polygon", "MultiPolygon"].includes(district.geometry.type))
          throw new Error("No se encuentra el límite de Triana.");
        const area = district.geometry as Polygon | MultiPolygon;
        const filtered: ContextData = { distritos: { ...raw.distritos!, features: [district] } };
        for (const key of MAP_KEYS) {
          const layer = raw[key.id];
          if (layer)
            filtered[key.id] = {
              ...layer,
              features: layer.features.filter(
                (feature) =>
                  feature.geometry.type === "Point" &&
                  inDistrict(feature.geometry.coordinates as number[], area),
              ),
            };
        }
        if (!controller.signal.aborted) {
          setData(filtered);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se ha podido cargar el mapa.");
      });
    return () => controller.abort();
  }, [initial, attempt]);
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError("");
          setAttempt((value) => value + 1);
        }}
      />
    );
  if (!data) return <LoadingState label="Cargando ubicaciones reales de Triana…" />;
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="rounded-xl border p-4">
        <legend className="px-2 font-semibold">Leyenda y capas visibles</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MAP_KEYS.filter((key) => data[key.id]).map((key) => (
            <label key={key.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active.includes(key.id)}
                onChange={(event) =>
                  setActive((previous) =>
                    event.target.checked
                      ? [...previous, key.id]
                      : previous.filter((id) => id !== key.id),
                  )
                }
              />
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: key.color }}
              >
                {key.symbol}
              </span>
              <span>
                {key.label} ({data[key.id]?.features.length})
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          El contorno delimita Triana. Activa una capa para explorarla y pulsa un punto para ver su
          nombre. Las letras distinguen categorías; no indican niveles de riesgo ni disponibilidad.
          Los símbolos de biblioteca y centro cívico se separan ligeramente cuando coinciden.
        </p>
      </fieldset>
      <ContextLeaflet data={data} active={active} />
      <p className="text-sm text-muted-foreground">
        Ubicaciones reales del Ayuntamiento de Sevilla y colaboradores de OpenStreetMap (ODbL),
        octubre de 2026. Las bibliotecas y centros cívicos son candidatos, no refugios verificados.
        En la app se simulan habilitación, horarios y plazas.
      </p>
      <details>
        <summary className="w-fit cursor-pointer text-sm font-medium">
          Consultar los puntos como tabla
        </summary>
        <div className="mt-3 max-h-96 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Ubicaciones de las capas visibles en Triana</caption>
            <thead>
              <tr>
                <th className="p-3">Tipo</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {MAP_KEYS.filter((key) => active.includes(key.id)).flatMap(
                (key) =>
                  data[key.id]?.features.map((feature, index) => (
                    <tr key={`${key.id}-${index}`} className="border-t">
                      <td className="p-3">
                        {key.symbol} ·{" "}
                        {key.id === "tussam-paradas"
                          ? "Parada TUSSAM"
                          : key.id === "sevici"
                            ? "Sevici"
                            : key.id === "reciclaje"
                              ? "Reciclaje"
                              : key.id === "bibliotecas"
                                ? "Biblioteca"
                                : "Centro cívico"}
                      </td>
                      <td className="p-3">{feature.properties.nombre}</td>
                      <td className="p-3">
                        {feature.properties.detalle ?? "Sin detalle documentado"}
                      </td>
                    </tr>
                  )) ?? [],
              )}
            </tbody>
          </table>
        </div>
      </details>
      <Button
        className="w-fit"
        size="sm"
        variant="outline"
        onClick={() => setActive(MAP_KEYS.map((key) => key.id))}
      >
        Mostrar todas las categorías
      </Button>
    </div>
  );
}
