import type { SocketState } from './socketTypes';

type ActiveRoomColor = 'w' | 'b';

type ActiveRoomResponse = {
  roomId: string;
  color: ActiveRoomColor;
  gameState: any;
  chatHistory: any[];
};

const TERMINAL_STATUSES = new Set([
  'checkmate',
  'stalemate',
  'draw',
  'resigned',
  'abandoned',
  'timeout',
  'draw-50move',
  'draw-repetition',
]);

let activeSocketState: SocketState | null = null;

export function setActiveSocketState(state: SocketState): void {
  activeSocketState = state;
}

export function findActiveRoomForUserId(userId: string): ActiveRoomResponse | null {
  if (!activeSocketState || !userId) return null;

  for (const [roomId, roomData] of activeSocketState.rooms.entries()) {
    const color = (['w', 'b'] as ActiveRoomColor[]).find((candidate) => {
      return String(roomData?.players?.[candidate]?.userId || '') === String(userId);
    });
    if (!color) continue;

    const status = String(roomData?.status || '').toLowerCase();
    if (TERMINAL_STATUSES.has(status)) return null;

    return {
      roomId,
      color,
      gameState: roomData,
      chatHistory: Array.isArray(roomData?.chatHistory) ? roomData.chatHistory : [],
    };
  }

  return null;
}

export function countActiveRooms(): number {
  if (!activeSocketState) return 0;

  let activeRooms = 0;
  for (const roomData of activeSocketState.rooms.values()) {
    const status = String(roomData?.status || '').toLowerCase();
    if (!TERMINAL_STATUSES.has(status)) activeRooms += 1;
  }

  return activeRooms;
}
