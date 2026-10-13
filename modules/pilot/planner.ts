import { distanceM } from "@/modules/rules/server";
import type { PilotRequest, Plan, Resource } from "./schema";

// Agente simulado: consulta herramientas y propone. No llama a un modelo externo ni actúa solo.
// Las mismas restricciones se aplican a la métrica y a la validación de sus propuestas.
export function acceptsMaterial(resource: Resource, material: string) {
  return (
    resource.materials.includes(material) ||
    (material === "envases" &&
      resource.materials.some((item) => ["plástico", "latas"].includes(item)))
  );
}

export function depositAllowed(material: string, minute: number) {
  return material !== "vidrio" || (minute >= 8 * 60 && minute < 23 * 60);
}

export function usable(resource: Resource, request: PilotRequest) {
  if (resource.kind !== request.kind) return false;
  if (request.kind === "heat")
    return resource.enabled && resource.open && resource.occupied < resource.capacity;
  if (request.kind === "bikes") return resource.value > 0;
  return (
    resource.value < 85 &&
    acceptsMaterial(resource, request.material) &&
    depositAllowed(request.material, request.minute)
  );
}

export function planRequest(request: PilotRequest, origin: Resource, resources: Resource[]): Plan {
  const nearby = resources
    .filter((resource) => resource.kind === request.kind)
    .map((resource) => ({ ...resource, distanceM: distanceM(origin, resource) }))
    .filter((resource) => resource.distanceM <= request.maxDistance)
    .sort((a, b) => a.distanceM - b.distanceM || a.id.localeCompare(b.id));
  const tools = [
    {
      name: "Consultar recursos próximos",
      result: `${nearby.length} candidatos dentro de ${request.maxDistance} m en línea recta.`,
    },
    {
      name: "Comprobar restricciones",
      result:
        request.kind === "heat"
          ? "Habilitación, apertura y plazas simuladas."
          : request.kind === "bins"
            ? `Material: ${request.material}; llenado < 85 % y horario de depósito.`
            : "Bicicletas disponibles en el minuto actual.",
    },
  ];
  const target = nearby.find((resource) => usable(resource, request)) ?? null;
  if (target) {
    tools.push({
      name: "Validar propuesta",
      result: "La alternativa cumple las restricciones del piloto.",
    });
    return {
      mode: "simulated",
      status: "available",
      target,
      requestTargetId: null,
      reason:
        request.kind === "heat"
          ? `Espacio habilitado, abierto y con ${target.capacity - target.occupied} plazas simuladas. Horario hasta las ${Math.floor(target.closeMinute / 60)}:${String(target.closeMinute % 60).padStart(2, "0")}.`
          : request.kind === "bins"
            ? `Admite ${request.material}, tiene un ${target.value} % de llenado simulado y el horario permite el depósito.`
            : `Dispone de ${target.value} bicicletas simuladas ahora.`,
      tools,
    };
  }
  const candidate = nearby.find((resource) =>
    request.kind === "heat"
      ? resource.enabled && !resource.open
      : request.kind === "bins"
        ? acceptsMaterial(resource, request.material) &&
          depositAllowed(request.material, request.minute)
        : true,
  );
  tools.push({
    name: "Preparar actuación",
    result: candidate
      ? "Propuesta pendiente de confirmación del operador."
      : "No hay un candidato válido; no se inventa una alternativa.",
  });
  return {
    mode: "simulated",
    status: candidate ? "needs-action" : "unavailable",
    target: null,
    requestTargetId: candidate?.id ?? null,
    reason: candidate
      ? request.kind === "heat"
        ? `Solicitar apertura o ampliación de horario de ${candidate.name}. Solo estará disponible tras la confirmación del responsable.`
        : request.kind === "bins"
          ? `Solicitar recogida de ${candidate.name}; no hay un punto compatible con capacidad dentro de la distancia elegida.`
          : `Solicitar reposición en ${candidate.name}.`
      : "No hay una alternativa válida dentro de la distancia y el horario elegidos. Consulta al servicio responsable.",
    tools,
  };
}
