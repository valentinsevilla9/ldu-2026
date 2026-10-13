import { prisma } from "@/lib/db";

// Utilidades para los tests de servidor: vaciar la base de pruebas y simular peticiones.

export async function resetDatabase(): Promise<void> {
  await prisma.pilotAction.deleteMany();
  await prisma.alertAck.deleteMany();
  await prisma.rule.deleteMany();
}

/** Builds a route context like the one Next.js passes to dynamic route handlers. */
export const routeContext = <Params>(params: Params) => ({ params: Promise.resolve(params) });

export const jsonRequest = (url: string, method: string, body?: unknown) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
