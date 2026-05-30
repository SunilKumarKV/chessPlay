import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, type Socket } from 'socket.io';

import { getAllowedOrigins, isAllowedOrigin } from './app';
import { isProduction } from './config/env';
import { registerSocketHandlers } from './socketHandlers';
import type { SocketState } from './socketTypes';

const User = require('../models/User');
const { getJwtSecret } = require('../utils/security');

const SOCKET_EVENT_LIMITS: Record<string, { count: number; windowMs: number }> = {
  makeMove: { count: 12, windowMs: 5000 },
  joinRoom: { count: 8, windowMs: 60_000 },
  createRoom: { count: 6, windowMs: 60_000 },
  joinQueue: { count: 12, windowMs: 60_000 },
  sendMessage: { count: 5, windowMs: 5000 },
  default: { count: 40, windowMs: 10_000 },
};

export function createSocketState(): SocketState {
  return {
    rooms: new Map(),
    players: new Map(),
    spectators: new Map(),
    spectatorRooms: new Map(),
    matchmakingQueue: [],
    chatRateLimits: new Map(),
    socketEventRateLimits: new Map(),
  };
}

function parseCookies(cookieHeader = ''): Record<string, string> {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return cookies;
      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
}

function exceedsSocketEventRateLimit(state: SocketState, socketId: string, eventName: string): boolean {
  const now = Date.now();
  const rule = SOCKET_EVENT_LIMITS[eventName] || SOCKET_EVENT_LIMITS.default;
  const key = `${socketId}:${eventName}`;
  const current = state.socketEventRateLimits.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + rule.windowMs };
  bucket.count += 1;
  state.socketEventRateLimits.set(key, bucket);
  return bucket.count > rule.count;
}

function isSafeSocketPayload(args: unknown[]): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(args), 'utf8') <= 20_000;
  } catch {
    return false;
  }
}

function onSafe(socket: Socket, state: SocketState, eventName: string, handler: (...args: unknown[]) => Promise<void> | void): void {
  socket.on(eventName, (...args: unknown[]) => {
    if (!isSafeSocketPayload(args)) {
      socket.emit('serverError', { message: 'Payload too large' });
      return;
    }
    if (exceedsSocketEventRateLimit(state, socket.id, eventName)) {
      socket.emit('serverError', { message: 'Too many socket events. Please slow down.' });
      return;
    }
    Promise.resolve(handler(...args)).catch(() => {
      socket.emit('serverError', { message: 'An unexpected server error occurred' });
    });
  });
}

export function registerSockets(server: HttpServer, state = createSocketState()): SocketIOServer {
  const allowedOrigins = getAllowedOrigins();
  const io = new SocketIOServer(server, {
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, !isProduction);
        return callback(null, isAllowedOrigin(origin, allowedOrigins));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    maxHttpBufferSize: 20_000,
    transports: ['websocket', 'polling'],
    pingInterval: 25_000,
    pingTimeout: 20_000,
    allowEIO3: false,
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      const token = socket.handshake.auth?.accessToken || cookies.accessToken || cookies.authToken;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, getJwtSecret('access')) as { userId?: string; type?: string };
      if (decoded.type && decoded.type !== 'access') return next(new Error('Invalid token type'));

      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));

      socket.data.user = user;
      return next();
    } catch (error: unknown) {
      const name = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : '';
      const message = name === 'TokenExpiredError' ? 'Invalid token: expired' : 'Invalid token';
      return next(new Error(message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user?._id) {
      socket.join(`user:${user._id}`);
      socket.broadcast.emit('socialUserStatus', { userId: user._id, status: 'online' });
    }

    registerSocketHandlers(io, socket, state, (eventName, handler) => onSafe(socket, state, eventName, handler));
  });

  return io;
}

export function socketHealthState(state: SocketState) {
  return {
    rooms: () => state.rooms.size,
    players: () => state.players.size,
  };
}
