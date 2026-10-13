// Simulador de sensores: lecturas inventadas pero creíbles sobre puntos reales del mapa.
// Cada lectura sigue el ritmo de un día (horas punta, llenado a lo largo de la jornada),
// cada punto tiene su propio carácter (unos más cargados que otros) y se añade un ruido
// suave. Es determinista: la misma hora da la misma lectura, así que la demo se repite igual
// y los tests no dependen del azar. En producción, esto se sustituye por los sensores reales.
// La temperatura sigue la curva de un día real (heat.ts) en lugar de un ritmo genérico.

import { STREET_SURCHARGE_MAX, gridTemperature, heatShare } from "./heat";

export type SensorStatus = "ok" | "warning" | "critical";

type Profile = "commute" | "accumulate" | "heat";

type SensorKind = {
  label: string;
  unit: string;
  max: number;
  /** Cortes de estado: aviso y crítico. */
  warning: number;
  critical: number;
  /** "higher": más es peor (llenado); "lower": menos es peor (bicis libres). */
  worse: "higher" | "lower";
  profile: Profile;
};

export const SENSOR_KINDS = {
  bikes: {
    label: "Bicis disponibles",
    unit: "bicis",
    max: 20,
    warning: 3,
    critical: 0,
    worse: "lower",
    profile: "commute",
  },
  bins: {
    label: "Llenado del contenedor",
    unit: "%",
    max: 100,
    warning: 75,
    critical: 90,
    worse: "higher",
    profile: "accumulate",
  },
  heat: {
    label: "Temperatura en la calle",
    unit: "°C",
    max: 50,
    // Los mismos cortes que cuenta la serie de clima (anual.csv): días de 35 °C y de 40 °C.
    warning: 35,
    critical: 40,
    worse: "higher",
    profile: "heat",
  },
} as const satisfies Record<string, SensorKind>;

export type SensorKindId = keyof typeof SENSOR_KINDS;
export const SENSOR_KIND_IDS = Object.keys(SENSOR_KINDS) as [SensorKindId, ...SensorKindId[]];

export const STATUS_LABELS: Record<SensorStatus, string> = {
  ok: "Normal",
  warning: "Aviso",
  critical: "Crítico",
};

export type Sensor = { id: string; name: string; latitude: number; longitude: number };
export type Reading = Sensor & { value: number; status: SensorStatus };

/** FNV-1a: a stable 32-bit number for each text (the sensor id). */
function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Deterministic pseudo-random number in [0, 1) for a seed and a step. */
function random(seed: number, step: number): number {
  let t = (seed + Math.imul(step, 0x9e3779b9)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const bump = (hour: number, centre: number, width: number) =>
  Math.exp(-((hour - centre) ** 2) / (2 * width ** 2));
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** How busy a day is at a given hour, from 0 to 1. */
export function dailyLevel(profile: Profile, hour: number): number {
  switch (profile) {
    case "commute":
      return clamp(0.25 + 0.55 * bump(hour, 9, 1.5) + 0.5 * bump(hour, 19, 2));
    case "accumulate":
      // Collected at 6:00, then fills up through the day.
      return clamp(((hour - 6 + 24) % 24) / 21);
    case "heat":
      return heatShare(hour);
  }
}

export function statusOf(kind: SensorKindId, value: number): SensorStatus {
  const { warning, critical, worse } = SENSOR_KINDS[kind];
  if (worse === "higher")
    return value >= critical ? "critical" : value >= warning ? "warning" : "ok";
  return value <= critical ? "critical" : value <= warning ? "warning" : "ok";
}

const NOISE_STEP_MS = 60_000;

/**
 * One reading at a local hour of the simulated day: daily rhythm × the sensor's own
 * character + smooth noise over time (`timeMs`).
 */
export function readSensorAt(
  sensor: Sensor,
  kind: SensorKindId,
  hour: number,
  timeMs: number,
): Reading {
  const config = SENSOR_KINDS[kind];
  const seed = hash(`${kind}:${sensor.id}`);
  // Noise interpolated between one random value per minute, so it drifts instead of jumping.
  const steps = timeMs / NOISE_STEP_MS;
  const step = Math.floor(steps);
  const noise =
    random(seed, step) + (random(seed, step + 1) - random(seed, step)) * (steps - step) - 0.5;

  if (config.profile === "heat") {
    const street = random(seed, -1) * STREET_SURCHARGE_MAX;
    const value = Math.round((gridTemperature(hour) + street + noise * 0.6) * 10) / 10;
    return { ...sensor, value, status: statusOf(kind, value) };
  }

  // Each sensor is busier or quieter than average, and about 1 in 6 is a hot spot.
  const character = 0.65 + 0.5 * random(seed, -1) + (random(seed, -2) < 0.17 ? 0.35 : 0);
  const level = clamp(dailyLevel(config.profile, hour) * character + noise * 0.16);
  // For "lower is worse" (free bikes), a busy moment means few left.
  const share = config.worse === "lower" ? 1 - level : level;
  const value = Math.round(share * config.max);
  return { ...sensor, value, status: statusOf(kind, value) };
}
