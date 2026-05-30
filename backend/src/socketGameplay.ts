import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SocketState } from './socketTypes';

const Game = require('../models/Game');
const User = require('../models/User');
const { updatePlayerStats } = require('../utils/elo');
const { isValidMove: validateMove, applyMove, opponent } = require('../chessUtils');
const { isPlayableStatus, toGameResult } = require('../gameState');

export async function updateDrawStats(whiteUserId?: string, blackUserId?: string): Promise<void> {
  const updates = [];
  if (whiteUserId) updates.push(User.findByIdAndUpdate(whiteUserId, { $inc: { gamesPlayed: 1, gamesDrawn: 1 } }));
  if (blackUserId) updates.push(User.findByIdAndUpdate(blackUserId, { $inc: { gamesPlayed: 1, gamesDrawn: 1 } }));
  await Promise.all(updates);
}

export async function handleMove(io: SocketIOServer, socket: Socket, state: SocketState, data: any): Promise<void> {
  const { fromRow, fromCol, toRow, toCol, promotion } = data || {};
  if (![fromRow, fromCol, toRow, toCol].every((value) => Number.isInteger(value) && value >= 0 && value <= 7)) {
    socket.emit('serverError', { message: 'Invalid move coordinates' });
    return;
  }
  if (promotion && !['q', 'r', 'b', 'n'].includes(String(promotion).toLowerCase())) {
    socket.emit('serverError', { message: 'Invalid promotion piece' });
    return;
  }

  const player = state.players.get(socket.id);
  if (!player) {
    socket.emit('serverError', { message: 'Not in a room' });
    return;
  }
  const roomData = state.rooms.get(player.roomId);
  if (!roomData) {
    socket.emit('serverError', { message: 'Room not found' });
    return;
  }
  if (!isPlayableStatus(roomData.status)) {
    socket.emit('serverError', { message: 'Game is over' });
    return;
  }
  if (roomData.turn !== player.color) {
    socket.emit('serverError', { message: 'Not your turn' });
    return;
  }
  if (!validateMove(roomData, fromRow, fromCol, toRow, toCol)) {
    socket.emit('serverError', { message: 'Invalid move' });
    return;
  }

  const piece = roomData.board[toRow][toCol];
  let gameUpdate: any = {
    $push: {
      moves: {
        from: `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`,
        to: `${String.fromCharCode(97 + toCol)}${8 - toRow}`,
        piece,
      },
    },
  };

  if (roomData.status === 'checkmate') {
    const winnerColor = player.color;
    const loserColor = roomData.turn;
    const winnerId = player.userId;
    const loserId = roomData.players[loserColor]?.userId || null;
    gameUpdate = { ...gameUpdate, result: winnerColor === 'w' ? 'white' : 'black', winner: winnerId, endTime: new Date() };
    await updatePlayerStats(winnerId, loserId);
  } else if (['stalemate', 'draw-50move', 'draw-repetition'].includes(roomData.status)) {
    gameUpdate = { ...gameUpdate, result: 'draw', winner: null, endTime: new Date() };
    await updateDrawStats(roomData.players.w.userId, roomData.players.b.userId);
  }

  await Game.findByIdAndUpdate(roomData.gameId, gameUpdate);
  io.to(player.roomId).emit('moveMade', { gameState: roomData, move: { fromRow, fromCol, toRow, toCol } });
}

export async function acceptDraw(io: SocketIOServer, socket: Socket, state: SocketState): Promise<void> {
  const player = state.players.get(socket.id);
  if (!player) {
    socket.emit('serverError', { message: 'Not in a room' });
    return;
  }
  const roomData = state.rooms.get(player.roomId);
  if (!roomData) {
    socket.emit('serverError', { message: 'Room not found' });
    return;
  }
  roomData.status = 'draw';
  await Game.findByIdAndUpdate(roomData.gameId, { result: 'draw', winner: null, endTime: new Date() });
  await updateDrawStats(roomData.players.w.userId, roomData.players.b.userId);
  io.to(player.roomId).emit('drawAccepted', { gameState: roomData });
}

export async function resignGame(io: SocketIOServer, socket: Socket, state: SocketState): Promise<void> {
  const player = state.players.get(socket.id);
  if (!player) {
    socket.emit('serverError', { message: 'Not in a room' });
    return;
  }
  const roomData = state.rooms.get(player.roomId);
  if (!roomData || !isPlayableStatus(roomData.status)) return;
  const winnerColor = opponent(player.color);
  const winnerSlot = roomData.players[winnerColor];
  roomData.status = 'resigned';
  await Game.findByIdAndUpdate(roomData.gameId, { result: winnerColor === 'w' ? 'white' : 'black', winner: winnerSlot?.userId || null, endTime: new Date() });
  if (winnerSlot?.userId) await updatePlayerStats(winnerSlot.userId, player.userId);
  io.to(player.roomId).emit('playerResigned', { color: player.color, winnerColor, gameState: roomData });
}

export async function closeRoomIfEmpty(io: SocketIOServer, state: SocketState, roomId: string): Promise<void> {
  const roomData = state.rooms.get(roomId);
  if (!roomData) return;
  const roomSpectators = state.spectators.get(roomId);
  if (roomSpectators) {
    roomSpectators.forEach((spectatorSocketId) => {
      const spectatorSocket = io.sockets.sockets.get(spectatorSocketId);
      spectatorSocket?.leave(roomId);
      state.spectatorRooms.delete(spectatorSocketId);
      spectatorSocket?.emit('roomClosed', { roomId, message: 'Game ended and room was closed' });
    });
    state.spectators.delete(roomId);
  }
  await Game.findByIdAndUpdate(roomData.gameId, { result: toGameResult(roomData.status), endTime: new Date() });
  state.rooms.delete(roomId);
}
