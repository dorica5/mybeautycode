import { PrismaClient } from "@prisma/client";

/**
 * Single shared client — dev hot-reload must not create many pools (connection
 * exhaustion → P1017 “Server has closed the connection”).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isPrismaConnectionError(err: unknown): boolean {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  return code === "P1017" || code === "P1001" || code === "P1008";
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

/** Retry once after reconnect when Supabase/pooler drops an idle connection. */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (!isPrismaConnectionError(err)) throw err;
          console.warn("Prisma connection dropped — reconnecting and retrying…");
          try {
            await basePrisma.$disconnect();
          } catch {
            /* ignore */
          }
          await basePrisma.$connect();
          return await query(args);
        }
      },
    },
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

export async function connectPrisma(): Promise<void> {
  await basePrisma.$connect();
}

export { isPrismaConnectionError };
