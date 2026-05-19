const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production.");
    }
    return null;
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__chessplayPrisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__chessplayPrisma = prisma;
}

async function checkDatabase() {
  if (!prisma) {
    return { ok: false, message: "DATABASE_URL is not configured" };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

module.exports = { prisma, checkDatabase };
