require("dotenv").config();

// Validate environment variables
const DEFAULT_JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL ERROR: JWT_SECRET is not set or is using the default value.");
    console.error("Please set a secure JWT_SECRET in your environment variables.");
    process.exit(1);
  } else {
    process.env.JWT_SECRET = "dev-jwt-secret-not-for-production";
    console.warn(
      "Warning: JWT_SECRET is missing/default. Using temporary development secret.",
    );
  }
}

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const {
  isValidMove: validateMove,
  applyMove,
  opponent,
  getPositionKey,
} = require("./chessUtils");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const User = require("./models/User");
const Game = require("./models/Game");
const { updatePlayerStats } = require("./utils/elo");

const app = express();
const server = http.createServer(app);

// Configure CORS for the frontend
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://chessplay1.vercel.app",
  /^http:\/\/192\.168\.\d+\.\d+:5173$/,
  /^http:\/\/192\.168\.\d+\.\d+:5174$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:5174$/,
  /^http:\/\/172\.\d+\.\d+\.\d+:5173$/,
  /^http:\/\/172\.\d+\.\d+\.\d+:5174$/,
];

// Add production frontend URL if provided
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((pattern) => {
      if (typeof pattern === "string") return pattern === origin;
      return pattern.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      // callback(new Error("Not allowed by CORS"));
      console.log("Blocked by CORS:", origin);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

const cspOrigins = allowedOrigins.filter((origin) => typeof origin === "string");
const cspConnectSources = [
  "'self'",
  ...cspOrigins,
  ...cspOrigins.map((origin) =>
    origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
  ),
];

const io = socketIo(server, {
  cors: corsOptions,
});

const RECONNECTION_GRACE_MS = 60 * 1000;
const CHAT_MAX_LENGTH = 200;
const CHAT_RATE_LIMIT_COUNT = 5;
const CHAT_RATE_LIMIT_WINDOW_MS = 5000;
const BLOCKED_WORDS = String(process.env.BLOCKED_WORDS || "")
  .split(",")
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

// Game rooms storage
const rooms = new Map();
const players = new Map(); // socket.id -> { roomId, color, playerName }
const spectators = new Map(); // roomId -> Set<socket.id>
const spectatorRooms = new Map(); // socket.id -> roomId
const reconnectionTimers = new Map(); // `${roomId}:${color}` -> Timeout
const matchmakingQueue = []; // { socketId, userId, playerName, ratingRange, rating }
const chatRateLimits = new Map(); // socket.id -> { count, resetAt }

app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: cspConnectSources,
        workerSrc: ["'self'", "blob:"],
      },
    },
  }),
);
app.use(express.json({ limit: "10kb" }));
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
}

const mongoUri =
  process.env.MONGODB_URI ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "mongodb://127.0.0.1:27017/chessplay");

if (!process.env.MONGODB_URI && process.env.NODE_ENV !== "production") {
  console.warn(
    "Warning: MONGODB_URI is not set. Using local development MongoDB URI.",
  );
}

// Connect to MongoDB
mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);

// Basic health check
app.get("/health", (req, res) => {
  const secret = req.headers["x-health-secret"];
  if (process.env.HEALTH_SECRET && secret !== process.env.HEALTH_SECRET) {
    return res.status(401).json({ status: "unauthorized" });
  }

  res.json({
    status: "ok",
    rooms: rooms.size,
    players: players.size,
  });
});

// Initialize a new game state
function createInitialGameState() {
  const gameState = {
    board: [
      ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
      ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
      ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
    ],
    turn: "w", // w or b
    enPassant: null,
    castling: {
      w: { kingSide: true, queenSide: true },
      b: { kingSide: true, queenSide: true },
    },
    status: "playing", // playing, check, checkmate, stalemate
    halfmoveClock: 0,
    positionHistory: [],
    moveHistory: [],
    capturedW: [],
    capturedB: [],
    chatHistory: [],
    players: {
      w: { id: null, name: "Player 1", userId: null, disconnected: false },
      b: { id: null, name: "Player 2", userId: null, disconnected: false },
    },
  };
  gameState.positionHistory = [getPositionKey(gameState)];
  return gameState;
}

// Simple move validation wrapper
function isValidMove(gameState, fromRow, fromCol, toRow, toCol) {
  return validateMove(gameState, fromRow, fromCol, toRow, toCol);
}

function isPlayableStatus(status) {
  return status === "playing" || status === "check";
}

function toGameResult(status) {
  if (status === "playing" || status === "check") return "ongoing";
  if (
    status === "draw" ||
    status === "stalemate" ||
    status === "draw-50move" ||
    status === "draw-repetition"
  ) {
    return "draw";
  }
  return status;
}

function getReconnectKey(roomId, color) {
  return `${roomId}:${color}`;
}

function clearReconnectTimer(roomId, color) {
  const key = getReconnectKey(roomId, color);
  const timer = reconnectionTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    reconnectionTimers.delete(key);
  }
}

function removeFromQueue(socketId) {
  const index = matchmakingQueue.findIndex((entry) => entry.socketId === socketId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
    broadcastQueueUpdate();
  }
}

function broadcastQueueUpdate() {
  const size = matchmakingQueue.length;
  for (const entry of matchmakingQueue) {
    const socket = io.sockets.sockets.get(entry.socketId);
    socket?.emit("queueUpdate", { queueSize: size });
  }
}

function getRatingRange(rating) {
  return {
    min: rating - 200,
    max: rating + 200,
  };
}

function findQueuedOpponent(entry) {
  return matchmakingQueue.find(
    (candidate) =>
      candidate.socketId !== entry.socketId &&
      Math.abs(candidate.rating - entry.rating) <= 200,
  );
}

function stripHtmlTags(text) {
  return text.replace(/<[^>]*>/g, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function censorBlockedWords(text) {
  if (BLOCKED_WORDS.length === 0) return text;

  let sanitized = text;
  for (const blockedWord of BLOCKED_WORDS) {
    const pattern = new RegExp(`\\b${escapeRegex(blockedWord)}\\b`, "gi");
    sanitized = sanitized.replace(pattern, (match) => "*".repeat(match.length));
  }
  return sanitized;
}

function exceedsChatRateLimit(socketId) {
  const now = Date.now();
  const tracker = chatRateLimits.get(socketId);

  if (!tracker || now >= tracker.resetAt) {
    chatRateLimits.set(socketId, {
      count: 1,
      resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (tracker.count >= CHAT_RATE_LIMIT_COUNT) {
    return true;
  }

  tracker.count += 1;
  return false;
}

function getSpectatorCount(roomId) {
  return spectators.get(roomId)?.size || 0;
}

function emitSpectatorCount(roomId) {
  io.to(roomId).emit("spectatorCount", {
    roomId,
    count: getSpectatorCount(roomId),
  });
}

function cleanupSpectator(socketId, leaveSocketRoom = false) {
  const roomId = spectatorRooms.get(socketId);
  if (!roomId) return;

  const roomSpectators = spectators.get(roomId);
  if (roomSpectators) {
    roomSpectators.delete(socketId);
    if (roomSpectators.size === 0) {
      spectators.delete(roomId);
    }
  }

  if (leaveSocketRoom) {
    const socketInstance = io.sockets.sockets.get(socketId);
    if (socketInstance) {
      socketInstance.leave(roomId);
    }
  }

  spectatorRooms.delete(socketId);
  emitSpectatorCount(roomId);
}

async function createMatchRoom(playerA, playerB) {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const [whitePlayer, blackPlayer] =
    Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];

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

  const game = new Game({
    whitePlayer: whitePlayer.userId,
    blackPlayer: blackPlayer.userId,
    roomId,
  });
  await game.save();

  rooms.set(roomId, { ...gameState, gameId: game._id });

  players.set(whiteSocket.id, {
    roomId,
    color: "w",
    playerName: whitePlayer.playerName,
    userId: whitePlayer.userId,
  });
  players.set(blackSocket.id, {
    roomId,
    color: "b",
    playerName: blackPlayer.playerName,
    userId: blackPlayer.userId,
  });

  whiteSocket.join(roomId);
  blackSocket.join(roomId);

  whiteSocket.emit("matchFound", {
    roomId,
    gameState,
    color: "w",
    chatHistory: gameState.chatHistory,
  });
  blackSocket.emit("matchFound", {
    roomId,
    gameState,
    color: "b",
    chatHistory: gameState.chatHistory,
  });

  io.to(roomId).emit("playerJoined", {
    gameState,
    newPlayer: { color: "b", name: blackPlayer.playerName },
  });

  return roomId;
}

async function awardAbandonmentWin(roomId, abandonedColor) {
  const roomData = rooms.get(roomId);
  if (!roomData) return;
  if (!isPlayableStatus(roomData.status)) return;

  const winnerColor = opponent(abandonedColor);
  const winnerSlot = roomData.players[winnerColor];
  const loserSlot = roomData.players[abandonedColor];
  const loserId = loserSlot?.userId || null;

  roomData.status = "abandoned";
  roomData.turn = abandonedColor;
  loserSlot.id = null;
  loserSlot.userId = null;
  loserSlot.disconnected = false;

  try {
    await Game.findByIdAndUpdate(roomData.gameId, {
      result: winnerColor === "w" ? "white" : "black",
      winner: winnerSlot?.userId || null,
      endTime: new Date(),
    });

    if (winnerSlot?.userId) {
      await updatePlayerStats(winnerSlot.userId, loserId);
    }
  } catch (error) {
    console.error("Abandonment update error:", error);
  }

  io.to(roomId).emit("playerAbandoned", {
    color: abandonedColor,
    winnerColor,
    gameState: roomData,
  });
}
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  const onSafe = (eventName, handler) => {
    socket.on(eventName, (...args) => {
      Promise.resolve(handler(...args)).catch((error) => {
        console.error(`${eventName} handler error:`, error);
        socket.emit("serverError", { message: "An unexpected server error occurred" });
      });
    });
  };

  onSafe("joinQueue", async (data = {}) => {
    try {
      removeFromQueue(socket.id);
      cleanupSpectator(socket.id, true);

      const rating = socket.user.rating || 1200;
      const queueEntry = {
        socketId: socket.id,
        userId: socket.user._id,
        playerName: data.playerName || socket.user.username,
        rating,
        ratingRange: data.ratingRange || getRatingRange(rating),
      };

      const opponentEntry = findQueuedOpponent(queueEntry);
      if (!opponentEntry) {
        matchmakingQueue.push(queueEntry);
        socket.emit("queueJoined", { queueSize: matchmakingQueue.length });
        broadcastQueueUpdate();
        return;
      }

      removeFromQueue(opponentEntry.socketId);
      const roomId = await createMatchRoom(queueEntry, opponentEntry);
      if (!roomId) {
        matchmakingQueue.push(queueEntry);
        socket.emit("queueJoined", { queueSize: matchmakingQueue.length });
      }
      broadcastQueueUpdate();
    } catch (error) {
      console.error("Join queue error:", error);
      socket.emit("serverError", { message: "Failed to join matchmaking" });
    }
  });

  onSafe("leaveQueue", () => {
    removeFromQueue(socket.id);
    socket.emit("queueLeft", { queueSize: matchmakingQueue.length });
  });

  // Create a new room
  onSafe("createRoom", async (data) => {
    try {
      removeFromQueue(socket.id);
      cleanupSpectator(socket.id, true);
      const { playerName } = data;
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

      const gameState = createInitialGameState();
      gameState.players.w.id = socket.id;
      gameState.players.w.name = playerName;
      gameState.players.w.userId = socket.user._id;
      gameState.players.w.disconnected = false;

      // Create game document
      const game = new Game({
        whitePlayer: socket.user._id,
        roomId,
      });
      await game.save();

      rooms.set(roomId, { ...gameState, gameId: game._id });
      players.set(socket.id, {
        roomId,
        color: "w",
        playerName,
        userId: socket.user._id,
      });

      socket.join(roomId);
      socket.emit("roomCreated", {
        roomId,
        gameState,
        chatHistory: gameState.chatHistory,
      });
      console.log(`Room ${roomId} created by ${playerName}`);
    } catch (error) {
      console.error("Create room error:", error);
      socket.emit("serverError", { message: "Failed to create room" });
    }
  });

  // Join an existing room
  onSafe("joinRoom", async (data) => {
    try {
      removeFromQueue(socket.id);
      cleanupSpectator(socket.id, true);
      const { roomId, playerName } = data;

      const roomData = rooms.get(roomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const gameState = roomData;

      // Check if room is full
      if (gameState.players.w.userId && gameState.players.b.userId) {
        socket.emit("serverError", { message: "Room is full" });
        return;
      }

      // Assign color (prefer black if white is taken)
      let color = "b";
      if (!gameState.players.w.userId) {
        color = "w";
      }

      gameState.players[color].id = socket.id;
      gameState.players[color].name = playerName;
      gameState.players[color].userId = socket.user._id;
      gameState.players[color].disconnected = false;
      clearReconnectTimer(roomId, color);

      // Update game document
      await Game.findByIdAndUpdate(roomData.gameId, {
        blackPlayer: socket.user._id,
      });

      players.set(socket.id, {
        roomId,
        color,
        playerName,
        userId: socket.user._id,
      });
      socket.join(roomId);

      // Notify the joining player directly with room info and assigned color
      socket.emit("joinedRoom", {
        roomId,
        gameState,
        color,
        chatHistory: gameState.chatHistory,
      });

      // Notify both players that someone joined
      io.to(roomId).emit("playerJoined", {
        gameState,
        newPlayer: { color, name: playerName },
      });

      console.log(`${playerName} joined room ${roomId} as ${color}`);
    } catch (error) {
      console.error("Join room error:", error);
      socket.emit("serverError", { message: "Failed to join room" });
    }
  });

  onSafe("spectateRoom", (data = {}) => {
    try {
      removeFromQueue(socket.id);
      const { roomId } = data;
      if (!roomId) {
        socket.emit("serverError", { message: "Room ID is required" });
        return;
      }

      if (players.has(socket.id)) {
        socket.emit("serverError", { message: "Players cannot spectate a room" });
        return;
      }

      const roomData = rooms.get(roomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const currentSpectatorRoom = spectatorRooms.get(socket.id);
      if (currentSpectatorRoom && currentSpectatorRoom !== roomId) {
        cleanupSpectator(socket.id, true);
      }

      socket.join(roomId);
      spectatorRooms.set(socket.id, roomId);
      if (!spectators.has(roomId)) {
        spectators.set(roomId, new Set());
      }
      spectators.get(roomId).add(socket.id);

      socket.emit("spectatedRoom", {
        roomId,
        gameState: roomData,
        chatHistory: roomData.chatHistory || [],
        spectatorCount: getSpectatorCount(roomId),
      });
      emitSpectatorCount(roomId);
    } catch (error) {
      console.error("Spectate room error:", error);
      socket.emit("serverError", { message: "Failed to spectate room" });
    }
  });

  onSafe("rejoinRoom", async (data) => {
    try {
      removeFromQueue(socket.id);
      cleanupSpectator(socket.id, true);
      const { roomId, token } = data;
      if (!roomId || !token) {
        socket.emit("serverError", { message: "Room and token are required" });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        socket.emit("serverError", { message: "User not found" });
        return;
      }

      const roomData = rooms.get(roomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const color = ["w", "b"].find(
        (candidate) =>
          String(roomData.players[candidate].userId) === String(user._id),
      );

      if (!color) {
        socket.emit("serverError", { message: "Player is not in this room" });
        return;
      }

      const playerSlot = roomData.players[color];
      if (playerSlot.id && playerSlot.id !== socket.id) {
        players.delete(playerSlot.id);
      }

      playerSlot.id = socket.id;
      playerSlot.name = playerSlot.name || user.username;
      playerSlot.userId = user._id;
      playerSlot.disconnected = false;

      clearReconnectTimer(roomId, color);

      players.set(socket.id, {
        roomId,
        color,
        playerName: playerSlot.name,
        userId: user._id,
      });
      socket.join(roomId);

      socket.emit("rejoinedRoom", {
        roomId,
        gameState: roomData,
        color,
        chatHistory: roomData.chatHistory,
      });

      socket.to(roomId).emit("playerRejoined", {
        gameState: roomData,
        color,
        name: playerSlot.name,
      });
    } catch (error) {
      console.error("Rejoin room error:", error);
      socket.emit("serverError", { message: "Failed to rejoin room" });
    }
  });

  // Handle move
  onSafe("makeMove", async (data) => {
    try {
      const { fromRow, fromCol, toRow, toCol, promotion } = data;
      const player = players.get(socket.id);

      if (!player) {
        socket.emit("serverError", { message: "Not in a room" });
        return;
      }

      const roomData = rooms.get(player.roomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const gameState = roomData;

      if (!isPlayableStatus(gameState.status)) {
        socket.emit("serverError", { message: "Game is over" });
        return;
      }

      // Validate turn
      if (gameState.turn !== player.color) {
        socket.emit("serverError", { message: "Not your turn" });
        return;
      }

      // Validate move
      if (!isValidMove(gameState, fromRow, fromCol, toRow, toCol)) {
        socket.emit("serverError", { message: "Invalid move" });
        return;
      }

      // Apply move with full rule support
      const color = player.color;
      applyMove(gameState, fromRow, fromCol, toRow, toCol, promotion);

      // Record move in database
      const piece = gameState.board[toRow][toCol];
      const kingCaptured = piece === "wK" || piece === "bK";
      let gameUpdate = {
        $push: {
          moves: {
            from: `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`,
            to: `${String.fromCharCode(97 + toCol)}${8 - toRow}`,
            piece: piece,
          },
        },
      };

      if (kingCaptured) {
        const winnerColor = color;
        const loserColor = opponent(color);
        gameState.status = "checkmate";
        gameState.turn = loserColor;

        const winnerId = player.userId;
        const opponentEntry = Array.from(players.values()).find(
          (entry) =>
            entry.roomId === player.roomId && entry.color === loserColor,
        );
        const loserId = opponentEntry?.userId || null;

        gameUpdate = {
          ...gameUpdate,
          result: winnerColor === "w" ? "white" : "black",
          winner: winnerId,
          endTime: new Date(),
        };

        updatePlayerStats(winnerId, loserId);
      } else if (
        gameState.status === "draw-50move" ||
        gameState.status === "draw-repetition"
      ) {
        gameUpdate = {
          ...gameUpdate,
          result: "draw",
          winner: null,
          endTime: new Date(),
        };
      }

      await Game.findByIdAndUpdate(roomData.gameId, gameUpdate);

      // Broadcast move to all players in room
      io.to(player.roomId).emit("moveMade", {
        gameState,
        move: { fromRow, fromCol, toRow, toCol },
      });

      console.log(
        `Move made in room ${player.roomId}: ${fromRow},${fromCol} -> ${toRow},${toCol}`,
      );
    } catch (error) {
      console.error("Make move error:", error);
      socket.emit("serverError", { message: "Failed to make move" });
    }
  });

  onSafe("drawOffer", () => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("serverError", { message: "Not in a room" });
      return;
    }

    socket.to(player.roomId).emit("drawOffer", {
      fromColor: player.color,
      fromName: player.playerName,
    });
  });

  onSafe("drawDeclined", () => {
    const player = players.get(socket.id);
    if (!player) {
      return;
    }
    socket.to(player.roomId).emit("drawDeclined");
  });

  onSafe("drawAccepted", async () => {
    try {
      const player = players.get(socket.id);
      if (!player) {
        socket.emit("serverError", { message: "Not in a room" });
        return;
      }

      const roomData = rooms.get(player.roomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      roomData.status = "draw";
      await Game.findByIdAndUpdate(roomData.gameId, {
        result: "draw",
        winner: null,
        endTime: new Date(),
      });

      try {
        const whiteUserId = roomData.players.w.userId;
        const blackUserId = roomData.players.b.userId;

        if (whiteUserId) {
          await User.findByIdAndUpdate(whiteUserId, {
            $inc: { gamesPlayed: 1, gamesDrawn: 1 },
          });
        }

        if (blackUserId) {
          await User.findByIdAndUpdate(blackUserId, {
            $inc: { gamesPlayed: 1, gamesDrawn: 1 },
          });
        }
      } catch (statsError) {
        console.error("Draw stats update error:", statsError);
      }

      io.to(player.roomId).emit("drawAccepted", {
        gameState: roomData,
      });
    } catch (error) {
      console.error("Accept draw error:", error);
      socket.emit("serverError", { message: "Failed to accept draw" });
    }
  });

  onSafe("resign", async () => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit("serverError", { message: "Not in a room" });
      return;
    }

    const roomData = rooms.get(player.roomId);
    if (!roomData || !isPlayableStatus(roomData.status)) {
      return;
    }

    const winnerColor = opponent(player.color);
    const winnerSlot = roomData.players[winnerColor];
    roomData.status = "resigned";

    try {
      await Game.findByIdAndUpdate(roomData.gameId, {
        result: winnerColor === "w" ? "white" : "black",
        winner: winnerSlot?.userId || null,
        endTime: new Date(),
      });

      if (winnerSlot?.userId) {
        await updatePlayerStats(winnerSlot.userId, player.userId);
      }
    } catch (error) {
      console.error("Resignation update error:", error);
    }

    io.to(player.roomId).emit("playerResigned", {
      color: player.color,
      winnerColor,
      gameState: roomData,
    });
  });

  const cleanupPlayer = async (socket, notify = true) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomData = rooms.get(player.roomId);
    if (roomData) {
      const gameState = roomData;
      clearReconnectTimer(player.roomId, player.color);

      const leavingColor = player.color;
      const opponentColor = opponent(leavingColor);
      const leavingSlot = gameState.players[leavingColor];
      const opponentSlot = gameState.players[opponentColor];
      const leavingUserId = leavingSlot.userId;
      const opponentUserId = opponentSlot?.userId;

      leavingSlot.id = null;
      leavingSlot.disconnected = false;
      leavingSlot.name = leavingColor === "w" ? "Player 1" : "Player 2";

      if (
        opponentUserId &&
        isPlayableStatus(gameState.status)
      ) {
        gameState.status = "abandoned";

        try {
          await Game.findByIdAndUpdate(roomData.gameId, {
            result: opponentColor === "w" ? "white" : "black",
            winner: opponentUserId,
            endTime: new Date(),
          });

          await updatePlayerStats(opponentUserId, leavingUserId);
        } catch (error) {
          console.error("Abandonment save error:", error);
        }

        io.to(player.roomId).emit("playerAbandoned", {
          winnerColor: opponentColor,
          gameState,
        });

        players.delete(socket.id);
        return;
      }

      // If both players are gone, save the game as ended
      if (!gameState.players.w.userId && !gameState.players.b.userId) {
        try {
          const roomSpectators = spectators.get(player.roomId);
          if (roomSpectators) {
            roomSpectators.forEach((spectatorSocketId) => {
              const spectatorSocket = io.sockets.sockets.get(spectatorSocketId);
              spectatorSocket?.leave(player.roomId);
              spectatorRooms.delete(spectatorSocketId);
              spectatorSocket?.emit("roomClosed", {
                roomId: player.roomId,
                message: "Game ended and room was closed",
              });
            });
            spectators.delete(player.roomId);
          }

          await Game.findByIdAndUpdate(roomData.gameId, {
            result: toGameResult(gameState.status),
            endTime: new Date(),
          });
          rooms.delete(player.roomId);
        } catch (error) {
          console.error("Save game error:", error);
        }
      } else if (notify) {
        io.to(player.roomId).emit("playerLeft", {
          color: player.color,
          name: player.playerName,
        });
      }
    }

    players.delete(socket.id);
  };

  const markPlayerDisconnected = (socket) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomData = rooms.get(player.roomId);
    if (!roomData) {
      players.delete(socket.id);
      return;
    }

    const playerSlot = roomData.players[player.color];
    playerSlot.id = null;
    playerSlot.disconnected = true;
    playerSlot.userId = player.userId;
    playerSlot.name = player.playerName;

    players.delete(socket.id);

    io.to(player.roomId).emit("playerDisconnected", {
      color: player.color,
      name: player.playerName,
      reconnectBy: Date.now() + RECONNECTION_GRACE_MS,
      gameState: roomData,
    });

    clearReconnectTimer(player.roomId, player.color);
    const timer = setTimeout(async () => {
      reconnectionTimers.delete(getReconnectKey(player.roomId, player.color));

      const currentRoom = rooms.get(player.roomId);
      const currentSlot = currentRoom?.players[player.color];
      if (!currentRoom || !currentSlot?.disconnected || currentSlot.id) {
        return;
      }

      await awardAbandonmentWin(player.roomId, player.color);
    }, RECONNECTION_GRACE_MS);

    reconnectionTimers.set(getReconnectKey(player.roomId, player.color), timer);
  };

  onSafe("leaveRoom", async () => {
    const player = players.get(socket.id);
    if (player) {
      socket.leave(player.roomId);
      await cleanupPlayer(socket, true);
      socket.emit("leftRoom");
      return;
    }

    if (spectatorRooms.has(socket.id)) {
      cleanupSpectator(socket.id, true);
      socket.emit("leftRoom");
      return;
    }

    socket.emit("leftRoom");
  });

  // Handle disconnect
  onSafe("disconnect", () => {
    removeFromQueue(socket.id);
    markPlayerDisconnected(socket);
    cleanupSpectator(socket.id);
    chatRateLimits.delete(socket.id);
    console.log(`Player disconnected: ${socket.id}`);
  });

  // Room chat messages
  onSafe("sendMessage", (data) => {
    try {
      const player = players.get(socket.id);
      const spectatorRoomId = spectatorRooms.get(socket.id);
      const activeRoomId = player?.roomId || spectatorRoomId;
      if (!activeRoomId) {
        socket.emit("serverError", { message: "Not in a room" });
        return;
      }

      if (exceedsChatRateLimit(socket.id)) {
        socket.emit("serverError", {
          message: "Rate limit exceeded: max 5 messages per 5 seconds",
        });
        return;
      }

      const roomData = rooms.get(activeRoomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const rawText = String(data.text || "");
      if (rawText.length > CHAT_MAX_LENGTH) {
        socket.emit("serverError", {
          message: `Message too long (max ${CHAT_MAX_LENGTH} characters)`,
        });
        return;
      }

      const sanitizedText = censorBlockedWords(stripHtmlTags(rawText)).trim();
      const chatMessage = {
        userId: socket.user._id,
        username: socket.user.username,
        text: sanitizedText,
        timestamp: new Date().toISOString(),
      };

      if (!chatMessage.text) return;

      roomData.chatHistory = roomData.chatHistory || [];
      roomData.chatHistory.push(chatMessage);
      if (roomData.chatHistory.length > 50) {
        roomData.chatHistory.shift();
      }

      io.to(activeRoomId).emit("chatMessage", chatMessage);
    } catch (error) {
      console.error("Chat message error:", error);
      socket.emit("serverError", { message: "Failed to send message" });
    }
  });

  // Get room list (for debugging)
  onSafe("getRooms", () => {
    const roomList = Array.from(rooms.entries()).map(([id, state]) => ({
      id,
      players: {
        w: state.players.w.name,
        b: state.players.b.name,
      },
      spectatorCount: getSpectatorCount(id),
      isFull: Boolean(state.players.w.userId && state.players.b.userId),
      status: state.status,
    }));
    socket.emit("roomsList", roomList);
  });
});

const PORT = process.env.PORT || 3001;

// Global Express error handler
app.use((err, req, res, next) => {
  console.error("Unhandled express error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ message: "Internal server error" });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing server or change PORT.`);
    return;
  }
  console.error("HTTP server error:", error);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Chess server running on port ${PORT}`);
  console.log(`Local network access: http://0.0.0.0:${PORT}`);
});
