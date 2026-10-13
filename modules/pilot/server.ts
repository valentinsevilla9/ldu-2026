import { prisma } from "@/lib/db";
import { notFoundError } from "@/lib/api/errors";
import { getSensors, getRefuges, valueAt } from "@/modules/rules/server";
import { planRequest, usable } from "./planner";
import {
  actionSchema,
  requestSchema,
  type PilotQuery,
  type PilotRequest,
  type Resource,
} from "./schema";

/**
 * Recursos del piloto a un minuto del día simulado. `withActions: false` devuelve el mundo sin
 * coordinación (ninguna apertura, recogida ni reposición confirmada): el escenario base.
 */
export async function getResources(
  query: PilotQuery,
  { withActions = true }: { withActions?: boolean } = {},
): Promise<Resource[]> {
  const [sensors, refuges, actions] = await Promise.all([
    getSensors(),
    getRefuges(),
    withActions
      ? prisma.pilotAction.findMany({
          where: { runId: query.runId, minute: { lte: query.minute } },
          orderBy: { minute: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const resources: Resource[] = sensors.map((sensor) => {
    const operation = sensor.kind === "bikes" ? "refill" : "empty";
    const action = actions.find(
      (item) => item.targetId === sensor.id && item.operation === operation,
    );
    const elapsed = action ? query.minute - action.minute : 0;
    const value =
      action && sensor.kind !== "heat"
        ? sensor.kind === "bikes"
          ? Math.max(0, 8 - Math.floor(elapsed / 60))
          : Math.min(100, Math.round(10 + elapsed * 0.05))
        : valueAt(sensor, sensor.kind, query.minute);
    return {
      ...sensor,
      value,
      open: true,
      capacity: 0,
      occupied: 0,
      enabled: true,
      closeMinute: 1440,
    };
  });
  resources.push(
    ...refuges.map((refuge, index) => {
      const activated = actions.some(
        (item) => item.targetId === refuge.id && item.operation === "open",
      );
      const closeMinute = activated ? 1440 : index % 3 === 0 ? 20 * 60 : 14 * 60 + 30;
      const capacity = 30 + (index % 3) * 10;
      return {
        ...refuge,
        kind: "heat" as const,
        materials: [],
        value: 0,
        enabled: true,
        open: (query.minute >= 9 * 60 && query.minute < closeMinute) || activated,
        capacity,
        occupied: activated ? 5 : index % 3 === 0 ? capacity : Math.floor(capacity / 2),
        closeMinute,
      };
    }),
  );
  return resources;
}

export async function getPlan(input: unknown) {
  const request = requestSchema.parse(input);
  const resources = await getResources(request);
  const origin =
    request.latitude != null && request.longitude != null
      ? ({
          id: "me",
          name: "Tu ubicación",
          kind: request.kind,
          latitude: request.latitude,
          longitude: request.longitude,
          value: 0,
          materials: [],
          open: false,
          capacity: 0,
          occupied: 0,
          enabled: false,
          closeMinute: 0,
        } satisfies Resource)
      : resources.find((resource) => resource.id === request.originId);
  if (!origin) throw notFoundError("No existe el punto de origen seleccionado.");
  return planRequest(request, origin, resources);
}

export async function saveAction(input: unknown) {
  const action = actionSchema.parse(input);
  const resources = await getResources(action);
  const resource = resources.find((item) => item.id === action.targetId);
  const expectedKind =
    action.operation === "open" || action.operation === "requestHeat"
      ? "heat"
      : action.operation === "empty" || action.operation === "requestBins"
        ? "bins"
        : "bikes";
  if (
    !resource ||
    resource.kind !== expectedKind ||
    (expectedKind === "heat" && !resource.id.startsWith("refuge-"))
  )
    throw notFoundError("La actuación no corresponde a un recurso válido.");
  return prisma.pilotAction.upsert({
    where: {
      runId_operation_targetId_minute: {
        runId: action.runId,
        operation: action.operation,
        targetId: action.targetId,
        minute: action.minute,
      },
    },
    create: {
      runId: action.runId,
      operation: action.operation,
      targetId: action.targetId,
      minute: action.minute,
    },
    update: {},
  });
}

/** An incident at this minute, read from the sensor itself (before any confirmed actuation). */
export function isIncident(origin: Resource): boolean {
  if (origin.id.startsWith("refuge-")) return false;
  if (origin.kind === "heat") return origin.value >= 40;
  if (origin.kind === "bikes") return origin.value === 0;
  return origin.value >= 85;
}

const MATERIALS = ["vidrio", "papel", "envases", "ropa", "pilas"] as const;

/** First documented material of a recycling point (OpenStreetMap), or null if it has none. */
function materialOf(origin: Resource): (typeof MATERIALS)[number] | null {
  return (
    MATERIALS.find(
      (item) =>
        origin.materials.includes(item) ||
        (item === "envases" &&
          origin.materials.some((value) => ["plástico", "latas"].includes(value))),
    ) ?? null
  );
}

type KindCount = { total: number; baseline: number; assisted: number };

// Métrica del piloto: cuando el recurso habitual falla, ¿encuentra el vecino otro que pueda usar?
// Solicitudes: las incidencias de ese minuto (parada a 40 °C o más, estación sin bicis,
// contenedor con un llenado del 85 % o más y material documentado), las mismas en los dos
// escenarios. Base (mapa estático, sin coordinación): el recurso más cercano distinto del de
// origen, sin comprobar su estado, en un mundo sin actuaciones. Sevilla Activa: la propuesta
// del agente con las actuaciones confirmadas en la sesión. Misma distancia máxima para ambos.
// Descartado: contar todos los puntos, incluidos los que no tienen ningún problema; diluye la
// diferencia y no mide lo que el piloto quiere resolver.
export async function getPilotState(query: PilotQuery) {
  const [resources, uncoordinated] = await Promise.all([
    getResources(query),
    getResources(query, { withActions: false }),
  ]);
  const byKind: Record<Resource["kind"], KindCount> = {
    heat: { total: 0, baseline: 0, assisted: 0 },
    bikes: { total: 0, baseline: 0, assisted: 0 },
    bins: { total: 0, baseline: 0, assisted: 0 },
  };
  let pending = 0;
  for (const origin of uncoordinated) {
    if (!isIncident(origin)) continue;
    const material = origin.kind === "bins" ? materialOf(origin) : "envases";
    if (!material) continue;
    const request = { ...query, kind: origin.kind, originId: origin.id, material } as PilotRequest;
    const counts = byKind[origin.kind];
    counts.total++;

    const staticWorld = uncoordinated
      .filter((resource) => resource.id !== origin.id)
      .map((resource) => ({
        ...resource,
        open: true,
        occupied: 0,
        value: resource.kind === "bikes" ? 8 : 10,
      }));
    const staticTarget = planRequest(request, origin, staticWorld).target;
    const actual = uncoordinated.find((resource) => resource.id === staticTarget?.id);
    if (actual && usable(actual, request)) counts.baseline++;

    const liveOrigin = resources.find((resource) => resource.id === origin.id) ?? origin;
    const plan = planRequest(request, liveOrigin, resources);
    if (plan.status === "available") counts.assisted++;
    else if (plan.status === "needs-action") pending++;
  }
  const kinds = Object.values(byKind);
  const total = kinds.reduce((sum, count) => sum + count.total, 0);
  const baseline = kinds.reduce((sum, count) => sum + count.baseline, 0);
  const assisted = kinds.reduce((sum, count) => sum + count.assisted, 0);
  const actions = await prisma.pilotAction.findMany({
    where: { runId: query.runId, minute: { lte: query.minute } },
    orderBy: { minute: "desc" },
  });
  return {
    resources,
    actions,
    metrics: {
      total,
      baseline,
      assisted,
      pending,
      byKind,
      baselinePct: total ? Math.round((baseline / total) * 100) : 0,
      assistedPct: total ? Math.round((assisted / total) * 100) : 0,
    },
    minute: query.minute,
  };
}
