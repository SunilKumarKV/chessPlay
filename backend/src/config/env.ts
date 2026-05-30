import dotenv from 'dotenv';

dotenv.config();

const WEAK_JWT_SECRETS = new Set([
  'your-placeholder-secret-key',
  'your-super-secret-jwt-key-change-this-in-production',
  'dev-jwt-secret-not-for-production',
]);

function parseCsvEnv(value: string | undefined): string[] {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number.parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  CORS_ALLOWED_ORIGINS: [
    ...parseCsvEnv(process.env.CORS_ALLOWED_ORIGINS),
    ...parseCsvEnv(process.env.FRONTEND_ORIGINS),
    ...parseCsvEnv(process.env.CLIENT_URL),
    ...parseCsvEnv(process.env.FRONTEND_URL),
  ],
};

export const isProduction = env.NODE_ENV === 'production';

export function validateEnv() {
  if (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET) throw new Error('JWT secrets missing');
  if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) throw new Error('JWT secrets too weak');
  if (WEAK_JWT_SECRETS.has(env.JWT_ACCESS_SECRET) || WEAK_JWT_SECRETS.has(env.JWT_REFRESH_SECRET)) throw new Error('Weak JWT secrets detected');
  if (isProduction && !env.DATABASE_URL) throw new Error('DATABASE_URL required');
  if ((process.env.RENDER || process.env.RENDER_EXTERNAL_URL) && process.env.NODE_ENV !== 'production') {
    console.warn('[env] NODE_ENV is not "production" on Render. Cross-origin cookies will still use SameSite=None via RENDER detection.');
  }
  if (process.env.COOKIE_DOMAIN && (process.env.RENDER || process.env.RENDER_EXTERNAL_URL)) {
    console.warn('[env] COOKIE_DOMAIN is set on a hosted API. Leave COOKIE_DOMAIN empty when frontend and API are on different domains (e.g. Vercel + Render).');
  }
}
