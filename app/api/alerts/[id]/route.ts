import { withApiHandler } from "@/lib/api/handler";
import { acknowledgeAlert } from "@/modules/rules/server";

// POST /api/alerts/:id  →  marca la alerta como atendida.
type Context = RouteContext<"/api/alerts/[id]">;

export const POST = withApiHandler(async (_request, { params }: Context) => {
  const { id } = await params;
  await acknowledgeAlert(decodeURIComponent(id));
  return new Response(null, { status: 204 });
});
