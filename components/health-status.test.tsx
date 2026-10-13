import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthStatus } from "./health-status";

afterEach(() => vi.unstubAllGlobals());

describe("HealthStatus", () => {
  it("announces loading and then that the server is up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          timestamp: "2026-10-13T09:00:00.000Z",
          checks: { database: "ok" },
        }),
      }),
    );

    render(<HealthStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("Comprobando el servidor");
    expect(await screen.findByText(/Servidor y base de datos operativos/)).toBeInTheDocument();
  });

  it("shows a readable error when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    render(<HealthStatus />);

    expect(await screen.findByText(/No se ha podido conectar/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("npm run dev");
  });
});
