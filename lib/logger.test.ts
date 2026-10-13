import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("logger", () => {
  it("writes one JSON line with time, level, message and context", () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("API request", { status: 200 });

    const entry = JSON.parse(log.mock.calls[0][0]);
    expect(entry).toMatchObject({ level: "info", msg: "API request", status: 200 });
    expect(typeof entry.time).toBe("string");
  });

  it("serializes errors and skips levels below LOG_LEVEL", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.info("ignored");
    logger.error("failed", { error: new Error("boom") });

    expect(log).not.toHaveBeenCalled();
    expect(JSON.parse(error.mock.calls[0][0]).error).toMatchObject({
      name: "Error",
      message: "boom",
    });
  });
});
