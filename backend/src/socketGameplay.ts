import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SocketState } from './socketTypes';
import { updateGame } from './repositories/gameRepository';
import { recordUserDraw } from './repositories/userRepository';

const { updatePlayerStats } = require('../utils/elo');
const { isValidMove: validateMove, applyMove, opponent } = require('../chessUtils');
const { isPlayableStatus, toGameResult } = require('../gameState');

function emitServerError(socket: Socket, message: string): void {
  socket.emit('serverError', { message });
}

export async function updateDrawStats(whiteUserId?: string, blackUserId?: string): Promise<void> {
  const updates = [];
  if (whiteUserId) updates.push(recordUserDraw(String(whiteUserId)));
  if (blackUserId) updates.push(recordUserDraw(String(blackUserId)));
  await Promise.all(updates);
}

export async function handleMove(io: SocketIOServer, socket: Socket, state: SocketState, data: any): Promise<void> {
  const { fromRow, fromCol, toRow, toCol, promotion } = data || {};
  if (![fromRow, fromCol, toRow, toCol].every((value) => Number.isInteger(value) && value >= 0 && value <= 7)) {
    emitServerError(socket, 'Invalid move coordinates');
    return;
  }
  if (promotion && !['q', 'r', 'b', 'n'].includes(String(promotion).toLowerCase())) {
    emitServerError(socket, 'Invalid promotion piece');
    return;
  }

  const player = state.players.get(socket.id);
  if (!player) {
    emitServerError(socket, 'Not in a room');
    return;
  }
  const roomData = state.rooms.get(player.roomId);
  if (!roomData) {
    emitServerError(socket, 'Room not found');
    return;
  }
  if (!isPlayableStatus(roomData.status)) {
    emitServerError(socket, 'Game is over');
    return;
  }
  if (roomData.turn !== player.color) {
    emitServerError(socket, 'Not your turn');
    return;
  }
  if (!validateMove(roomData, fromRow, fromCol, toRow, toCol)) {
    emitServerError(socket, 'Invalid move');
    return;
  }

  const color = player.color;
  applyMove(roomData, fromRow, fromCol, toRow, toCol, promotion);

  const moveRecord = {
    from: `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`,
    to: `${String.fromCharCode(97 + toCol)}${8 - toRow}`,
    piece: roomData.board[toRow][toCol],
  };

  const existingMoves = Array.isArray(roomData.moves) ? roomData.moves : [];
  const updatePayload: any = { moves: [...existingMoves, moveRecord] };

  if (roomData.status === 'checkmate') {
    const winnerColor = color;
    const loserColor = roomData.turn;
    const winnerId = player.userId;
    const loserId = roomData.players[loserColor]?.userId || null;
    updatePayload.result = winnerColor === 'w' ? 'white' : 'black';
    updatePayload.winner = winnerId;
    updatePayload.endTime = new Date();
    await updatePlayerStats(winnerId, loserId);
  } else if (['stalemate', 'draw-50move', 'draw-repetition'].includes(roomData.status)) {
    updatePayload.result = 'draw';
    updatePayload.winner = null;
    updatePayload.endTime = new Date();
    await updateDrawStats(roomData.players.w.userId, roomData.players.b.userId);
  }

  roomData.moves = updatePayload.moves;
  await updateGame(roomData.gameId, updatePayload);
  io.to(player.roomId).emit('moveMade', { gameState: roomData, move: { fromRow, fromCol, toRow, toCol } });
}

export async function acceptDraw(io: SocketIOServer, socket: Socket, state: SocketState): Promise<void> {
  const player = state.players.get(socket.id);
  if (!player) {
    emitServerError(socket, 'Not in a room');
    return;
  }
  const roomData = state.rooms.get(player.roomId);
  if (!roomData) {
    emitServerError(socket, 'Room not found');
    return;
  }
  roomData.status = 'draw';
  await updateGame(roomData.gameId, { result: 'draw', winner: null, endTime: new Date() });
  await updateDrawStats(roomData.players.w.userId, roomData.players.b.userId);
  io.to(player.roomId).emit('drawAccepted', { gameState: roomData });
}

export async function resignGame(io: SocketIOServer, socket: Socket, state: SocketState): Promise<void> {
  const player = state.players.get(socket.id);
  if (!player) {
    emitServerError(socket, 'Not in a room');
    return;
  }
  const roomData = state.rooms.get(player.roomId);
  if (!roomData || !isPlayableStatus(roomData.status)) return;
  const winnerColor = opponent(player.color);
  const winnerSlot = roomData.players[winnerColor];
  roomData.status = 'resigned';
  await updateGame(roomData.gameId, { result: winnerColor === 'w' ? 'white' : 'black', winner: winnerSlot?.userId || null, endTime: new Date() });
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
  await updateGame(roomData.gameId, { result: toGameResult(roomData.status), endTime: new Date() });
  state.rooms.delete(roomId);
}
