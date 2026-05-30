export type MatchmakingEntry = {
  socketId: string;
  userId: string;
  playerName: string;
  rating: number;
  mode: string;
  timeControlIndex: number | null;
  ratingRange: { min: number; max: number };
};

export type SocketState = {
  rooms: Map<string, any>;
  players: Map<string, any>;
  spectators: Map<string, Set<string>>;
  spectatorRooms: Map<string, string>;
  matchmakingQueue: MatchmakingEntry[];
  chatRateLimits: Map<string, { count: number; resetAt: number }>;
  socketEventRateLimits: Map<string, { count: number; resetAt: number }>;
};
