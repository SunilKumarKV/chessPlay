import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';

import { getAllowedOrigins, isAllowedOrigin } from './app';
import { isProduction } from './config/env';

const User = require('../models/User');
const { getJwtSecret } = require('../utils/security');

type SocketState = {
  rooms: Map<string, unknown>;
  players: Map<string, unknown>;
  spectators: Map<string, Set<string>>;
};

export function createSocketState(): SocketState {
  return {
    rooms: new Map(),
    players: new Map(),
    spectators: new Map(),
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

    socket.on('disconnect', () => {
      if (user?._id) socket.broadcast.emit('socialUserStatus', { userId: user._id, status: 'offline' });
    });
  });

  return io;
}

export function socketHealthState(state: SocketState) {
  return {
    rooms: () => state.rooms.size,
    players: () => state.players.size,
  };
}
