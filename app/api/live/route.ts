import { withApiHandler } from "@/lib/api/handler";
import { z } from "@/lib/zod";
import { getLiveState } from "@/modules/rules/server";

// GET /api/live?minute=870  →  lecturas simuladas del Distrito Triana a esa hora del día de
// calor y alertas disparadas por las reglas hasta ese momento. Nunca se guarda en caché.
const querySchema = z.object({
  minute: z.coerce
    .number({ error: "El minuto debe ser un número." })
    .int("El minuto debe ser un número entero.")
    .min(0, "El minuto va de 0 a 1439.")
    .max(1439, "El minuto va de 0 a 1439.")
    .default(14 * 60 + 30),
});

export const GET = withApiHandler(async (request) => {
  const { minute } = querySchema.parse({
    minute: new URL(request.url).searchParams.get("minute") ?? undefined,
  });
  return Response.json(await getLiveState(minute), { headers: { "Cache-Control": "no-store" } });
});
