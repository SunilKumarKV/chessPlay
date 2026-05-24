import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { MatchmakingEntry, SocketState } from './socketTypes';
import { acceptDraw, handleMove, resignGame } from './socketGameplay';
import { handleDisconnect, leaveRoom } from './socketDisconnect';
import { broadcastQueueUpdate, createMatchRoom, findQueuedOpponent, getRatingRange, removeFromQueue } from './socketMatchmaking';
import { cleanupSpectator, createRoom, joinRoom, rejoinRoom, spectateRoom } from './socketRooms';

type SafeRegistrar = (eventName: string, handler: (...args: unknown[]) => Promise<void> | void) => void;

function activeRoomIdFor(socket: Socket, state: SocketState): string | null {
  const player = state.players.get(socket.id);
  return player?.roomId || state.spectatorRooms.get(socket.id) || null;
}

function socketUserId(user: any): string {
  return String(user?.id || user?._id || '');
}

function emitServerError(socket: Socket, message: string): void {
  socket.emit('serverError', { message });
}

function sanitizeChatText(value: unknown): string {
  return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, 200);
}

export function registerSocketHandlers(io: SocketIOServer, socket: Socket, state: SocketState, onSafe: SafeRegistrar): void {
  const user = socket.data.user;
  const userId = socketUserId(user);

  onSafe('joinQueue', async (data = {}) => {
    removeFromQueue(state, socket.id);
    cleanupSpectator(io, state, socket.id, true);

    const payload = data as any;
    const rating = Number(user?.rating || 1200);
    const mode = ['casual', 'ranked', 'blitz', 'rapid', 'beginner', 'intermediate', 'advanced'].includes(payload.mode) ? payload.mode : 'casual';
    const entry: MatchmakingEntry = {
      socketId: socket.id,
      userId,
      playerName: String(payload.playerName || user.username || 'Player').replace(/[^\w .-]/g, '').trim().slice(0, 30) || 'Player',
      rating,
      mode,
      timeControlIndex: Number.isInteger(payload.timeControlIndex) ? payload.timeControlIndex : null,
      ratingRange: payload.ratingRange || getRatingRange(rating),
    };

    const opponent = findQueuedOpponent(state, entry);
    if (!opponent) {
      state.matchmakingQueue.push(entry);
      socket.emit('queueJoined', { queueSize: state.matchmakingQueue.length });
      broadcastQueueUpdate(io, state);
      return;
    }

    removeFromQueue(state, opponent.socketId);
    const roomId = await createMatchRoom(io, state, entry, opponent);
    if (!roomId) {
      state.matchmakingQueue.push(entry);
      socket.emit('queueJoined', { queueSize: state.matchmakingQueue.length });
    }
    broadcastQueueUpdate(io, state);
  });

  onSafe('leaveQueue', () => {
    removeFromQueue(state, socket.id);
    socket.emit('queueLeft', { queueSize: state.matchmakingQueue.length });
    broadcastQueueUpdate(io, state);
  });

  onSafe('createRoom', async (data) => {
    removeFromQueue(state, socket.id);
    cleanupSpectator(io, state, socket.id, true);
    await createRoom(socket, state, data);
  });

  onSafe('joinRoom', async (data) => {
    removeFromQueue(state, socket.id);
    cleanupSpectator(io, state, socket.id, true);
    await joinRoom(io, socket, state, data);
  });

  onSafe('spectateRoom', (data) => {
    removeFromQueue(state, socket.id);
    spectateRoom(io, socket, state, data);
  });

  onSafe('rejoinRoom', (data) => {
    removeFromQueue(state, socket.id);
    cleanupSpectator(io, state, socket.id, true);
    rejoinRoom(io, socket, state, data);
  });

  onSafe('makeMove', async (data) => {
    await handleMove(io, socket, state, data);
  });

  onSafe('drawOffer', () => {
    const player = state.players.get(socket.id);
    if (!player) {
      emitServerError(socket, 'Not in a room');
      return;
    }
    socket.to(player.roomId).emit('drawOffer', { fromColor: player.color, fromName: player.playerName });
  });

  onSafe('drawDeclined', () => {
    const player = state.players.get(socket.id);
    if (player) socket.to(player.roomId).emit('drawDeclined');
  });

  onSafe('drawAccepted', async () => {
    await acceptDraw(io, socket, state);
  });
  onSafe('resign', async () => {
    await resignGame(io, socket, state);
  });
  onSafe('leaveRoom', async () => {
    await leaveRoom(io, socket, state);
  });

  onSafe('sendMessage', (data) => {
    const roomId = activeRoomIdFor(socket, state);
    if (!roomId) {
      emitServerError(socket, 'Not in a room');
      return;
    }
    const roomData = state.rooms.get(roomId);
    if (!roomData) {
      emitServerError(socket, 'Room not found');
      return;
    }
    const text = sanitizeChatText((data as any)?.text || (data as any)?.message);
    if (!text) return;
    const chatMessage = { userId, username: user.username, text, timestamp: new Date().toISOString() };
    roomData.chatHistory = roomData.chatHistory || [];
    roomData.chatHistory.push(chatMessage);
    if (roomData.chatHistory.length > 50) roomData.chatHistory.shift();
    io.to(roomId).emit('chatMessage', chatMessage);
  });

  onSafe('getRooms', () => {
    const roomList = Array.from(state.rooms.entries()).map(([id, room]) => ({
      id,
      players: { w: room.players.w.name, b: room.players.b.name },
      spectatorCount: state.spectators.get(id)?.size || 0,
      isFull: Boolean(room.players.w.userId && room.players.b.userId),
      status: room.status,
    }));
    socket.emit('roomsList', roomList);
  });

  socket.on('disconnect', () => handleDisconnect(io, socket, state));
}
