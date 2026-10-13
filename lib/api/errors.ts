import { z } from "zod";

// Errores de la API con un formato único para todas las rutas:
//   { "error": { "code": "NOT_FOUND", "message": "…", "details": … } }
// `message` siempre está en español y se puede enseñar tal cual al usuario.

export type ErrorCode =
  "VALIDATION_ERROR" | "INVALID_JSON" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export type ErrorBody = {
  error: { code: ErrorCode; message: string; details?: unknown };
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFoundError = (message = "El recurso solicitado no existe.") =>
  new AppError("NOT_FOUND", 404, message);

/** Prisma errors are matched by code without importing the generated client here. */
export function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === code &&
    (error as { name?: unknown }).name === "PrismaClientKnownRequestError"
  );
}

/** Maps any thrown value to a status code and the uniform error body. */
export function toErrorPayload(error: unknown): { status: number; body: ErrorBody } {
  const payload = (status: number, code: ErrorCode, message: string, details?: unknown) => ({
    status,
    body: { error: { code, message, ...(details === undefined ? {} : { details }) } },
  });

  if (error instanceof AppError) {
    return payload(error.status, error.code, error.message, error.details);
  }
  if (error instanceof z.ZodError) {
    // details = { fieldErrors: { name: ["…"] }, formErrors: ["…"] }, ready to map onto a form.
    return payload(
      400,
      "VALIDATION_ERROR",
      "Los datos enviados no son válidos.",
      z.flattenError(error),
    );
  }
  if (isPrismaError(error, "P2025")) {
    return payload(404, "NOT_FOUND", "El recurso solicitado no existe.");
  }
  if (isPrismaError(error, "P2002")) {
    return payload(409, "CONFLICT", "Ya existe un registro con esos datos.");
  }
  // Unknown errors never leak internals to the client; the full error goes to the log.
  return payload(
    500,
    "INTERNAL_ERROR",
    "Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.",
  );
}
