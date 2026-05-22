import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const weakJwtSecrets = new Set([
  "your-placeholder-secret-key",
  "your-super-secret-jwt-key-change-this-in-production",
  "dev-jwt-secret-not-for-production",
]);

export function parseCsvEnv(value?: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateEnv() {
  const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!accessSecret) throw new Error("JWT_ACCESS_SECRET is required.");
  if (!refreshSecret) throw new Error("JWT_REFRESH_SECRET is required.");
  if (accessSecret.length < 32 || refreshSecret.length < 32) throw new Error("JWT secrets must be at least 32 characters long.");
  if (weakJwtSecrets.has(accessSecret) || weakJwtSecrets.has(refreshSecret)) throw new Error("JWT secrets use known weak/default values.");
  if (isProduction && accessSecret === refreshSecret) throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production.");
  if (isProduction && !(process.env.FRONTEND_URL || process.env.FRONTEND_ORIGINS || process.env.CLIENT_URL || process.env.CORS_ALLOWED_ORIGINS)) {
    throw new Error("FRONTEND_URL or FRONTEND_ORIGINS is required in production.");
  }
}

export const env = {
  isProduction,
  port: Number(process.env.PORT || 5001),
  frontendOrigins: Array.from(new Set([
    ...parseCsvEnv(process.env.CORS_ALLOWED_ORIGINS),
    ...parseCsvEnv(process.env.FRONTEND_ORIGINS),
    ...parseCsvEnv(process.env.CLIENT_URL),
    ...parseCsvEnv(process.env.FRONTEND_URL),
  ])),
};
