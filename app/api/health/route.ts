import { withApiHandler } from "@/lib/api/handler";
import type { HealthResponse } from "@/lib/health";
import { checkDatabase } from "@/lib/services/health";

// Salud del servicio: 200 si todo responde, 503 si la base de datos no está disponible.
export const GET = withApiHandler(async () => {
  const database = await checkDatabase();
  const body: HealthResponse = {
    status: database,
    timestamp: new Date().toISOString(),
    checks: { database },
    ...(database === "error" && { message: "La base de datos no responde." }),
  };
  return Response.json(body, { status: database === "ok" ? 200 : 503 });
});
