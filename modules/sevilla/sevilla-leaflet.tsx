"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import { useTheme } from "next-themes";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LAYER_SOURCES, type PlaceProperties } from "./layers";

// Mapa de Sevilla con capas GeoJSON y, opcionalmente, puntos coloreados por estado (el
// simulador de sensores). Solo en el navegador: se carga con next/dynamic y ssr: false.
// Se dibuja en canvas: con más de mil paradas, un elemento HTML por punto iría lento.

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';
// Short names of the sources of the layers on the map (OpenStreetMap is always credited above).
const defaultCredits = [LAYER_SOURCES.cda.credit ?? ""];
const attribution = (credits: string[]) =>
  credits.length > 0 ? `${OSM_CREDIT} · Datos: ${credits.join(", ")}` : OSM_CREDIT;
const SEVILLA_CENTER: [number, number] = [37.3891, -5.9845];

export type MapLayer = {
  id: string;
  /** Only the features are drawn: a full PlaceCollection (with metadata) also fits. */
  data: FeatureCollection<Geometry, PlaceProperties>;
  /** CSS custom property with the colour, e.g. "--chart-1". */
  colorVar: string;
  geometry: "point" | "line" | "polygon";
};

export type StatusPoint = {
  id: string;
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
  colorVar: string;
};

// Canvas can't read CSS variables: resolve them to real colours (this file only runs in the
// browser). The theme is read so that switching light/dark redraws with the new values.
const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#666666";

// Polygons first, then lines, then points, so nothing small ends up hidden underneath.
const DRAW_ORDER = { polygon: 0, line: 1, point: 2 };

/** Popup content built as text nodes: data from the portal never becomes HTML. */
function popupContent({ nombre, detalle }: PlaceProperties) {
  const container = document.createElement("div");
  const name = document.createElement("p");
  name.style.margin = "0";
  name.style.fontWeight = "600";
  name.textContent = nombre;
  container.append(name);
  if (detalle) {
    const detail = document.createElement("p");
    detail.style.margin = "0";
    detail.textContent = detalle;
    container.append(detail);
  }
  return container;
}

/** Frames the map on the layers it has when it first appears; the visitor's own zoom is then left alone. */
function FitToLayers({ layers }: { layers: MapLayer[] }) {
  const map = useMap();
  const initial = useRef(layers);
  useEffect(() => {
    const bounds = L.latLngBounds([]);
    for (const layer of initial.current) bounds.extend(L.geoJSON(layer.data).getBounds());
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [8, 8] });
  }, [map]);
  return null;
}

export default function SevillaLeaflet({
  layers,
  points = [],
  label,
  className = "h-96",
  credits = defaultCredits,
  fitToLayers = false,
}: {
  layers: MapLayer[];
  points?: StatusPoint[];
  label: string;
  className?: string;
  /** Who published the data on the map, for the attribution line. */
  credits?: string[];
  /** Frame the map on the layers instead of on the centre of Sevilla (areas that fill the city). */
  fitToLayers?: boolean;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const { resolvedTheme } = useTheme();
  const ordered = [...layers].sort((a, b) => DRAW_ORDER[a.geometry] - DRAW_ORDER[b.geometry]);

  return (
    <div className="flex flex-col gap-2">
      {tilesFailed && (
        <p role="status" className="text-sm text-muted-foreground">
          No se ha podido cargar el mapa base (¿sin conexión?). Los datos siguen siendo válidos.
        </p>
      )}
      <MapContainer
        center={SEVILLA_CENTER}
        zoom={12}
        preferCanvas
        scrollWheelZoom={false}
        zoomControl={false}
        className={`${className} w-full rounded-lg border bg-muted`}
        aria-label={`${label}. Usa las flechas para desplazarte y + o - para el zoom.`}
      >
        {/* Leaflet's own buttons are labelled in English. */}
        <ZoomControl zoomInTitle="Acercar" zoomOutTitle="Alejar" />
        {fitToLayers && <FitToLayers layers={layers} />}
        <TileLayer
          // A new key re-creates the layer: its attribution can't change in place.
          key={credits.join("|")}
          url={TILE_URL}
          attribution={attribution(credits)}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />
        {ordered.map((layer) => {
          const color = cssVar(layer.colorVar);
          return (
            // A GeoJSON layer can't be restyled in place: a new key (theme) redraws it.
            <GeoJSON
              key={`${layer.id}-${resolvedTheme}`}
              data={layer.data}
              // Leaflet applies `style` to points too, so each geometry gets its own look:
              // filled dots with a white edge, solid lines, outlined areas with a faint fill.
              style={() => {
                if (layer.geometry === "point") {
                  return { color: "#ffffff", weight: 1, fillColor: color, fillOpacity: 0.9 };
                }
                return {
                  color,
                  weight: layer.geometry === "polygon" ? 2 : 3,
                  fillColor: color,
                  fillOpacity: layer.geometry === "polygon" ? 0.1 : 0,
                };
              }}
              pointToLayer={(_feature, latlng) => L.circleMarker(latlng, { radius: 4 })}
              onEachFeature={(feature, leafletLayer) =>
                leafletLayer.bindPopup(() => popupContent(feature.properties as PlaceProperties))
              }
            />
          );
        })}
        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: cssVar(point.colorVar),
              fillOpacity: 1,
            }}
          >
            <Popup>
              <p className="m-0 font-semibold">{point.name}</p>
              <p className="m-0">{point.detail}</p>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
