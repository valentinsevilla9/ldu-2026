import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("reports the service and the database as ok", async () => {
    const response = await GET(new Request("http://localhost/api/health"), undefined);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", checks: { database: "ok" } });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
