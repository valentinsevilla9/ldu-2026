// Logging estructurado: una línea JSON por evento (hora, nivel, mensaje y contexto),
// fácil de leer en la terminal y de filtrar en Vercel o cualquier agregador.
// Nivel con LOG_LEVEL (debug | info | warn | error | silent); por defecto, info.

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const PRIORITY: Record<Level | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function minimumPriority(): number {
  const configured = process.env.LOG_LEVEL as keyof typeof PRIORITY | undefined;
  return PRIORITY[configured ?? "info"] ?? PRIORITY.info;
}

function serialize(value: unknown): unknown {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  return value;
}

function write(level: Level, message: string, context: Context = {}): void {
  if (PRIORITY[level] < minimumPriority()) return;
  const fields = Object.fromEntries(Object.entries(context).map(([k, v]) => [k, serialize(v)]));
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg: message, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Context) => write("debug", message, context),
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, context?: Context) => write("error", message, context),
};
