import type { SensorKindId } from "@/modules/sensors/simulate";

// Motor de reglas «si X entonces Y»: la pieza propia del reto.
//
// Qué hace: recorre el día de cada sensor en pasos de 5 minutos y dispara una alerta cuando
// la condición se cumple sin interrupción durante `durationMin`, dentro de la franja horaria.
// Por qué así: la duración evita alarmas por un pico suelto, y cada episodio avisa una sola
// vez; el enfriamiento (`cooldownMin`) impide que una lectura que oscila alrededor del umbral
// genere un aviso nuevo cada pocos minutos. Es una función pura sobre las lecturas: se puede
// auditar, repetir y testear. Descartado: un umbral simple por lectura (lluvia de avisos) y
// un modelo de aprendizaje automático (no hay datos para entrenarlo y no sería explicable).

export const STEP_MIN = 5;
export const MINUTES_PER_DAY = 24 * 60;

export const RULE_OPERATORS = ["gte", "lte"] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];
export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  gte: "mayor o igual que",
  lte: "menor o igual que",
};

export type RuleSpec = {
  id: string;
  kind: SensorKindId;
  operator: RuleOperator;
  threshold: number;
  /** Minutes the condition must hold without a break before the rule fires. */
  durationMin: number;
  /** Local hours when the rule applies: [fromHour, toHour). If from > to, it spans midnight. */
  fromHour: number;
  toHour: number;
  /** Minimum minutes between two alerts of the same rule on the same sensor. */
  cooldownMin: number;
};

export type Firing = {
  ruleId: string;
  sensorId: string;
  /** Minute of the simulated day when the rule fired. */
  minute: number;
  value: number;
  /** True while the episode that fired it is still going on at the evaluated minute. */
  active: boolean;
};

export function matches(operator: RuleOperator, value: number, threshold: number): boolean {
  return operator === "gte" ? value >= threshold : value <= threshold;
}

export function inWindow(minute: number, fromHour: number, toHour: number): boolean {
  const hour = minute / 60;
  if (fromHour === toHour) return true;
  return fromHour < toHour ? hour >= fromHour && hour < toHour : hour >= fromHour || hour < toHour;
}

/**
 * Every alert the rule has fired on these sensors from 00:00 up to `upTo` (minute of the day).
 * `read` gives a sensor's value at a minute: simulated here, a time series in production.
 */
export function evaluateRule(
  rule: RuleSpec,
  sensorIds: string[],
  upTo: number,
  read: (sensorId: string, minute: number) => number,
): Firing[] {
  const firings: Firing[] = [];
  const last = Math.floor(Math.min(upTo, MINUTES_PER_DAY - 1) / STEP_MIN) * STEP_MIN;

  for (const sensorId of sensorIds) {
    let streakStart: number | null = null;
    let firedInStreak: Firing | null = null;
    let lastFired = -Infinity;

    for (let minute = 0; minute <= last; minute += STEP_MIN) {
      const applies = inWindow(minute, rule.fromHour, rule.toHour);
      const value = applies ? read(sensorId, minute) : Number.NaN;
      if (!applies || !matches(rule.operator, value, rule.threshold)) {
        if (firedInStreak) firedInStreak.active = false;
        streakStart = null;
        firedInStreak = null;
        continue;
      }
      streakStart ??= minute;
      if (
        !firedInStreak &&
        minute - streakStart >= rule.durationMin &&
        minute - lastFired >= rule.cooldownMin
      ) {
        firedInStreak = { ruleId: rule.id, sensorId, minute, value, active: true };
        firings.push(firedInStreak);
        lastFired = minute;
      }
    }
  }
  return firings;
}

/** "14:35" for a minute of the day. */
export function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60) % 24;
  const minutes = Math.floor(minute % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
