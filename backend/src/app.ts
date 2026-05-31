import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import { env, isProduction } from './config/env';

const authCoreRoutes = require('../routes/authCore');
const authRoutes = require('../routes/auth');
const gameRoutes = require('../routes/games');
const aiRoutes = require('../routes/ai');
const billingCoreRoutes = require('../routes/billingCore');
const billingPaymentsCoreRoutes = require('../routes/billingPaymentsCore');
const billingRoutes = require('../routes/billing');
const socialCoreRoutes = require('../routes/socialCore');
const socialRoutes = require('../routes/social');
const automationCoreRoutes = require('../routes/automationCore');
const automationRoutes = require('../routes/automation');
const adminCoreRoutes = require('../routes/adminCore');
const adminRoutes = require('../routes/admin');
const puzzleRoutes = require('../routes/puzzles');
const feedbackRoutes = require('../routes/feedback');
const paymentsCoreRoutes = require('../routes/paymentsCore');
const paymentRoutes = require('../routes/payments');
const waitlistRoutes = require('../routes/waitlist');
const analysisRoutes = require('../routes/analysis');
const referralRoutes = require('../routes/referrals');
const tournamentsCoreRoutes = require('../routes/tournamentsCore');
const tournamentRoutes = require('../routes/tournaments');
const meRoutes = require('../routes/me');
const coachRoutes = require('../routes/coach');
const openingRoutes = require('../routes/openings');
const mistakeRoutes = require('../routes/mistakes');
const blogRoutes = require('../routes/blog');
const shareRoutes = require('../routes/share');
const supportRoutes = require('../routes/support');
const messagesCoreRoutes = require('../routes/messagesCore');
const messageRoutes = require('../routes/messages');
const settingsCoreRoutes = require('../routes/settingsCore');
const settingsRoutes = require('../routes/settings');
const profileCoreRoutes = require('../routes/profileCore');
const profileRoutes = require('../routes/profile');
const notificationRoutes = require('../routes/notifications');

type HealthState = {
  rooms?: () => number;
  players?: () => number;
};

function sanitizeRequestObject(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    value.forEach(sanitizeRequestObject);
    return value;
  }
  const target = value as Record<string, unknown>;
  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
      continue;
    }
    sanitizeRequestObject(target[key]);
  }
  return value;
}

function requestKeySanitizer(req: Request, _res: Response, next: NextFunction): void {
  sanitizeRequestObject(req.body);
  sanitizeRequestObject(req.params);
  sanitizeRequestObject(req.query);
  next();
}

function configuredOrigins(): Array<string | RegExp> {
  const productionOrigins = Array.from(new Set([
    ...env.CORS_ALLOWED_ORIGINS,
    'https://getchessplay.com',
    'https://www.getchessplay.com',
    'https://getchessplay.vercel.app',
  ].filter(Boolean)));
  const developmentOrigins: Array<string | RegExp> = isProduction ? [] : [
    'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174',
    /^http:\/\/192\.168\.\d+\.\d+:5173$/, /^http:\/\/192\.168\.\d+\.\d+:5174$/,
    /^http:\/\/10\.\d+\.\d+\.\d+:5173$/, /^http:\/\/10\.\d+\.\d+\.\d+:5174$/,
    /^http:\/\/172\.\d+\.\d+\.\d+:5173$/, /^http:\/\/172\.\d+\.\d+\.\d+:5174$/,
  ];
  return [...productionOrigins, ...developmentOrigins];
}

export function getAllowedOrigins(): Array<string | RegExp> {
  return configuredOrigins();
}

export function isAllowedOrigin(origin: string, allowedOrigins = configuredOrigins()): boolean {
  return allowedOrigins.some((pattern) => typeof pattern === 'string' ? pattern === origin : pattern.test(origin));
}

function createCorsOptions(req: Request) {
  const allowedOrigins = configuredOrigins();
  return {
    origin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
      if (!origin) return callback(null, !isProduction || req.path === '/health' || req.path === '/healthz');
      return callback(null, isAllowedOrigin(origin, allowedOrigins));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}

function enforceProductionOrigin(req: Request, res: Response, next: NextFunction): void {
  if (!isProduction) return next();
  const origin = req.headers.origin;
  if (!origin) {
    if (req.path === '/health' || req.path === '/healthz') return next();
    res.status(403).json({ message: 'Origin is required' });
    return;
  }
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ message: 'Origin is not allowed' });
    return;
  }
  next();
}

function registerRoutes(app: express.Express): void {
  app.use('/api/auth', authCoreRoutes);
  if (!isProduction) app.use('/api/auth', authRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/ai', aiRoutes);

  app.use('/api/billing', billingCoreRoutes);
  app.use('/api/billing', billingPaymentsCoreRoutes);
  if (!isProduction) app.use('/api/billing', billingRoutes);

  app.use('/api/payments', paymentsCoreRoutes);
  app.use('/api/payments', paymentRoutes);

  app.use('/api/social', socialCoreRoutes);
  if (!isProduction) app.use('/api/social', socialRoutes);

  app.use('/api/automation', automationCoreRoutes);
  if (!isProduction) app.use('/api/automation', automationRoutes);

  app.use('/api/admin', adminCoreRoutes);
  if (!isProduction) app.use('/api/admin', adminRoutes);

  app.use('/api/tournaments', tournamentsCoreRoutes);
  if (!isProduction) app.use('/api/tournaments', tournamentRoutes);

  app.use('/api/messages', messagesCoreRoutes);
  if (!isProduction) app.use('/api/messages', messageRoutes);

  app.use('/api/settings', settingsCoreRoutes);
  if (!isProduction) app.use('/api/settings', settingsRoutes);

  app.use('/api/profile', profileCoreRoutes);
  if (!isProduction) app.use('/api/profile', profileRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use('/api/puzzles', puzzleRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/waitlist', waitlistRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/referrals', referralRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/coach', coachRoutes);
  app.use('/api/openings', openingRoutes);
  app.use('/api/mistakes', mistakeRoutes);
  app.use('/api/blog', blogRoutes);
  app.use('/api/share', shareRoutes);
  app.use('/api/support', supportRoutes);
}

export function createApp(healthState: HealthState = {}): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  const cspOrigins = configuredOrigins().filter((origin): origin is string => typeof origin === 'string');
  const cspConnectSources = ["'self'", ...cspOrigins, ...cspOrigins.map((origin) => origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:'))];
  app.use((req, res, next) => cors(createCorsOptions(req))(req, res, next));
  app.use(enforceProductionOrigin);
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: isProduction ? 300 : 2000, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please slow down.' } }));
  app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [...cspConnectSources, 'https://accounts.google.com', 'https://oauth2.googleapis.com'],
        scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'https://accounts.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  }));
  app.use(express.json({ limit: '20kb', verify: (req: Request & { rawBody?: string }, _res, buffer) => { if (req.originalUrl.startsWith('/api/payments/webhook')) req.rawBody = buffer.toString('utf8'); } }));
  app.use(requestKeySanitizer);
  app.use(hpp());
  if (isProduction) app.use(morgan('combined'));
  registerRoutes(app);
  app.get('/health', (req, res) => {
    const secret = req.headers['x-health-secret'];
    if (process.env.HEALTH_SECRET && secret !== process.env.HEALTH_SECRET) return res.status(401).json({ status: 'unauthorized' });
    return res.json({ status: 'ok', rooms: healthState.rooms?.() ?? 0, players: healthState.players?.() ?? 0 });
  });
  app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'chessplay-backend' }));
  return app;
}
