import { withApiHandler } from "@/lib/api/handler";
import { getPlan } from "@/modules/pilot/server";

export const POST = withApiHandler(async (request) =>
  Response.json(await getPlan(await request.json())),
);
