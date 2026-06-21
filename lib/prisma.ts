import { PrismaClient } from "@prisma/client";

const globalForPrismaClient = globalThis as unknown as { okrPrismaClient?: PrismaClient };

export const prisma = globalForPrismaClient.okrPrismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaClient.okrPrismaClient = prisma;
}
