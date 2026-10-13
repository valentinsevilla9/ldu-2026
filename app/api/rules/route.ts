import { readJson, withApiHandler } from "@/lib/api/handler";
import { createRule, listRules } from "@/modules/rules/server";

export const GET = withApiHandler(async () => Response.json(await listRules()));

export const POST = withApiHandler(async (request) =>
  Response.json(await createRule(await readJson(request)), { status: 201 }),
);
