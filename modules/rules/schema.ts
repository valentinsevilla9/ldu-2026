import { z } from "@/lib/zod";
import { SENSOR_KIND_IDS } from "@/modules/sensors/simulate";
import { RULE_OPERATORS } from "./engine";

// Esquemas de las reglas, compartidos por el formulario, la API y el seed.

// Solo los tres tipos de sensor del reto (calor, Sevici, contenedores).
export const RULE_KINDS = [
  "heat",
  "bikes",
  "bins",
] as const satisfies readonly (typeof SENSOR_KIND_IDS)[number][];
export type RuleKind = (typeof RULE_KINDS)[number];

/** Lo que pide hacer cada tipo de regla cuando se dispara (el «entonces»). */
export const RULE_ACTIONS: Record<RuleKind, string> = {
  heat: "Revisar cobertura y solicitar activación de un refugio habilitado",
  bikes: "Solicitar reposición y consultar la estación cercana con al menos 5 bicis",
  bins: "Orientar al vecino hacia otro punto compatible y solicitar recogida",
};

const hour = (label: string) =>
  z.coerce
    .number({ error: `La hora ${label} debe ser un número.` })
    .int(`La hora ${label} debe ser un número entero.`)
    .min(0, `La hora ${label} va de 0 a 24.`)
    .max(24, `La hora ${label} va de 0 a 24.`);

const minutes = (label: string, max: number) =>
  z.coerce
    .number({ error: `${label} debe ser un número.` })
    .int(`${label} debe ser un número entero de minutos.`)
    .min(0, `${label} no puede ser negativa.`)
    .max(max, `${label} no puede superar ${max} minutos.`);

const ruleFields = {
  name: z
    .string({ error: "Indica un nombre." })
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(80, "El nombre no puede superar los 80 caracteres."),
  kind: z.enum(RULE_KINDS, { error: "Elige un tipo de sensor." }),
  operator: z.enum(RULE_OPERATORS, { error: "Elige una comparación." }),
  threshold: z.coerce
    .number({ error: "El umbral debe ser un número." })
    .min(-50, "El umbral no es válido.")
    .max(1000, "El umbral no es válido."),
  durationMin: minutes("La duración", 600),
  fromHour: hour("de inicio"),
  toHour: hour("de fin"),
  cooldownMin: minutes("La espera entre avisos", 1440),
  notify: z.string().trim().max(120, "Como máximo 120 caracteres."),
  enabled: z.boolean(),
};

export const ruleInputSchema = z.object({
  ...ruleFields,
  notify: ruleFields.notify.default(""),
  enabled: ruleFields.enabled.default(true),
});

export const ruleUpdateSchema = z
  .object(ruleFields)
  .partial()
  .refine((fields) => Object.keys(fields).length > 0, "Indica al menos un campo que actualizar.");

export const ruleSchema = z.object(ruleFields).extend({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const ruleListSchema = z.array(ruleSchema);

export type RuleFormValues = z.input<typeof ruleInputSchema>;
export type RuleInput = z.output<typeof ruleInputSchema>;
export type Rule = z.output<typeof ruleSchema>;
