import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Runs a trivial query; any failure means the database is unreachable or misconfigured. */
export async function checkDatabase(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch (error) {
    logger.error("Database health check failed", { error });
    return "error";
  }
}
