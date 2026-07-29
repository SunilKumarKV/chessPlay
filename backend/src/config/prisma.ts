import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { __chessplayPrisma?: PrismaClient | null };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production.");
    return null;
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__chessplayPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__chessplayPrisma = prisma;

export async function checkDatabase() {
  if (!prisma) return { ok: false, message: "DATABASE_URL is not configured" };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: error?.message || "Database query failed" };
  }
}

export async function disconnectPrisma() {
  if (prisma) await prisma.$disconnect();
}
