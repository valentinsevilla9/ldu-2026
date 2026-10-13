import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/lib/test-utils/db";
import { getResources, getPlan, saveAction, getPilotState } from "./server";

const query = { runId: "68c17d94-0d45-4c47-8a4e-8229fd0fdb57", minute: 1230, maxDistance: 3000 };
beforeEach(resetDatabase);
describe("Actuaciones persistidas del piloto", () => {
  it("abrir un espacio cambia disponibilidad solo desde el minuto confirmado y en su sesión", async () => {
    const initial = await getResources(query);
    const refuge = initial.find((resource) => resource.id.startsWith("refuge-") && !resource.open)!;
    expect(refuge).toBeDefined();
    await saveAction({ ...query, operation: "open", targetId: refuge.id });
    expect((await getResources(query)).find((resource) => resource.id === refuge.id)?.open).toBe(
      true,
    );
    expect(
      (await getResources({ ...query, minute: 1225 })).find((resource) => resource.id === refuge.id)
        ?.open,
    ).toBe(false);
    expect(
      (await getResources({ ...query, runId: "a6fb7d68-0085-4d64-9020-4a35244a1f47" })).find(
        (resource) => resource.id === refuge.id,
      )?.open,
    ).toBe(false);
  });
  it("recogida y reposición actualizan lecturas y una confirmación repetida es idempotente", async () => {
    const resources = await getResources(query);
    for (const [kind, operation, expected] of [
      ["bins", "empty", 10],
      ["bikes", "refill", 8],
    ] as const) {
      const target = resources.find((resource) => resource.kind === kind)!;
      await saveAction({ ...query, operation, targetId: target.id });
      await saveAction({ ...query, operation, targetId: target.id });
      expect((await getResources(query)).find((resource) => resource.id === target.id)?.value).toBe(
        expected,
      );
    }
    expect((await getPilotState(query)).actions).toHaveLength(2);
  });
  it("rechaza un recurso inventado o una actuación del tipo incorrecto", async () => {
    await expect(
      saveAction({ ...query, operation: "open", targetId: "inexistente" }),
    ).rejects.toThrow();
    const resource = (await getResources(query)).find((item) => item.kind === "bins")!;
    await expect(
      saveAction({ ...query, operation: "open", targetId: resource.id }),
    ).rejects.toThrow();
  });
  it("calcula la comparación sobre un mismo conjunto y no inventa origen", async () => {
    const state = await getPilotState(query);
    expect(state.metrics.total).toBeGreaterThan(0);
    expect(state.metrics.assisted).toBeGreaterThanOrEqual(state.metrics.baseline);
    expect(state.metrics.assisted).toBeLessThanOrEqual(state.metrics.total);
    await expect(getPlan({ ...query, kind: "heat", originId: "inventado" })).rejects.toThrow();
  });
  it("cuenta solo incidencias y una apertura confirmada mejora Sevilla Activa, no el mapa estático", async () => {
    const heat = { ...query, minute: 14 * 60 + 30, maxDistance: 1000 };
    const before = await getPilotState(heat);
    expect(before.metrics.total).toBe(before.metrics.byKind.heat.total);
    expect(before.metrics.pending).toBeGreaterThan(0);
    const origin = before.resources.find(
      (resource) => resource.kind === "heat" && !resource.id.startsWith("refuge-"),
    )!;
    const plan = await getPlan({ ...heat, kind: "heat", originId: origin.id });
    expect(plan.status).toBe("needs-action");
    await saveAction({ ...heat, operation: "open", targetId: plan.requestTargetId! });
    const after = await getPilotState(heat);
    expect(after.metrics.total).toBe(before.metrics.total);
    expect(after.metrics.baseline).toBe(before.metrics.baseline);
    expect(after.metrics.assisted).toBeGreaterThan(before.metrics.assisted);
  });
});
