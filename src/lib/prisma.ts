import { PrismaClient } from "@prisma/client";

// Reutilizamos una única instancia de PrismaClient en desarrollo para evitar
// que el hot-reload de Next.js cree conexiones nuevas en cada recarga.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
