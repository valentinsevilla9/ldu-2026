import { logger } from "@/lib/logger";
import { AppError, toErrorPayload } from "./errors";

// Envoltorio común de las rutas de API: captura cualquier error y lo convierte en el
// JSON uniforme de errors.ts, añade un identificador de petición (cabecera x-request-id)
// y deja una línea de log por petición con método, ruta, estado y duración.

type RouteHandler<Context> = (request: Request, context: Context) => Response | Promise<Response>;

export function withApiHandler<Context>(handler: RouteHandler<Context>) {
  return async (request: Request, context: Context): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();
    const { pathname } = new URL(request.url);
    let response: Response;

    try {
      response = await handler(request, context);
    } catch (error) {
      const { status, body } = toErrorPayload(error);
      if (status >= 500) {
        // AppError = expected failure with a clear message (e.g. AI provider down);
        // anything else is a bug worth looking at.
        logger.error(error instanceof AppError ? "API request failed" : "Unhandled API error", {
          requestId,
          method: request.method,
          path: pathname,
          error,
        });
      }
      response = Response.json(body, { status });
    }

    response.headers.set("x-request-id", requestId);
    logger.info("API request", {
      requestId,
      method: request.method,
      path: pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return response;
  };
}

/** Parses the request body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("INVALID_JSON", 400, "El cuerpo de la petición no es un JSON válido.");
  }
}
