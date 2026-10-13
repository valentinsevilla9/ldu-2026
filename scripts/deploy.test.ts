import { describe, expect, it } from "vitest";
import { parseDeploymentUrl } from "./deploy";

describe("parseDeploymentUrl", () => {
  it("takes the last vercel.app URL the CLI prints", () => {
    const stdout = [
      "Inspect: https://vercel.com/equipo/ldu-next/abc123",
      "https://ldu-next-abc123-equipo.vercel.app",
      "https://ldu-next.vercel.app",
    ].join("\n");
    expect(parseDeploymentUrl(stdout)).toBe("https://ldu-next.vercel.app");
  });

  it("returns null when the deployment printed no URL", () => {
    expect(parseDeploymentUrl("Error: build failed")).toBeNull();
  });
});
