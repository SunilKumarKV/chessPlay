import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL || '',
};

export function validateEnv() {
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing');
    if (!env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET missing');
    if (!env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET missing');
  }
}
