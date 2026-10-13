import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Point, Polygon, MultiPolygon } from "geojson";
import { isPrismaError, notFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/db";
import type { Rule as RuleRow } from "@/generated/prisma/client";
import type { LayerId, PlaceCollection } from "@/modules/sevilla/layers";
import { HEAT_DAY } from "@/modules/sensors/heat";
import {
  SENSOR_KINDS,
  readSensorAt,
  statusOf,
  type Sensor,
  type SensorStatus,
} from "@/modules/sensors/simulate";
import { evaluateRule, formatMinute } from "./engine";
import {
  RULE_ACTIONS,
  RULE_KINDS,
  ruleInputSchema,
  ruleSchema,
  ruleUpdateSchema,
  type Rule,
  type RuleKind,
} from "./schema";

// Servicio de reglas: guarda las reglas (Prisma) y evalúa el día simulado sobre sensores
// colocados en puntos reales del Distrito Triana. Las alertas no se guardan: se recalculan
// con el motor, así que siempre son coherentes con las reglas vigentes. Solo se guarda cuáles
// se han atendido (AlertAck).

const RULE_NOT_FOUND = "No existe ninguna regla con ese identificador.";

export const DISTRICT = "Triana";

/** Real layer each sensor kind sits on. */
export const KIND_LAYERS: Record<RuleKind, LayerId> = {
  heat: "tussam-paradas",
  bikes: "sevici",
  bins: "reciclaje",
};

// --- Reglas (CRUD) ---------------------------------------------------------------------

function toRule(row: RuleRow): Rule {
  return ruleSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function listRules(): Promise<Rule[]> {
  const rows = await prisma.rule.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toRule);
}

export async function getRule(id: string): Promise<Rule> {
  const row = await prisma.rule.findUnique({ where: { id } });
  if (!row) throw notFoundError(RULE_NOT_FOUND);
  return toRule(row);
}

export async function createRule(input: unknown): Promise<Rule> {
  return toRule(await prisma.rule.create({ data: ruleInputSchema.parse(input) }));
}

export async function updateRule(id: string, input: unknown): Promise<Rule> {
  const data = ruleUpdateSchema.parse(input);
  try {
    return toRule(await prisma.rule.update({ where: { id }, data }));
  } catch (error) {
    if (isPrismaError(error, "P2025")) throw notFoundError(RULE_NOT_FOUND);
    throw error;
  }
}

export async function deleteRule(id: string): Promise<void> {
  try {
    await prisma.rule.delete({ where: { id } });
  } catch (error) {
    if (isPrismaError(error, "P2025")) throw notFoundError(RULE_NOT_FOUND);
    throw error;
  }
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await prisma.alertAck.upsert({ where: { id }, create: { id }, update: {} });
}

// --- Sensores sobre puntos reales --------------------------------------------------------

const files = new Map<string, Promise<PlaceCollection>>();

function readLayer(id: LayerId): Promise<PlaceCollection> {
  let file = files.get(id);
  if (!file) {
    file = readFile(
      path.join(process.cwd(), "public", "data", "sevilla", `${id}.geojson`),
      "utf8",
    ).then((text) => JSON.parse(text) as PlaceCollection);
    file.catch(() => files.delete(id));
    files.set(id, file);
  }
  return file;
}

type Ring = number[][];

function inRing([x, y]: number[], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inArea(point: number[], geometry: Polygon | MultiPolygon): boolean {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    ([outer, ...holes]) => inRing(point, outer) && !holes.some((hole) => inRing(point, hole)),
  );
}

export async function getDistrictArea() {
  const districts = await readLayer("distritos");
  const feature = districts.features.find((f) => f.properties.nombre === DISTRICT);
  if (!feature) throw new Error(`No se encuentra el distrito ${DISTRICT} en la capa de distritos.`);
  return feature;
}

export type PlacedSensor = Sensor & { kind: RuleKind; materials: string[] };

let sensorsCache: Promise<PlacedSensor[]> | null = null;

/** The district's real points of each layer, each one carrying a simulated sensor. */
export function getSensors(): Promise<PlacedSensor[]> {
  sensorsCache ??= (async () => {
    const area = (await getDistrictArea()).geometry as Polygon | MultiPolygon;
    const groups = await Promise.all(
      RULE_KINDS.map(async (kind) => {
        const layer = await readLayer(KIND_LAYERS[kind]);
        return layer.features.flatMap((feature, index) => {
          if (feature.geometry.type !== "Point") return [];
          const coordinates = (feature.geometry as Point).coordinates;
          if (!inArea(coordinates, area)) return [];
          const [longitude, latitude] = coordinates;
          const name = feature.properties.nombre;
          const materials =
            kind === "bins"
              ? (feature.properties.detalle ?? "")
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean)
              : [];
          return [
            { id: `${KIND_LAYERS[kind]}-${index}`, name, latitude, longitude, kind, materials },
          ];
        });
      }),
    );
    return groups.flat();
  })();
  sensorsCache.catch(() => (sensorsCache = null));
  return sensorsCache;
}

type Refuge = { id: string; name: string; latitude: number; longitude: number };
let refugesCache: Promise<Refuge[]> | null = null;

/** Climate refuges: public libraries and civic centres of the whole city (real layers). */
export function getRefuges(): Promise<Refuge[]> {
  refugesCache ??= Promise.all([readLayer("bibliotecas"), readLayer("centros-civicos")]).then(
    (layers) =>
      layers.flatMap((layer, layerIndex) =>
        layer.features.flatMap((feature, index) => {
          if (feature.geometry.type !== "Point" || !feature.properties.nombre) return [];
          const [longitude, latitude] = (feature.geometry as Point).coordinates;
          return [
            {
              id: `refuge-${layerIndex}-${index}`,
              name: feature.properties.nombre,
              latitude,
              longitude,
            },
          ];
        }),
      ),
  );
  refugesCache.catch(() => (refugesCache = null));
  return refugesCache;
}

type Located = { latitude: number; longitude: number };

/** Distance in metres between two points (haversine). */
export function distanceM(a: Located, b: Located): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

function nearest<T extends Located>(from: Located, places: T[]) {
  let best: (T & { distanceM: number }) | null = null;
  for (const place of places) {
    const d = distanceM(from, place);
    if (!best || d < best.distanceM) best = { ...place, distanceM: d };
  }
  return best;
}

// --- Día simulado ------------------------------------------------------------------------

// The simulated day starts at midnight in Sevilla (UTC+2 in August).
const DAY_START_MS = Date.parse(`${HEAT_DAY.date}T00:00:00+02:00`);

export function valueAt(sensor: Sensor, kind: RuleKind, minute: number): number {
  return readSensorAt(sensor, kind, minute / 60, DAY_START_MS + minute * 60_000).value;
}

export type LiveAlert = {
  id: string;
  ruleId: string;
  ruleName: string;
  kind: RuleKind;
  notify: string;
  sensorId: string;
  sensorName: string;
  latitude: number;
  longitude: number;
  minute: number;
  time: string;
  value: number;
  unit: string;
  active: boolean;
  acknowledged: boolean;
  action: string;
  target: { name: string; distanceM: number; latitude: number; longitude: number } | null;
};

export type LiveSensor = PlacedSensor & { value: number; status: SensorStatus; unit: string };

export async function getLiveState(minute: number) {
  const [sensors, rules, acks, refuges] = await Promise.all([
    getSensors(),
    listRules(),
    prisma.alertAck.findMany({ select: { id: true } }),
    getRefuges(),
  ]);
  const acknowledged = new Set(acks.map((ack) => ack.id));
  const byId = new Map(sensors.map((sensor) => [sensor.id, sensor]));

  const readings: LiveSensor[] = sensors.map((sensor) => {
    const value = valueAt(sensor, sensor.kind, minute);
    return {
      ...sensor,
      value,
      status: statusOf(sensor.kind, value),
      unit: SENSOR_KINDS[sensor.kind].unit,
    };
  });

  const alerts: LiveAlert[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const group = sensors.filter((sensor) => sensor.kind === rule.kind);
    const firings = evaluateRule(
      rule,
      group.map((sensor) => sensor.id),
      minute,
      (id, m) => valueAt(byId.get(id)!, rule.kind, m),
    );
    for (const firing of firings) {
      const sensor = byId.get(firing.sensorId)!;
      let target: LiveAlert["target"] = null;
      if (rule.kind === "heat") {
        target = nearest(sensor, refuges);
      } else if (rule.kind === "bikes") {
        // The closest station that has at least 5 bikes at that moment.
        const donors = group.filter(
          (other) => other.id !== sensor.id && valueAt(other, "bikes", minute) >= 5,
        );
        target = nearest(sensor, donors);
      }
      const id = `${rule.id}:${sensor.id}:${firing.minute}`;
      alerts.push({
        id,
        ruleId: rule.id,
        ruleName: rule.name,
        kind: rule.kind,
        notify: rule.notify,
        sensorId: sensor.id,
        sensorName: sensor.name,
        latitude: sensor.latitude,
        longitude: sensor.longitude,
        minute: firing.minute,
        time: formatMinute(firing.minute),
        value: firing.value,
        unit: SENSOR_KINDS[rule.kind].unit,
        active: firing.active,
        acknowledged: acknowledged.has(id),
        action: RULE_ACTIONS[rule.kind],
        target: target && {
          name: target.name,
          distanceM: target.distanceM,
          latitude: target.latitude,
          longitude: target.longitude,
        },
      });
    }
  }
  alerts.sort((a, b) => b.minute - a.minute);

  return {
    day: HEAT_DAY.date,
    district: DISTRICT,
    minute,
    time: formatMinute(minute),
    simulated: true as const,
    sensors: readings,
    alerts,
  };
}

export type LiveState = Awaited<ReturnType<typeof getLiveState>>;
