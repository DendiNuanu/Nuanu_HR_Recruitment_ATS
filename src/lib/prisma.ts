import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always cache — including production — so warm serverless invocations
// reuse the existing client instead of opening a fresh DB connection each time.
globalForPrisma.prisma = prisma;

export default prisma;
