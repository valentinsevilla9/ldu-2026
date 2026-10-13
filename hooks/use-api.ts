"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ZodType } from "zod";

// Punto único para hablar con las rutas de app/api: traduce cualquier fallo
// (red, HTTP, formato) a un mensaje en español listo para enseñar al usuario.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Per-field validation messages (VALIDATION_ERROR), ready to show next to each field. */
  get fieldErrors(): Record<string, string[]> | undefined {
    const fieldErrors = (this.details as { fieldErrors?: unknown } | undefined)?.fieldErrors;
    return typeof fieldErrors === "object" && fieldErrors !== null
      ? (fieldErrors as Record<string, string[]>)
      : undefined;
  }
}

type FetchJsonOptions<T> = {
  schema?: ZodType<T>;
  signal?: AbortSignal;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body, sent as JSON. */
  json?: unknown;
};

// Reads the API error envelope `{ error: { message, details } }` or a plain `{ message }`.
export function extractError(body: unknown): { message?: string; details?: unknown } {
  if (typeof body !== "object" || body === null) return {};
  const record = body as { error?: { message?: unknown; details?: unknown }; message?: unknown };
  const message = record.error?.message ?? record.message;
  return {
    message: typeof message === "string" && message.length > 0 ? message : undefined,
    details: record.error?.details,
  };
}

export async function fetchJson<T>(
  url: string,
  { schema, signal, method = "GET", json }: FetchJsonOptions<T> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(json !== undefined && { "Content-Type": "application/json" }),
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      "No se ha podido conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.",
    );
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const { message, details } = extractError(body);
    throw new ApiError(
      message ?? `El servidor ha respondido con un error (${response.status}).`,
      response.status,
      details,
    );
  }

  if (!schema) return body as T;

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("La respuesta del servidor no tiene el formato esperado.", response.status);
  }
  return parsed.data;
}

type Result<T> = { key: string | null; data: T | undefined; error: string | null };

export type UseApiResult<T> = {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
  /** Updates the cached data locally (e.g. after creating an item) without refetching. */
  mutate: (update: (current: T | undefined) => T | undefined) => void;
};

/**
 * GET con estados de carga y error. `url = null` desactiva la petición.
 * Mientras se recarga se conservan los datos anteriores para no parpadear.
 */
export function useApi<T>(url: string | null, schema?: ZodType<T>): UseApiResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: null, data: undefined, error: null });

  // The schema lives in a ref so an inline schema doesn't retrigger the request every render.
  const schemaRef = useRef(schema);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  const key = url === null ? null : `${url}#${attempt}`;

  useEffect(() => {
    if (url === null || key === null) return;
    const controller = new AbortController();

    fetchJson(url, { schema: schemaRef.current, signal: controller.signal })
      .then((data) => setResult({ key, data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError ? error.message : "Ha ocurrido un error inesperado.";
        setResult((previous) => ({ key, data: previous.data, error: message }));
      });

    return () => controller.abort();
  }, [url, key]);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);
  const mutate = useCallback<UseApiResult<T>["mutate"]>(
    (update) => setResult((previous) => ({ ...previous, data: update(previous.data) })),
    [],
  );

  return {
    data: result.data,
    error: result.key === key ? result.error : null,
    isLoading: key !== null && result.key !== key,
    refetch,
    mutate,
  };
}
