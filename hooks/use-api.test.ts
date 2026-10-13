import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useApi } from "./use-api";

function mockFetchResponse(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("useApi", () => {
  it("starts loading and then exposes the data", async () => {
    mockFetchResponse(200, { value: 42 });

    const { result } = renderHook(() => useApi<{ value: number }>("/api/test"));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
  });

  it("uses the server error message from the error envelope", async () => {
    mockFetchResponse(404, { error: { code: "NOT_FOUND", message: "No existe ese elemento." } });

    const { result } = renderHook(() => useApi("/api/test"));

    await waitFor(() => expect(result.current.error).toBe("No existe ese elemento."));
  });

  it("falls back to a generic message with the status code", async () => {
    mockFetchResponse(500, null);

    const { result } = renderHook(() => useApi("/api/test"));

    await waitFor(() => expect(result.current.error).toContain("(500)"));
  });

  it("reports network failures in plain language", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { result } = renderHook(() => useApi("/api/test"));

    await waitFor(() => expect(result.current.error).toMatch(/No se ha podido conectar/));
  });

  it("rejects responses that do not match the schema", async () => {
    mockFetchResponse(200, { value: "not a number" });

    const { result } = renderHook(() => useApi("/api/test", z.object({ value: z.number() })));

    await waitFor(() => expect(result.current.error).toMatch(/formato esperado/));
  });

  it("refetches on demand and lets callers update data locally", async () => {
    mockFetchResponse(200, [1]);
    const { result } = renderHook(() => useApi<number[]>("/api/test"));
    await waitFor(() => expect(result.current.data).toEqual([1]));

    act(() => result.current.mutate((current) => [...(current ?? []), 2]));
    expect(result.current.data).toEqual([1, 2]);

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
