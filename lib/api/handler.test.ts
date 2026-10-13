import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { AppError } from "./errors";
import { readJson, withApiHandler } from "./handler";

const request = (body?: string) =>
  new Request("http://localhost/api/test", { method: "POST", body });

afterEach(() => vi.restoreAllMocks());

describe("withApiHandler", () => {
  it("passes successful responses through and tags them with a request id", async () => {
    const handler = withApiHandler(() => Response.json({ ok: true }));

    const response = await handler(request(), undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("maps AppError to its status and the uniform body", async () => {
    const handler = withApiHandler(() => {
      throw new AppError("CONFLICT", 409, "Ya existe.", { field: "name" });
    });

    const response = await handler(request(), undefined);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "CONFLICT", message: "Ya existe.", details: { field: "name" } },
    });
  });

  it("maps zod errors to 400 with field details", async () => {
    const handler = withApiHandler(() => {
      z.object({ age: z.number({ error: "Debe ser un número." }) }).parse({ age: "x" });
      return Response.json({});
    });

    const response = await handler(request(), undefined);

    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details.fieldErrors.age).toEqual(["Debe ser un número."]);
  });

  it("hides unexpected errors from the client and logs them with the request id", async () => {
    const logError = vi.spyOn(logger, "error").mockImplementation(() => {});
    const handler = withApiHandler(() => {
      throw new Error("connection string with password=secret");
    });

    const response = await handler(request(), undefined);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret");
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    expect(logError).toHaveBeenCalledWith(
      "Unhandled API error",
      expect.objectContaining({ requestId: response.headers.get("x-request-id") }),
    );
  });
});

describe("readJson", () => {
  it("throws INVALID_JSON for malformed bodies", async () => {
    await expect(readJson(request("{oops"))).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    });
  });
});
