import type { Feature, FeatureCollection, Geometry } from "geojson";

// Capas de datos abiertos de Sevilla que usa AlertaCalle, guardadas en public/data/sevilla/
// para funcionar sin internet. Dos orígenes (`provider`):
//  - cda: Ayuntamiento de Sevilla, Centro de Datos Urbanos (ide.SEVILLA), 5 de octubre de 2026.
//  - osm: OpenStreetMap (API Overpass, término municipal de Sevilla), 11 de octubre de 2026.
// Cada archivo lleva en `metadata` su fuente, el enlace al conjunto y la fecha de descarga.

export const SEVILLA_SOURCE = {
  name: "Ayuntamiento de Sevilla, Centro de Datos Urbanos (ide.SEVILLA)",
  url: "https://cda-idesevilla.opendata.arcgis.com/",
};

export type LayerProvider = "cda" | "osm";

/**
 * `credit`: nombre corto para la atribución del mapa. OpenStreetMap no lleva porque ya figura
 * siempre, por el mapa base.
 */
export const LAYER_SOURCES: Record<
  LayerProvider,
  { name: string; url: string; credit: string | null }
> = {
  cda: { ...SEVILLA_SOURCE, credit: "Ayuntamiento de Sevilla" },
  osm: {
    name: "© colaboradores de OpenStreetMap (licencia ODbL)",
    url: "https://www.openstreetmap.org/copyright",
    credit: null,
  },
};

export type LayerGroup = "movilidad" | "servicios" | "territorio";

/** Colours follow the categorical palette in fixed order (app/globals.css). */
export const LAYER_GROUPS: Record<LayerGroup, { label: string; colorVar: string }> = {
  movilidad: { label: "Movilidad", colorVar: "--chart-1" },
  servicios: { label: "Refugios posibles", colorVar: "--chart-2" },
  territorio: { label: "Territorio y medio ambiente", colorVar: "--chart-4" },
};

/** What every saved feature carries: a name and, optionally, one line of detail. */
export type PlaceProperties = { nombre: string; detalle?: string } & Record<
  string,
  string | number | undefined
>;
export type PlaceFeature = Feature<Geometry, PlaceProperties>;
export type PlaceCollection = FeatureCollection<Geometry, PlaceProperties> & {
  metadata: {
    layer: string;
    title: string;
    source: string;
    sourceUrl?: string;
    url: string;
    downloadedAt: string;
  };
};

export type LayerConfig = {
  id: string;
  title: string;
  geometry: "point" | "line" | "polygon";
  group: LayerGroup;
  provider?: LayerProvider;
};

export const layerSource = (layer: LayerConfig) => LAYER_SOURCES[layer.provider ?? "cda"];

export const SEVILLA_LAYERS = [
  { id: "distritos", title: "Distritos", geometry: "polygon", group: "territorio" },
  {
    id: "tussam-paradas",
    title: "Paradas de autobús (TUSSAM)",
    geometry: "point",
    group: "movilidad",
  },
  { id: "sevici", title: "Estaciones de Sevici", geometry: "point", group: "movilidad" },
  {
    id: "reciclaje",
    title: "Contenedores y puntos de reciclaje",
    geometry: "point",
    group: "territorio",
    provider: "osm",
  },
  { id: "bibliotecas", title: "Bibliotecas municipales", geometry: "point", group: "servicios" },
  { id: "centros-civicos", title: "Centros cívicos", geometry: "point", group: "servicios" },
] as const satisfies readonly LayerConfig[];

export type LayerId = (typeof SEVILLA_LAYERS)[number]["id"];
export const LAYER_IDS = SEVILLA_LAYERS.map((layer) => layer.id) as [LayerId, ...LayerId[]];

export const getLayer = (id: LayerId): LayerConfig =>
  SEVILLA_LAYERS.find((layer) => layer.id === id)!;

/** Public URL of a layer (files live in public/data/sevilla/). */
export const layerUrl = (id: LayerId) => `/data/sevilla/${id}.geojson`;
