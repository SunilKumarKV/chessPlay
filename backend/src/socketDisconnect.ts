import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SocketState } from './socketTypes';
import { cleanupSpectator } from './socketRooms';
import { broadcastQueueUpdate, removeFromQueue } from './socketMatchmaking';
import { closeRoomIfEmpty } from './socketGameplay';
import { prisma } from './config/prisma';
import { findGameById, updateGame } from './repositories/gameRepository';
import { emitClockSnapshot, pauseRoomClock, stopRoomClock } from './socketClock';

const logger = require('../utils/safeLogger');
const { updatePlayerStats } = require('../utils/elo');
const { opponent } = require('../chessUtils');
const { isPlayableStatus } = require('../gameState');

const RECONNECTION_GRACE_MS = 60 * 1000;
const reconnectionTimers = new Map<string, NodeJS.Timeout>();

function getReconnectKey(roomId: string, color: string): string {
  return `${roomId}:${color}`;
}

export function clearReconnectTimer(roomId: string, color: string): void {
  const key = getReconnectKey(roomId, color);
  if (reconnectionTimers.has(key)) {
    clearTimeout(reconnectionTimers.get(key));
  }
  reconnectionTimers.delete(key); // [stability-sprint1] idempotent reconnection timer cancellation
}

export async function awardAbandonmentWin(io: SocketIOServer, state: SocketState, roomId: string, abandonedColor: string): Promise<void> {
  const roomData = state.rooms.get(roomId);
  if (!roomData || !isPlayableStatus(roomData.status)) return;

  const game = await findGameById(roomData.gameId);
  if (game?.result != null) {
    logger.warn(`awardAbandonmentWin skipped: game ${roomData.gameId} already has result ${game.result}`);
    return; // [stability-sprint1] guard against duplicate abandonment writes
  }

  const winnerColor = opponent(abandonedColor);
  const winnerSlot = roomData.players[winnerColor];
  const loserSlot = roomData.players[abandonedColor];
  const loserId = loserSlot?.userId || null;

  roomData.status = 'abandoned';
  roomData.turn = abandonedColor;
  stopRoomClock(roomId, roomData, 'ended');
  loserSlot.id = null;
  loserSlot.userId = null;
  loserSlot.disconnected = false;

  try {
    await prisma.$transaction(async (tx) => {
      await updateGame(roomData.gameId, {
        result: winnerColor === 'w' ? 'WHITE_WIN' : 'BLACK_WIN',
        endedAt: new Date(),
      }, tx);

      if (winnerSlot?.userId) await updatePlayerStats(winnerSlot.userId, loserId, tx);
    });
  } catch (error) {
    logger.error(`Transaction failed for game ${roomData.gameId}:`, error);
    throw error;
  }

  io.to(roomId).emit('playerAbandoned', { color: abandonedColor, winnerColor, gameState: roomData });
  emitClockSnapshot(io, roomId, roomData);
}

export async function cleanupPlayer(io: SocketIOServer, socket: Socket, state: SocketState, notify = true): Promise<void> {
  const player = state.players.get(socket.id);
  if (!player) return;

  const roomData = state.rooms.get(player.roomId);
  if (roomData) {
    clearReconnectTimer(player.roomId, player.color);

    const leavingColor = player.color;
    const opponentColor = opponent(leavingColor);
    const leavingSlot = roomData.players[leavingColor];
    const opponentSlot = roomData.players[opponentColor];
    const leavingUserId = leavingSlot.userId;
    const opponentUserId = opponentSlot?.userId;

    leavingSlot.id = null;
    leavingSlot.disconnected = false;
    leavingSlot.name = leavingColor === 'w' ? 'Player 1' : 'Player 2';

    if (opponentUserId && isPlayableStatus(roomData.status)) {
      roomData.status = 'abandoned';
      stopRoomClock(player.roomId, roomData, 'ended');
      await prisma.$transaction(async (tx) => {
        await updateGame(roomData.gameId, {
          result: opponentColor === 'w' ? 'WHITE_WIN' : 'BLACK_WIN',
          endedAt: new Date(),
        }, tx);
        await updatePlayerStats(opponentUserId, leavingUserId, tx);
      });
      io.to(player.roomId).emit('playerAbandoned', { winnerColor: opponentColor, gameState: roomData });
      emitClockSnapshot(io, player.roomId, roomData);
      state.players.delete(socket.id);
      return;
    }

    if (!roomData.players.w.userId && !roomData.players.b.userId) {
      await closeRoomIfEmpty(io, state, player.roomId);
    } else if (notify) {
      io.to(player.roomId).emit('playerLeft', { color: player.color, name: player.playerName });
    }
  }

  state.players.delete(socket.id);
}

export function markPlayerDisconnected(io: SocketIOServer, socket: Socket, state: SocketState): void {
  const player = state.players.get(socket.id);
  if (!player) return;

  const roomData = state.rooms.get(player.roomId);
  if (!roomData) {
    state.players.delete(socket.id);
    return;
  }

  const playerSlot = roomData.players[player.color];
  playerSlot.id = null;
  playerSlot.disconnected = true;
  playerSlot.userId = player.userId;
  playerSlot.name = player.playerName;
  state.players.delete(socket.id);
  pauseRoomClock(io, player.roomId, roomData);

  io.to(player.roomId).emit('playerDisconnected', {
    color: player.color,
    name: player.playerName,
    reconnectBy: Date.now() + RECONNECTION_GRACE_MS,
    gameState: roomData,
  });

  clearReconnectTimer(player.roomId, player.color);
  const timer = setTimeout(async () => {
    reconnectionTimers.delete(getReconnectKey(player.roomId, player.color));
    const currentRoom = state.rooms.get(player.roomId);
    const currentSlot = currentRoom?.players[player.color];
    if (!currentRoom || !currentSlot?.disconnected || currentSlot.id) return;
    await awardAbandonmentWin(io, state, player.roomId, player.color);
  }, RECONNECTION_GRACE_MS);

  reconnectionTimers.set(getReconnectKey(player.roomId, player.color), timer);
}

export async function leaveRoom(io: SocketIOServer, socket: Socket, state: SocketState): Promise<void> {
  const player = state.players.get(socket.id);
  if (player) {
    socket.leave(player.roomId);
    await cleanupPlayer(io, socket, state, true);
    socket.emit('leftRoom');
    return;
  }

  if (state.spectatorRooms.has(socket.id)) {
    cleanupSpectator(io, state, socket.id, true);
    socket.emit('leftRoom');
    return;
  }

  socket.emit('leftRoom');
}

export function handleDisconnect(io: SocketIOServer, socket: Socket, state: SocketState): void {
  removeFromQueue(state, socket.id);
  markPlayerDisconnected(io, socket, state);
  cleanupSpectator(io, state, socket.id);
  state.chatRateLimits.delete(socket.id);
  for (const key of Array.from(state.socketEventRateLimits.keys())) {
    if (key.startsWith(`${socket.id}:`)) state.socketEventRateLimits.delete(key);
  }
  const user = socket.data.user;
  const userId = user?.id || user?._id;
  if (userId) socket.broadcast.emit('socialUserStatus', { userId, status: 'offline' });
  broadcastQueueUpdate(io, state);
}
