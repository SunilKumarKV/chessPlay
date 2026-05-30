import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SocketState } from './socketTypes';
import { createGame, updateGame } from './repositories/gameRepository';
import { attachRoomClock, emitClockSnapshot, startRoomClock, timeControlLabel } from './socketClock';

const { createInitialGameState } = require('../gameState');

function emitServerError(socket: Socket, message: string): void {
  socket.emit('serverError', { message });
}

export function getSpectatorCount(state: SocketState, roomId: string): number {
  return state.spectators.get(roomId)?.size || 0;
}

export function emitSpectatorCount(io: SocketIOServer, state: SocketState, roomId: string): void {
  io.to(roomId).emit('spectatorCount', { roomId, count: getSpectatorCount(state, roomId) });
}

export function cleanupSpectator(io: SocketIOServer, state: SocketState, socketId: string, leaveSocketRoom = false): void {
  const roomId = state.spectatorRooms.get(socketId);
  if (!roomId) return;
  const roomSpectators = state.spectators.get(roomId);
  if (roomSpectators) {
    roomSpectators.delete(socketId);
    if (roomSpectators.size === 0) state.spectators.delete(roomId);
  }
  if (leaveSocketRoom) io.sockets.sockets.get(socketId)?.leave(roomId);
  state.spectatorRooms.delete(socketId);
  emitSpectatorCount(io, state, roomId);
}

export function normalizeRoomCode(value: unknown): string {
  const roomId = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(roomId) ? roomId : '';
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export function safePlayerName(value: unknown, fallback = 'Player'): string {
  const name = stripHtmlTags(String(value || fallback)).replace(/[^\w .-]/g, '').trim().slice(0, 30);
  return name || fallback;
}

export async function createRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): Promise<void> {
  const user = socket.data.user;
  const playerName = safePlayerName(data?.playerName, user?.username);
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gameState = createInitialGameState();
  const userId = String(user.id || user._id);
  const timeControlIndex = Number.isInteger(data?.timeControlIndex) ? Number(data.timeControlIndex) : null;
  attachRoomClock(gameState, timeControlIndex);

  gameState.players.w.id = socket.id;
  gameState.players.w.name = playerName;
  gameState.players.w.userId = userId;
  gameState.players.w.disconnected = false;

  const game = await createGame({ whitePlayerId: userId, status: 'WAITING', timeControl: timeControlLabel(timeControlIndex) });
  const roomData = { ...gameState, gameId: game.id };
  state.rooms.set(roomId, roomData);
  state.players.set(socket.id, { roomId, color: 'w', playerName, userId });
  socket.join(roomId);
  socket.emit('roomCreated', { roomId, gameState: roomData, chatHistory: gameState.chatHistory });
  emitClockSnapshot(io, roomId, roomData);
}

export async function joinRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): Promise<void> {
  const user = socket.data.user;
  const userId = String(user.id || user._id);
  const normalizedRoomId = normalizeRoomCode(data?.roomId);
  if (!normalizedRoomId) {
    emitServerError(socket, 'Invalid room code');
    return;
  }

  const roomData = state.rooms.get(normalizedRoomId);
  if (!roomData) {
    emitServerError(socket, 'Room not found');
    return;
  }

  const gameState = roomData;
  if (['w', 'b'].some((color) => String(gameState.players[color].userId) === userId)) {
    emitServerError(socket, 'You are already in this room');
    return;
  }
  if (gameState.players.w.userId && gameState.players.b.userId) {
    emitServerError(socket, 'Room is full');
    return;
  }

  const color = !gameState.players.w.userId ? 'w' : 'b';
  const playerName = safePlayerName(data?.playerName, user.username);
  gameState.players[color].id = socket.id;
  gameState.players[color].name = playerName;
  gameState.players[color].userId = userId;
  gameState.players[color].disconnected = false;

  await updateGame(gameState.gameId, color === 'w' ? { whitePlayerId: userId, status: 'ACTIVE' } : { blackPlayerId: userId, status: 'ACTIVE' });
  state.players.set(socket.id, { roomId: normalizedRoomId, color, playerName, userId });
  socket.join(normalizedRoomId);
  socket.emit('joinedRoom', { roomId: normalizedRoomId, gameState, color, chatHistory: gameState.chatHistory });
  io.to(normalizedRoomId).emit('playerJoined', { gameState, newPlayer: { color, name: playerName } });
  startRoomClock(io, state, normalizedRoomId);
}

export function spectateRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): void {
  const roomId = normalizeRoomCode(data?.roomId);
  if (!roomId) {
    emitServerError(socket, 'Room ID is required');
    return;
  }
  if (state.players.has(socket.id)) {
    emitServerError(socket, 'Players cannot spectate a room');
    return;
  }
  const roomData = state.rooms.get(roomId);
  if (!roomData) {
    emitServerError(socket, 'Room not found');
    return;
  }
  const currentSpectatorRoom = state.spectatorRooms.get(socket.id);
  if (currentSpectatorRoom && currentSpectatorRoom !== roomId) cleanupSpectator(io, state, socket.id, true);
  socket.join(roomId);
  state.spectatorRooms.set(socket.id, roomId);
  if (!state.spectators.has(roomId)) state.spectators.set(roomId, new Set());
  state.spectators.get(roomId)?.add(socket.id);
  socket.emit('spectatedRoom', { roomId, gameState: roomData, chatHistory: roomData.chatHistory || [], spectatorCount: getSpectatorCount(state, roomId) });
  emitSpectatorCount(io, state, roomId);
  emitClockSnapshot(io, roomId, roomData);
}

export function rejoinRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): void {
  const user = socket.data.user;
  const userId = String(user.id || user._id);
  const roomId = normalizeRoomCode(data?.roomId);
  if (!roomId) {
    emitServerError(socket, 'Room is required');
    return;
  }
  const roomData = state.rooms.get(roomId);
  if (!roomData) {
    emitServerError(socket, 'Room not found');
    return;
  }
  const color = ['w', 'b'].find((candidate) => String(roomData.players[candidate].userId) === userId);
  if (!color) {
    emitServerError(socket, 'Player is not in this room');
    return;
  }
  const playerSlot = roomData.players[color];
  if (playerSlot.id && playerSlot.id !== socket.id) state.players.delete(playerSlot.id);
  playerSlot.id = socket.id;
  playerSlot.name = playerSlot.name || user.username;
  playerSlot.userId = userId;
  playerSlot.disconnected = false;
  state.players.set(socket.id, { roomId, color, playerName: playerSlot.name, userId });
  socket.join(roomId);
  socket.emit('rejoinedRoom', { roomId, gameState: roomData, color, chatHistory: roomData.chatHistory });
  socket.to(roomId).emit('playerRejoined', { gameState: roomData, color, name: playerSlot.name });
  emitClockSnapshot(io, roomId, roomData);
  startRoomClock(io, state, roomId);
}
