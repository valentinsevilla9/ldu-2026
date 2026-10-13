import { z } from "@/lib/zod";
import { RULE_KINDS } from "./schema";

// Forma de GET /api/live, validada en el navegador con useApi.

const located = { latitude: z.number(), longitude: z.number() };

export const liveAlertSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleName: z.string(),
  kind: z.enum(RULE_KINDS),
  notify: z.string(),
  sensorId: z.string(),
  sensorName: z.string(),
  ...located,
  minute: z.number(),
  time: z.string(),
  value: z.number(),
  unit: z.string(),
  active: z.boolean(),
  acknowledged: z.boolean(),
  action: z.string(),
  target: z.object({ name: z.string(), distanceM: z.number(), ...located }).nullable(),
});

export const liveStateSchema = z.object({
  day: z.string(),
  district: z.string(),
  minute: z.number(),
  time: z.string(),
  simulated: z.literal(true),
  sensors: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(RULE_KINDS),
      ...located,
      value: z.number(),
      status: z.enum(["ok", "warning", "critical"]),
      unit: z.string(),
    }),
  ),
  alerts: z.array(liveAlertSchema),
});

export type LiveAlert = z.output<typeof liveAlertSchema>;
export type LiveState = z.output<typeof liveStateSchema>;

export const KIND_LABELS = {
  heat: { title: "Calor en paradas de TUSSAM", short: "Calor" },
  bikes: { title: "Bicis libres en Sevici", short: "Sevici" },
  bins: { title: "Llenado de contenedores", short: "Contenedores" },
} as const;
