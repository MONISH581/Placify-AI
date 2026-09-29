import { PrismaClient } from "@prisma/client";

/** Shared Prisma client (one connection pool per process). */
export const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "warn", "error"] : ["warn", "error"],
});
