import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HEAT_DAY, gridTemperature } from "@/modules/sensors/heat";
import { evaluateRule, formatMinute, inWindow, type RuleSpec } from "./engine";

const rule: RuleSpec = {
  id: "calor",
  kind: "heat",
  operator: "gte",
  threshold: 40,
  durationMin: 30,
  fromHour: 12,
  toHour: 19,
  cooldownMin: 60,
};

/** A sensor whose value is `high` between two minutes and `low` otherwise. */
const plateau =
  (from: number, to: number, high = 41, low = 30) =>
  (_id: string, minute: number) =>
    minute >= from && minute < to ? high : low;

describe("rules engine", () => {
  it("fires only after the condition holds for the whole duration", () => {
    const firings = evaluateRule(rule, ["a"], 24 * 60, plateau(13 * 60, 14 * 60));
    expect(firings).toHaveLength(1);
    expect(firings[0]).toMatchObject({ sensorId: "a", minute: 13 * 60 + 30, active: false });
  });

  it("ignores a short peak", () => {
    expect(evaluateRule(rule, ["a"], 24 * 60, plateau(13 * 60, 13 * 60 + 20))).toEqual([]);
  });

  it("ignores readings outside the time window", () => {
    expect(evaluateRule(rule, ["a"], 24 * 60, plateau(20 * 60, 23 * 60))).toEqual([]);
  });

  it("fires once per episode and respects the cooldown between episodes", () => {
    // Two hot spells 10 minutes apart: the second one starts within the cooldown.
    const read = (_id: string, minute: number) =>
      (minute >= 780 && minute < 840) || (minute >= 850 && minute < 960) ? 41 : 30;
    const firings = evaluateRule(rule, ["a"], 24 * 60, read);
    expect(firings.map((firing) => formatMinute(firing.minute))).toEqual(["13:30", "14:40"]);
  });

  it("marks the alert active while the episode is still going on", () => {
    const [firing] = evaluateRule(rule, ["a"], 14 * 60, plateau(13 * 60, 18 * 60));
    expect(firing.active).toBe(true);
  });

  it("only looks at the day up to the evaluated minute", () => {
    expect(evaluateRule(rule, ["a"], 13 * 60, plateau(13 * 60, 18 * 60))).toEqual([]);
  });

  it("supports 'lower or equal' rules (no bikes left)", () => {
    const empty: RuleSpec = {
      ...rule,
      kind: "bikes",
      operator: "lte",
      threshold: 0,
      fromHour: 0,
      toHour: 0,
      durationMin: 15,
    };
    const read = (_id: string, minute: number) => (minute >= 600 && minute < 660 ? 0 : 5);
    expect(evaluateRule(empty, ["a"], 24 * 60, read)).toMatchObject([{ minute: 615 }]);
  });

  it("handles windows that span midnight", () => {
    expect(inWindow(23 * 60, 22, 6)).toBe(true);
    expect(inWindow(3 * 60, 22, 6)).toBe(true);
    expect(inWindow(12 * 60, 22, 6)).toBe(false);
  });
});

describe("heat day", () => {
  it("matches the real day in the open climate data", () => {
    const csv = readFileSync("public/data/abiertos/clima/diario.csv", "utf8");
    const row = csv.split(/\r?\n/).find((line) => line.startsWith(HEAT_DAY.date));
    const [, tmax, tmin] = row!.split(",");
    expect(Number(tmax)).toBe(HEAT_DAY.tmax);
    expect(Number(tmin)).toBe(HEAT_DAY.tmin);
  });

  it("goes from the minimum at dawn to the maximum in the afternoon", () => {
    expect(gridTemperature(6.5)).toBeCloseTo(HEAT_DAY.tmin);
    expect(gridTemperature(16.5)).toBeCloseTo(HEAT_DAY.tmax);
    expect(gridTemperature(14.5)).toBeGreaterThan(40);
  });
});
