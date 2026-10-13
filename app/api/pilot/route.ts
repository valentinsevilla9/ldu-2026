import { withApiHandler } from "@/lib/api/handler";
import { pilotQuerySchema } from "@/modules/pilot/schema";
import { getPilotState, saveAction } from "@/modules/pilot/server";

export const GET = withApiHandler(async (request) => {
  const query = pilotQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return Response.json(await getPilotState(query), { headers: { "Cache-Control": "no-store" } });
});
export const POST = withApiHandler(async (request) =>
  Response.json(await saveAction(await request.json()), { status: 201 }),
);
