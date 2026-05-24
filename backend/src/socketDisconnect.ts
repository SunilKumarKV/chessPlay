import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SocketState } from './socketTypes';
import { cleanupSpectator } from './socketRooms';
import { broadcastQueueUpdate, removeFromQueue } from './socketMatchmaking';
import { closeRoomIfEmpty } from './socketGameplay';
import { updateGame } from './repositories/gameRepository';

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
  const timer = reconnectionTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    reconnectionTimers.delete(key);
  }
}

export async function awardAbandonmentWin(io: SocketIOServer, state: SocketState, roomId: string, abandonedColor: string): Promise<void> {
  const roomData = state.rooms.get(roomId);
  if (!roomData || !isPlayableStatus(roomData.status)) return;

  const winnerColor = opponent(abandonedColor);
  const winnerSlot = roomData.players[winnerColor];
  const loserSlot = roomData.players[abandonedColor];
  const loserId = loserSlot?.userId || null;

  roomData.status = 'abandoned';
  roomData.turn = abandonedColor;
  loserSlot.id = null;
  loserSlot.userId = null;
  loserSlot.disconnected = false;

  await updateGame(roomData.gameId, {
    result: winnerColor === 'w' ? 'white' : 'black',
    winner: winnerSlot?.userId || null,
    endTime: new Date(),
  });

  if (winnerSlot?.userId) await updatePlayerStats(winnerSlot.userId, loserId);
  io.to(roomId).emit('playerAbandoned', { color: abandonedColor, winnerColor, gameState: roomData });
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
      await updateGame(roomData.gameId, {
        result: opponentColor === 'w' ? 'white' : 'black',
        winner: opponentUserId,
        endTime: new Date(),
      });
      await updatePlayerStats(opponentUserId, leavingUserId);
      io.to(player.roomId).emit('playerAbandoned', { winnerColor: opponentColor, gameState: roomData });
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
