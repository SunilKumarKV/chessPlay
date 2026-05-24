import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SocketState } from './socketTypes';

const Game = require('../models/Game');
const { createInitialGameState } = require('../gameState');

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

export async function createRoom(socket: Socket, state: SocketState, data: any): Promise<void> {
  const user = socket.data.user;
  const playerName = safePlayerName(data?.playerName, user?.username);
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gameState = createInitialGameState();

  gameState.players.w.id = socket.id;
  gameState.players.w.name = playerName;
  gameState.players.w.userId = user._id;
  gameState.players.w.disconnected = false;

  const game = new Game({ whitePlayer: user._id, roomId });
  await game.save();

  state.rooms.set(roomId, { ...gameState, gameId: game._id });
  state.players.set(socket.id, { roomId, color: 'w', playerName, userId: user._id });
  socket.join(roomId);
  socket.emit('roomCreated', { roomId, gameState, chatHistory: gameState.chatHistory });
}

export async function joinRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): Promise<void> {
  const user = socket.data.user;
  const normalizedRoomId = normalizeRoomCode(data?.roomId);
  if (!normalizedRoomId) return socket.emit('serverError', { message: 'Invalid room code' });

  const roomData = state.rooms.get(normalizedRoomId);
  if (!roomData) return socket.emit('serverError', { message: 'Room not found' });

  const gameState = roomData;
  if (['w', 'b'].some((color) => String(gameState.players[color].userId) === String(user._id))) {
    return socket.emit('serverError', { message: 'You are already in this room' });
  }

  if (gameState.players.w.userId && gameState.players.b.userId) {
    return socket.emit('serverError', { message: 'Room is full' });
  }

  const color = !gameState.players.w.userId ? 'w' : 'b';
  const playerName = safePlayerName(data?.playerName, user.username);
  gameState.players[color].id = socket.id;
  gameState.players[color].name = playerName;
  gameState.players[color].userId = user._id;
  gameState.players[color].disconnected = false;

  await Game.findByIdAndUpdate(gameState.gameId, color === 'w' ? { whitePlayer: user._id } : { blackPlayer: user._id });
  state.players.set(socket.id, { roomId: normalizedRoomId, color, playerName, userId: user._id });
  socket.join(normalizedRoomId);
  socket.emit('joinedRoom', { roomId: normalizedRoomId, gameState, color, chatHistory: gameState.chatHistory });
  io.to(normalizedRoomId).emit('playerJoined', { gameState, newPlayer: { color, name: playerName } });
}

export function spectateRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): void {
  const roomId = normalizeRoomCode(data?.roomId);
  if (!roomId) return socket.emit('serverError', { message: 'Room ID is required' });
  if (state.players.has(socket.id)) return socket.emit('serverError', { message: 'Players cannot spectate a room' });

  const roomData = state.rooms.get(roomId);
  if (!roomData) return socket.emit('serverError', { message: 'Room not found' });

  const currentSpectatorRoom = state.spectatorRooms.get(socket.id);
  if (currentSpectatorRoom && currentSpectatorRoom !== roomId) cleanupSpectator(io, state, socket.id, true);

  socket.join(roomId);
  state.spectatorRooms.set(socket.id, roomId);
  if (!state.spectators.has(roomId)) state.spectators.set(roomId, new Set());
  state.spectators.get(roomId)?.add(socket.id);

  socket.emit('spectatedRoom', {
    roomId,
    gameState: roomData,
    chatHistory: roomData.chatHistory || [],
    spectatorCount: getSpectatorCount(state, roomId),
  });
  emitSpectatorCount(io, state, roomId);
}

export function rejoinRoom(io: SocketIOServer, socket: Socket, state: SocketState, data: any): void {
  const user = socket.data.user;
  const roomId = normalizeRoomCode(data?.roomId);
  if (!roomId) return socket.emit('serverError', { message: 'Room is required' });

  const roomData = state.rooms.get(roomId);
  if (!roomData) return socket.emit('serverError', { message: 'Room not found' });

  const color = ['w', 'b'].find((candidate) => String(roomData.players[candidate].userId) === String(user._id));
  if (!color) return socket.emit('serverError', { message: 'Player is not in this room' });

  const playerSlot = roomData.players[color];
  if (playerSlot.id && playerSlot.id !== socket.id) state.players.delete(playerSlot.id);

  playerSlot.id = socket.id;
  playerSlot.name = playerSlot.name || user.username;
  playerSlot.userId = user._id;
  playerSlot.disconnected = false;

  state.players.set(socket.id, { roomId, color, playerName: playerSlot.name, userId: user._id });
  socket.join(roomId);
  socket.emit('rejoinedRoom', { roomId, gameState: roomData, color, chatHistory: roomData.chatHistory });
  socket.to(roomId).emit('playerRejoined', { gameState: roomData, color, name: playerSlot.name });
}
