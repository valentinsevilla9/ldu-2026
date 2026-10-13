// Contrato de /api/health, compartido entre la ruta y la interfaz.
export type HealthResponse = {
  status: "ok" | "error";
  timestamp: string;
  checks: { database: "ok" | "error" };
  /** Only present when something is wrong; written for the user. */
  message?: string;
};
