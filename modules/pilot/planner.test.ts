import { describe, expect, it } from "vitest";
import { planRequest, depositAllowed } from "./planner";
import type { PilotRequest, Resource } from "./schema";

const request: PilotRequest = {
  runId: "68c17d94-0d45-4c47-8a4e-8229fd0fdb57",
  minute: 870,
  maxDistance: 1000,
  kind: "heat",
  originId: "origin",
  material: "envases",
};
const origin: Resource = {
  id: "origin",
  name: "Parada",
  kind: "heat",
  latitude: 37.38,
  longitude: -6,
  value: 42,
  materials: [],
  open: true,
  enabled: true,
  capacity: 0,
  occupied: 0,
  closeMinute: 1440,
};
const refuge: Resource = {
  ...origin,
  id: "refuge-0-1",
  name: "Centro",
  capacity: 30,
  occupied: 5,
  latitude: 37.381,
};

describe("Planificación de alternativas", () => {
  it("descarta el más cercano cerrado y propone uno abierto", () => {
    const closed = { ...refuge, id: "refuge-0-2", latitude: 37.3801, open: false };
    expect(planRequest(request, origin, [closed, refuge]).target?.id).toBe(refuge.id);
  });
  it("no recomienda un refugio lleno", () => {
    expect(planRequest(request, origin, [{ ...refuge, occupied: 30 }]).status).toBe("unavailable");
  });
  it("solicita activación sin fingir disponibilidad", () => {
    const plan = planRequest(request, origin, [{ ...refuge, open: false }]);
    expect(plan.status).toBe("needs-action");
    expect(plan.target).toBeNull();
    expect(plan.requestTargetId).toBe(refuge.id);
  });
  it("no cambia el material por otro con más espacio", () => {
    const bin = { ...refuge, kind: "bins" as const, value: 10, materials: ["vidrio"] };
    expect(planRequest({ ...request, kind: "bins" }, origin, [bin]).target).toBeNull();
    expect(
      planRequest({ ...request, kind: "bins", material: "vidrio" }, origin, [bin]).target?.id,
    ).toBe(bin.id);
  });
  it("respeta distancia y horario de vidrio", () => {
    expect(depositAllowed("vidrio", 23 * 60)).toBe(false);
    expect(depositAllowed("vidrio", 8 * 60)).toBe(true);
    expect(
      planRequest({ ...request, maxDistance: 100 }, origin, [{ ...refuge, latitude: 37.4 }]).target,
    ).toBeNull();
  });
});
