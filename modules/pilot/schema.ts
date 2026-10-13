import { z } from "@/lib/zod";

export const pilotQuerySchema = z.object({
  runId: z.string().uuid(),
  minute: z.coerce.number().int().min(0).max(1439),
  maxDistance: z.coerce.number().int().min(100).max(3000).default(1000),
});
// El origen es un punto del piloto (`originId`) o la ubicación del vecino (latitud y longitud).
export const requestSchema = pilotQuerySchema
  .extend({
    kind: z.enum(["heat", "bins", "bikes"]),
    originId: z.string().min(1).max(100).optional(),
    latitude: z.number().min(36).max(39).optional(),
    longitude: z.number().min(-7).max(-5).optional(),
    material: z.enum(["vidrio", "papel", "envases", "ropa", "pilas"]).default("envases"),
  })
  .refine(
    (request) => request.originId || (request.latitude != null && request.longitude != null),
    { message: "Indica un punto de origen o tu ubicación.", path: ["originId"] },
  );
export const actionSchema = pilotQuerySchema.extend({
  operation: z.enum(["open", "empty", "refill", "requestHeat", "requestBins", "requestBikes"]),
  targetId: z.string().min(1).max(100),
});
export type PilotQuery = z.output<typeof pilotQuerySchema>;
export type PilotRequest = z.output<typeof requestSchema>;

export type Resource = {
  id: string;
  name: string;
  kind: "heat" | "bins" | "bikes";
  latitude: number;
  longitude: number;
  value: number;
  materials: string[];
  open: boolean;
  capacity: number;
  occupied: number;
  enabled: boolean;
  closeMinute: number;
};
export type Plan = {
  mode: "simulated";
  status: "available" | "needs-action" | "unavailable";
  target: (Resource & { distanceM: number }) | null;
  requestTargetId: string | null;
  reason: string;
  tools: { name: string; result: string }[];
};
