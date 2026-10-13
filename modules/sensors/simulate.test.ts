import { describe, expect, it } from "vitest";
import { STREET_SURCHARGE_MAX, gridTemperature } from "./heat";
import { dailyLevel, readSensorAt, statusOf, type Sensor } from "./simulate";

const sensor: Sensor = { id: "sevici-1", name: "Sevici 1", latitude: 37.41, longitude: -5.99 };
const MINUTE = 60_000;

describe("sensor simulator", () => {
  it("is deterministic: same sensor and time, same reading", () => {
    expect(readSensorAt(sensor, "bikes", 17.5, 1000 * MINUTE)).toEqual(
      readSensorAt(sensor, "bikes", 17.5, 1000 * MINUTE),
    );
  });

  it("drifts smoothly instead of jumping between consecutive updates", () => {
    const first = readSensorAt(sensor, "bins", 18, 1000 * MINUTE);
    const fiveSecondsLater = readSensorAt(sensor, "bins", 18, 1000 * MINUTE + 5000);
    expect(Math.abs(first.value - fiveSecondsLater.value)).toBeLessThanOrEqual(2);
  });

  it("follows the daily rhythm: rush hours busier than the night", () => {
    expect(dailyLevel("commute", 9)).toBeGreaterThan(dailyLevel("commute", 3));
    expect(dailyLevel("accumulate", 21)).toBeGreaterThan(dailyLevel("accumulate", 7));
  });

  it("keeps street temperature within the real day plus the street surcharge", () => {
    for (let hour = 0; hour < 24; hour += 0.5) {
      const { value } = readSensorAt(sensor, "heat", hour, hour * 60 * MINUTE);
      expect(value).toBeGreaterThanOrEqual(gridTemperature(hour) - 0.5);
      expect(value).toBeLessThanOrEqual(gridTemperature(hour) + STREET_SURCHARGE_MAX + 0.5);
    }
  });

  it("classifies values in both directions", () => {
    expect(statusOf("bins", 50)).toBe("ok");
    expect(statusOf("bins", 80)).toBe("warning");
    expect(statusOf("bins", 95)).toBe("critical");
    expect(statusOf("bikes", 10)).toBe("ok");
    expect(statusOf("bikes", 2)).toBe("warning");
    expect(statusOf("bikes", 0)).toBe("critical");
    expect(statusOf("heat", 41)).toBe("critical");
  });
});
