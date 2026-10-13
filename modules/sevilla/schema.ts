import { z } from "@/lib/zod";

// Lo mínimo que la interfaz necesita de cada archivo de public/data/sevilla: si un archivo
// se rompe o se sustituye por otro formato, se avisa en vez de pintar un mapa vacío.
export const placeCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  metadata: z.object({
    layer: z.string(),
    title: z.string(),
    source: z.string(),
    sourceUrl: z.string().optional(),
    url: z.string(),
    downloadedAt: z.string(),
  }),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: z.looseObject({ type: z.string() }),
      properties: z.looseObject({ nombre: z.string(), detalle: z.string().optional() }),
    }),
  ),
});
