"use client";

import { useEffect, useId, useState } from "react";
import dynamic from "next/dynamic";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { ApiError, fetchJson } from "@/hooks/use-api";
import {
  LAYER_GROUPS,
  LAYER_IDS,
  getLayer,
  layerSource,
  layerUrl,
  type LayerGroup,
  type LayerId,
  type PlaceCollection,
} from "./layers";
import { placeCollectionSchema } from "./schema";

const SevillaLeaflet = dynamic(() => import("./sevilla-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

const TABLE_ROWS = 100;
const count = new Intl.NumberFormat("es-ES");
const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

// One request per layer for the whole page, shared by every map that shows it.
const requests = new Map<LayerId, Promise<PlaceCollection>>();
function loadLayer(id: LayerId): Promise<PlaceCollection> {
  let request = requests.get(id);
  if (!request) {
    // The schema checks what the UI relies on (names, metadata); geometries go to Leaflet as is.
    request = fetchJson(layerUrl(id), {
      schema: placeCollectionSchema,
    }) as unknown as Promise<PlaceCollection>;
    request.catch(() => requests.delete(id)); // a failed layer can be retried
    requests.set(id, request);
  }
  return request;
}

/**
 * Mapa con datos abiertos reales de Sevilla (public/data/sevilla). Funciona sin internet salvo el mapa base. Las capas activas se
 * pueden consultar también como tabla, porque un mapa no es accesible por sí solo. En
 * páginas largas, mejor `LazySevillaMap`, que no descarga nada hasta que el mapa se ve.
 */
export function SevillaMap({
  initial = ["distritos", "tussam-paradas"],
  available = LAYER_IDS,
  showControls = true,
  label = "Mapa de Sevilla",
}: {
  /** Capas visibles al cargar. */
  initial?: readonly LayerId[];
  /** Capas que se pueden activar con las casillas. */
  available?: readonly LayerId[];
  showControls?: boolean;
  label?: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState<LayerId[]>([...initial]);
  const [loaded, setLoaded] = useState<Partial<Record<LayerId, PlaceCollection>>>({});
  const [failed, setFailed] = useState<Partial<Record<LayerId, string>>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    for (const id of active) {
      loadLayer(id)
        .then((data) => setLoaded((previous) => ({ ...previous, [id]: data })))
        .catch((error: unknown) =>
          setFailed((previous) => ({
            ...previous,
            [id]: error instanceof ApiError ? error.message : "No se ha podido cargar la capa.",
          })),
        );
    }
  }, [active, attempt]);

  function toggle(id: LayerId, checked: boolean) {
    setActive((previous) =>
      checked ? [...previous, id] : previous.filter((layer) => layer !== id),
    );
  }

  function retry() {
    setFailed({});
    setAttempt((value) => value + 1);
  }

  const shown = active.flatMap((id) => {
    const data = loaded[id];
    if (!data) return [];
    const layer = getLayer(id);
    return [{ id, data, geometry: layer.geometry, colorVar: LAYER_GROUPS[layer.group].colorVar }];
  });
  const loading = active.filter((id) => !loaded[id] && !failed[id]);
  const errors = active.filter((id) => failed[id]);
  // Each active layer credits its own source (Ayuntamiento, OpenStreetMap, Junta de Andalucía…).
  const sources = [
    ...new Map(
      active.map((id) => [layerSource(getLayer(id)).name, layerSource(getLayer(id))]),
    ).values(),
  ];
  const dates = [...new Set(shown.map(({ data }) => data.metadata.downloadedAt))].sort();
  const downloaded =
    dates.length === 0
      ? ""
      : dates.length === 1
        ? `, descargados el ${date.format(new Date(dates[0]))}`
        : `, descargados entre el ${date.format(new Date(dates[0]))} y el ${date.format(new Date(dates[dates.length - 1]))}`;
  const groups = (Object.keys(LAYER_GROUPS) as LayerGroup[])
    .map((group) => ({ group, ids: available.filter((id) => getLayer(id).group === group) }))
    .filter(({ ids }) => ids.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {showControls && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Capas</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {groups.map(({ group, ids }) => (
              <div key={group} className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-full"
                    style={{ background: `var(${LAYER_GROUPS[group].colorVar})` }}
                  />
                  {LAYER_GROUPS[group].label}
                </p>
                {ids.map((id) => {
                  const checkboxId = `${baseId}-${id}`;
                  const total = loaded[id]?.features.length;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Checkbox
                        id={checkboxId}
                        checked={active.includes(id)}
                        onCheckedChange={(checked) => toggle(id, checked === true)}
                      />
                      <Label htmlFor={checkboxId} className="font-normal">
                        {getLayer(id).title}
                        {total !== undefined && (
                          <>
                            {" "}
                            <span className="text-muted-foreground">({count.format(total)})</span>
                          </>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <p role="status" className="sr-only">
        {loading.length > 0
          ? `Cargando ${loading.map((id) => getLayer(id).title).join(", ")}…`
          : ""}
      </p>
      {errors.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 px-4 py-3 text-sm"
        >
          No se han podido cargar: {errors.map((id) => getLayer(id).title).join(", ")}.
          <Button variant="outline" size="sm" onClick={retry}>
            <RotateCcwIcon aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      <SevillaLeaflet
        layers={shown}
        label={label}
        credits={sources.flatMap((source) => (source.credit ? [source.credit] : []))}
      />

      <p className="text-xs text-muted-foreground">
        Datos:{" "}
        {sources.map((source, index) => (
          <span key={source.name}>
            {index > 0 && "; "}
            <a href={source.url} className="underline underline-offset-4">
              {source.name}
            </a>
          </span>
        ))}
        {downloaded}.
      </p>

      {shown.length > 0 && (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground hover:text-foreground">
            Ver los datos del mapa en una tabla
          </summary>
          <div className="mt-2 flex flex-col gap-6">
            {shown.map(({ id, data }) => (
              <Table key={id}>
                <TableCaption className="mt-0 mb-2 text-left">
                  {getLayer(id).title}: {count.format(data.features.length)} elementos
                  {data.features.length > TABLE_ROWS &&
                    ` (se muestran los ${TABLE_ROWS} primeros; el archivo completo está en ${layerUrl(id)})`}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.features.slice(0, TABLE_ROWS).map((feature, index) => (
                    <TableRow key={index}>
                      <TableCell>{feature.properties.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {feature.properties.detalle}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
