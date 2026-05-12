import { PrismaClient } from "@prisma/client";

/**
 * Single shared client — dev hot-reload must not create many pools (connection
 * exhaustion → P1017 “Server has closed the connection”).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
