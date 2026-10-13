import { readJson, withApiHandler } from "@/lib/api/handler";
import { deleteRule, getRule, updateRule } from "@/modules/rules/server";

type Context = RouteContext<"/api/rules/[id]">;

export const GET = withApiHandler(async (_request, { params }: Context) => {
  const { id } = await params;
  return Response.json(await getRule(id));
});

export const PATCH = withApiHandler(async (request, { params }: Context) => {
  const { id } = await params;
  return Response.json(await updateRule(id, await readJson(request)));
});

export const DELETE = withApiHandler(async (_request, { params }: Context) => {
  const { id } = await params;
  await deleteRule(id);
  return new Response(null, { status: 204 });
});
