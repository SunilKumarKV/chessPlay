import type { Server as SocketIOServer } from 'socket.io';
import type { SocketState } from './socketTypes';
import { updateGame } from './repositories/gameRepository';
import { prisma } from './config/prisma';

const { opponent } = require('../chessUtils');
const { isPlayableStatus } = require('../gameState');
const { updatePlayerStats } = require('../utils/elo');

type ClockColor = 'w' | 'b';

type TimeControl = {
  label: string;
  initialMs: number | null;
  incrementMs: number;
};

export const TIME_CONTROLS: TimeControl[] = [
  { label: '1+0 Bullet', initialMs: 60_000, incrementMs: 0 },
  { label: '2+1 Bullet', initialMs: 120_000, incrementMs: 1_000 },
  { label: '3+0 Blitz', initialMs: 180_000, incrementMs: 0 },
  { label: '5+3 Blitz', initialMs: 300_000, incrementMs: 3_000 },
  { label: '10+0 Rapid', initialMs: 600_000, incrementMs: 0 },
  { label: '10+5 Rapid', initialMs: 600_000, incrementMs: 5_000 },
  { label: '30+0 Classical', initialMs: 1_800_000, incrementMs: 0 },
  { label: 'Unlimited', initialMs: null, incrementMs: 0 },
];

const clockIntervals = new Map<string, NodeJS.Timeout>();

function validTimeControlIndex(value: unknown): number | null {
  if (!Number.isInteger(value)) return null;
  const index = Number(value);
  const control = TIME_CONTROLS[index];
  return control && control.initialMs !== null ? index : null;
}

export function createRoomClock(timeControlIndex: unknown) {
  const index = validTimeControlIndex(timeControlIndex);
  const control = index === null ? null : TIME_CONTROLS[index];
  const initialMs = control?.initialMs ?? 0;

  return {
    enabled: Boolean(control),
    timeControlIndex: index,
    whiteMs: initialMs,
    blackMs: initialMs,
    incrementMs: control?.incrementMs ?? 0,
    activeColor: 'w' as ClockColor,
    lastTickAt: null as number | null,
    status: 'idle' as 'idle' | 'running' | 'paused' | 'ended',
  };
}

export function timeControlLabel(timeControlIndex: unknown): string | null {
  const index = validTimeControlIndex(timeControlIndex);
  return index === null ? null : TIME_CONTROLS[index].label;
}

export function attachRoomClock(gameState: any, timeControlIndex: unknown): void {
  gameState.clock = createRoomClock(timeControlIndex);
}

function emitClock(io: SocketIOServer, roomId: string, eventName: 'clockSnapshot' | 'clockTick', clock: any): void {
  io.to(roomId).emit(eventName, { roomId, clock, serverNow: Date.now() });
}

export function syncClock(roomData: any, now = Date.now()): any {
  const clock = roomData?.clock;
  if (!clock?.enabled || clock.status !== 'running' || !clock.lastTickAt) return clock;
  const elapsed = Math.max(0, now - clock.lastTickAt);
  if (elapsed <= 0) return clock;

  if (clock.activeColor === 'w') {
    clock.whiteMs = Math.max(0, Number(clock.whiteMs || 0) - elapsed);
  } else {
    clock.blackMs = Math.max(0, Number(clock.blackMs || 0) - elapsed);
  }
  clock.lastTickAt = now;
  return clock;
}

export function stopRoomClock(roomId: string, roomData?: any, status: 'paused' | 'ended' = 'ended'): void {
  const interval = clockIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    clockIntervals.delete(roomId);
  }
  if (roomData?.clock?.enabled) {
    syncClock(roomData);
    roomData.clock.status = status;
    roomData.clock.lastTickAt = null;
  }
}

export function emitClockSnapshot(io: SocketIOServer, roomId: string, roomData: any): void {
  if (!roomData?.clock?.enabled) return;
  syncClock(roomData);
  emitClock(io, roomId, 'clockSnapshot', roomData.clock);
}

export async function handleTimeout(io: SocketIOServer, state: SocketState, roomId: string, timedOutColor: ClockColor): Promise<boolean> {
  const roomData = state.rooms.get(roomId);
  if (!roomData || !roomData.clock?.enabled || !isPlayableStatus(roomData.status)) return false;

  stopRoomClock(roomId, roomData, 'ended');
  const winnerColor = opponent(timedOutColor) as ClockColor;
  const winnerSlot = roomData.players[winnerColor];
  const loserSlot = roomData.players[timedOutColor];

  roomData.status = 'timeout';
  roomData.turn = timedOutColor;
  await prisma.$transaction(async (tx) => {
    await updateGame(roomData.gameId, {
      result: winnerColor === 'w' ? 'WHITE_WIN' : 'BLACK_WIN',
      endedAt: new Date(),
    }, tx);
    if (winnerSlot?.userId) await updatePlayerStats(winnerSlot.userId, loserSlot?.userId || null, tx);
  });

  io.to(roomId).emit('timeoutResult', {
    roomId,
    color: timedOutColor,
    winnerColor,
    gameState: roomData,
    clock: roomData.clock,
    serverNow: Date.now(),
  });
  emitClock(io, roomId, 'clockSnapshot', roomData.clock);
  return true;
}

async function tickRoomClock(io: SocketIOServer, state: SocketState, roomId: string): Promise<void> {
  const roomData = state.rooms.get(roomId);
  if (!roomData?.clock?.enabled || roomData.clock.status !== 'running') {
    stopRoomClock(roomId, roomData, roomData?.clock?.status === 'ended' ? 'ended' : 'paused');
    return;
  }

  syncClock(roomData);
  const activeColor = roomData.clock.activeColor as ClockColor;
  const activeMs = activeColor === 'w' ? roomData.clock.whiteMs : roomData.clock.blackMs;
  if (activeMs <= 0) {
    await handleTimeout(io, state, roomId, activeColor);
    return;
  }
  emitClock(io, roomId, 'clockTick', roomData.clock);
}

export function startRoomClock(io: SocketIOServer, state: SocketState, roomId: string): void {
  const roomData = state.rooms.get(roomId);
  const clock = roomData?.clock;
  if (!clock?.enabled || !isPlayableStatus(roomData.status)) return;

  clock.status = 'running';
  clock.activeColor = roomData.turn || 'w';
  clock.lastTickAt = Date.now();
  emitClock(io, roomId, 'clockSnapshot', clock);

  if (clockIntervals.has(roomId)) return;
  const interval = setInterval(() => {
    tickRoomClock(io, state, roomId).catch(() => {});
  }, 1000);
  clockIntervals.set(roomId, interval);
}

export function pauseRoomClock(io: SocketIOServer, roomId: string, roomData: any): void {
  if (!roomData?.clock?.enabled || roomData.clock.status !== 'running') return;
  stopRoomClock(roomId, roomData, 'paused');
  emitClock(io, roomId, 'clockSnapshot', roomData.clock);
}

export async function advanceClockAfterMove(io: SocketIOServer, state: SocketState, roomId: string, movedColor: ClockColor): Promise<boolean> {
  const roomData = state.rooms.get(roomId);
  const clock = roomData?.clock;
  if (!clock?.enabled) return true;

  syncClock(roomData);
  const remaining = movedColor === 'w' ? clock.whiteMs : clock.blackMs;
  if (remaining <= 0) {
    await handleTimeout(io, state, roomId, movedColor);
    return false;
  }

  if (movedColor === 'w') clock.whiteMs += clock.incrementMs;
  else clock.blackMs += clock.incrementMs;

  clock.activeColor = opponent(movedColor);
  clock.lastTickAt = Date.now();
  clock.status = isPlayableStatus(roomData.status) ? 'running' : 'ended';
  emitClock(io, roomId, 'clockSnapshot', clock);
  return true;
}
