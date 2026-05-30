import http from 'http';

import { createApp } from './app';
import { env, validateEnv } from './config/env';
import { prisma } from './config/prisma';
import { createSocketState, registerSockets, socketHealthState, startSocketStateMaintenance } from './socket';

const logger = require('../utils/safeLogger');
const { captureException, initMonitoring } = require('../utils/monitoring');
const { checkDatabase } = require('../lib/prisma');

function fatalConfigError(message: string): never {
  logger.error(`FATAL CONFIG ERROR: ${message}`);
  process.exit(1);
}

initMonitoring();

try {
  validateEnv();
} catch (error) {
  fatalConfigError(error instanceof Error ? error.message : 'Invalid server environment configuration.');
}

const socketState = createSocketState();
const app = createApp(socketHealthState(socketState));
const server = http.createServer(app);

const io = registerSockets(server, socketState);
startSocketStateMaintenance(socketState);

checkDatabase()
  .then((status: { ok: boolean; message?: string }) => {
    if (status.ok) {
      logger.info('Connected to PostgreSQL with Prisma');
      return;
    }
    const message = `PostgreSQL connection unavailable: ${status.message}`;
    if (env.NODE_ENV === 'production') fatalConfigError(message);
    logger.warn(message);
  })
  .catch((error: Error) => {
    captureException(error, { area: 'postgres' });
    if (env.NODE_ENV === 'production') fatalConfigError('PostgreSQL connection failed.');
    logger.error('PostgreSQL connection error', error);
  });

app.use((error: any, req: any, res: any, next: any) => {
  const status = Number(error.status || error.statusCode || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  if (safeStatus >= 500) {
    captureException(error, { path: req.originalUrl, method: req.method });
    logger.error('Unhandled express error', error);
  } else {
    logger.warn('Handled express error', { message: error.message, path: req.originalUrl });
  }
  if (res.headersSent) return next(error);
  return res.status(safeStatus).json({ message: safeStatus >= 500 ? 'Internal server error' : (error.message || 'Request failed') });
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use. Stop the existing server or change PORT.`);
    return;
  }
  captureException(error, { area: 'http_server' });
  logger.error('HTTP server error', error);
});

server.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Chess server running on port ${env.PORT}`);
  logger.info(`Local network access: http://0.0.0.0:${env.PORT}`);
});

// [stability-sprint1] SIGTERM/SIGINT graceful shutdown handlers
let shuttingDown = false;

function gracefulShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);

  const forceExitTimer = setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10_000);

  server.close(() => {
    io.close(() => {
      logger.info('Socket.IO closed');
      prisma.$disconnect()
        .then(() => {
          logger.info('Prisma disconnected');
          clearTimeout(forceExitTimer);
          logger.info('Shutdown completed');
          process.exit(0);
        })
        .catch((error: Error) => {
          logger.error('Error during graceful shutdown', error);
          clearTimeout(forceExitTimer);
          process.exit(1);
        });
    });
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
