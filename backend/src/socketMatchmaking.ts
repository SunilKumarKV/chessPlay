import type { Server as SocketIOServer } from 'socket.io';
import type { MatchmakingEntry, SocketState } from './socketTypes';

const Game = require('../models/Game');
const { createInitialGameState } = require('../gameState');

export function getRatingRange(rating: number) {
  return { min: rating - 200, max: rating + 200 };
}

export function removeFromQueue(state: SocketState, socketId: string): void {
  const index = state.matchmakingQueue.findIndex((entry) => entry.socketId === socketId);
  if (index !== -1) state.matchmakingQueue.splice(index, 1);
}

export function findQueuedOpponent(state: SocketState, entry: MatchmakingEntry): MatchmakingEntry | undefined {
  return state.matchmakingQueue.find((candidate) => {
    if (candidate.socketId === entry.socketId) return false;
    const sameMode = !entry.mode || !candidate.mode || entry.mode === 'casual' || candidate.mode === 'casual' || entry.mode === candidate.mode;
    const sameTime = typeof entry.timeControlIndex !== 'number' || typeof candidate.timeControlIndex !== 'number' || entry.timeControlIndex === candidate.timeControlIndex;
    const ratingWindow = entry.mode === 'advanced' || candidate.mode === 'advanced' ? 350 : entry.mode === 'beginner' || candidate.mode === 'beginner' ? 300 : 200;
    return sameMode && sameTime && Math.abs(candidate.rating - entry.rating) <= ratingWindow;
  });
}

export function broadcastQueueUpdate(io: SocketIOServer, state: SocketState): void {
  const queueSize = state.matchmakingQueue.length;
  for (const entry of state.matchmakingQueue) {
    io.sockets.sockets.get(entry.socketId)?.emit('queueUpdate', { queueSize });
  }
}

export async function createMatchRoom(io: SocketIOServer, state: SocketState, playerA: MatchmakingEntry, playerB: MatchmakingEntry): Promise<string | null> {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const [whitePlayer, blackPlayer] = Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];
  const whiteSocket = io.sockets.sockets.get(whitePlayer.socketId);
  const blackSocket = io.sockets.sockets.get(blackPlayer.socketId);
  if (!whiteSocket || !blackSocket) return null;

  const gameState = createInitialGameState();
  gameState.players.w.id = whiteSocket.id;
  gameState.players.w.name = whitePlayer.playerName;
  gameState.players.w.userId = whitePlayer.userId;
  gameState.players.w.disconnected = false;
  gameState.players.b.id = blackSocket.id;
  gameState.players.b.name = blackPlayer.playerName;
  gameState.players.b.userId = blackPlayer.userId;
  gameState.players.b.disconnected = false;

  const game = new Game({ whitePlayer: whitePlayer.userId, blackPlayer: blackPlayer.userId, roomId });
  await game.save();

  gameState.matchmaking = {
    mode: whitePlayer.mode || blackPlayer.mode || 'casual',
    timeControlIndex: Number.isInteger(whitePlayer.timeControlIndex) ? whitePlayer.timeControlIndex : blackPlayer.timeControlIndex,
  };

  state.rooms.set(roomId, { ...gameState, gameId: game._id });
  state.players.set(whiteSocket.id, { roomId, color: 'w', playerName: whitePlayer.playerName, userId: whitePlayer.userId });
  state.players.set(blackSocket.id, { roomId, color: 'b', playerName: blackPlayer.playerName, userId: blackPlayer.userId });

  whiteSocket.join(roomId);
  blackSocket.join(roomId);

  whiteSocket.emit('matchFound', { roomId, gameState, color: 'w', chatHistory: gameState.chatHistory });
  blackSocket.emit('matchFound', { roomId, gameState, color: 'b', chatHistory: gameState.chatHistory });
  io.to(roomId).emit('playerJoined', { gameState, newPlayer: { color: 'b', name: blackPlayer.playerName } });

  return roomId;
}
