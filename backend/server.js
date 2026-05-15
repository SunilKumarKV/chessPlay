require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const weakJwtSecrets = new Set([
  "your-placeholder-secret-key",
  "your-super-secret-jwt-key-change-this-in-production",
  "dev-jwt-secret-not-for-production",
]);

function fatalConfigError(message) {
  console.error(`FATAL CONFIG ERROR: ${message}`);
  process.exit(1);
}

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!accessSecret || !refreshSecret) {
  fatalConfigError("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required. JWT_SECRET is accepted only for local backward compatibility.");
}

if (accessSecret.length < 32 || refreshSecret.length < 32) {
  fatalConfigError("JWT_SECRET must be at least 32 characters long.");
}

if (weakJwtSecrets.has(accessSecret) || weakJwtSecrets.has(refreshSecret)) {
  fatalConfigError("JWT secrets are using known weak/default values.");
}

if (isProduction && accessSecret === refreshSecret) {
  fatalConfigError("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production.");
}

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./utils/security");
const {
  isValidMove: validateMove,
  applyMove,
  opponent,
} = require("./chessUtils");
const {
  createInitialGameState,
  isPlayableStatus,
  toGameResult,
} = require("./gameState");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const billingRoutes = require("./routes/billing");
const socialRoutes = require("./routes/social");
const automationRoutes = require("./routes/automation");
const adminRoutes = require("./routes/admin");
const puzzleRoutes = require("./routes/puzzles");
const analysisRoutes = require("./routes/analysis");
const referralRoutes = require("./routes/referrals");
const tournamentRoutes = require("./routes/tournaments");
const User = require("./models/User");
const Game = require("./models/Game");
const { updatePlayerStats } = require("./utils/elo");

const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

function parseCsvEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return cookies;
      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
}

// Configure CORS for the frontend
const configuredOrigins = Array.from(new Set([
  ...parseCsvEnv(process.env.FRONTEND_ORIGINS),
  ...parseCsvEnv(process.env.FRONTEND_URL),
  "https://getchessplay.com",
  "https://www.getchessplay.com",
  "https://getchessplay.vercel.app",
].filter(Boolean)));

if (isProduction && configuredOrigins.length === 0) {
  fatalConfigError("FRONTEND_ORIGINS or FRONTEND_URL must be configured in production.");
}

const developmentOrigins = isProduction
  ? []
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,
      /^http:\/\/192\.168\.\d+\.\d+:5174$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:5174$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:5173$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:5174$/,
    ];

const allowedOrigins = [...configuredOrigins, ...developmentOrigins];

function isAllowedOrigin(origin) {
  return allowedOrigins.some((pattern) => {
    if (typeof pattern === "string") return pattern === origin;
    return pattern.test(origin);
  });
}

function corsOriginForRequest(req, origin, callback) {
  if (!origin) {
    return callback(null, !isProduction || req.path === "/health" || req.path === "/healthz");
  }

  if (isAllowedOrigin(origin)) {
    return callback(null, true);
  }

  console.warn("Blocked by CORS:", origin);
  return callback(null, false);
}

function createCorsOptions(req) {
  return {
    origin(origin, callback) {
      corsOriginForRequest(req, origin, callback);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  };
}

function enforceProductionOrigin(req, res, next) {
  if (!isProduction) return next();

  const origin = req.headers.origin;
  if (!origin) {
    if (req.path === "/health" || req.path === "/healthz") return next();
    return res.status(403).json({ message: "Origin is required" });
  }

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ message: "Origin is not allowed" });
  }

  next();
}

const socketCorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, !isProduction);
    }
    return callback(null, isAllowedOrigin(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
  cors: socketCorsOptions,
  maxHttpBufferSize: 20_000,
  transports: ["websocket", "polling"],
  pingInterval: 25_000,
  pingTimeout: 20_000,
  allowEIO3: false,
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
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const token = socket.handshake.auth?.accessToken || cookies.accessToken || cookies.authToken;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, getJwtSecret("access"));
    if (decoded.type && decoded.type !== "access") {
      return next(new Error("Invalid token type"));
    }
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (error) {
    const message = error?.name === "TokenExpiredError" ? "Invalid token: expired" : "Invalid token";
    next(new Error(message));
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

const SOCKET_EVENT_LIMITS = {
  makeMove: { count: 12, windowMs: 5000 },
  joinRoom: { count: 8, windowMs: 60_000 },
  createRoom: { count: 6, windowMs: 60_000 },
  joinQueue: { count: 12, windowMs: 60_000 },
  sendMessage: { count: 5, windowMs: 5000 },
  default: { count: 40, windowMs: 10_000 },
};
const socketEventRateLimits = new Map();

function exceedsSocketEventRateLimit(socketId, eventName) {
  const now = Date.now();
  const rule = SOCKET_EVENT_LIMITS[eventName] || SOCKET_EVENT_LIMITS.default;
  const key = `${socketId}:${eventName}`;
  const current = socketEventRateLimits.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + rule.windowMs };
  bucket.count += 1;
  socketEventRateLimits.set(key, bucket);
  return bucket.count > rule.count;
}

function isSafeSocketPayload(args) {
  try {
    return Buffer.byteLength(JSON.stringify(args), "utf8") <= 20_000;
  } catch {
    return false;
  }
}

app.use((req, res, next) => cors(createCorsOptions(req))(req, res, next));
app.use(enforceProductionOrigin);
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
}));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [...cspConnectSources, "https://accounts.google.com", "https://oauth2.googleapis.com"],
        scriptSrc: ["'self'", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "data:"],
        workerSrc: ["'self'", "blob:"],
      },
    },
  }),
);
app.use(express.json({ limit: "20kb" }));
app.use(mongoSanitize());
app.use(hpp());
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
app.use("/api/billing", billingRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/puzzles", puzzleRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/tournaments", tournamentRoutes);

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

// Public platform health check for hosts that cannot attach secret headers.
app.get("/healthz", (req, res) => {
  res.json({
    status: "ok",
    service: "chessplay-backend",
  });
});

function isValidMove(gameState, fromRow, fromCol, toRow, toCol) {
  return validateMove(gameState, fromRow, fromCol, toRow, toCol);
}

async function updateDrawStats(whiteUserId, blackUserId) {
  const updates = [];
  if (whiteUserId) {
    updates.push(
      User.findByIdAndUpdate(whiteUserId, {
        $inc: { gamesPlayed: 1, gamesDrawn: 1 },
      }),
    );
  }
  if (blackUserId) {
    updates.push(
      User.findByIdAndUpdate(blackUserId, {
        $inc: { gamesPlayed: 1, gamesDrawn: 1 },
      }),
    );
  }
  await Promise.all(updates);
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
  return matchmakingQueue.find((candidate) => {
    if (candidate.socketId === entry.socketId) return false;
    const sameMode = !entry.mode || !candidate.mode || entry.mode === "casual" || candidate.mode === "casual" || entry.mode === candidate.mode;
    const sameTime = typeof entry.timeControlIndex !== "number" || typeof candidate.timeControlIndex !== "number" || entry.timeControlIndex === candidate.timeControlIndex;
    const ratingWindow = entry.mode === "advanced" || candidate.mode === "advanced" ? 350 : entry.mode === "beginner" || candidate.mode === "beginner" ? 300 : 200;
    return sameMode && sameTime && Math.abs(candidate.rating - entry.rating) <= ratingWindow;
  });
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

  gameState.matchmaking = {
    mode: whitePlayer.mode || blackPlayer.mode || "casual",
    timeControlIndex: Number.isInteger(whitePlayer.timeControlIndex) ? whitePlayer.timeControlIndex : blackPlayer.timeControlIndex,
  };

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

  socket.join(`user:${socket.user._id}`);
  socket.broadcast.emit("socialUserStatus", { userId: socket.user._id, status: "online" });


  const onSafe = (eventName, handler) => {
    socket.on(eventName, (...args) => {
      if (!isSafeSocketPayload(args)) {
        socket.emit("serverError", { message: "Payload too large" });
        return;
      }
      if (exceedsSocketEventRateLimit(socket.id, eventName)) {
        socket.emit("serverError", { message: "Too many socket events. Please slow down." });
        return;
      }
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
        mode: ["casual", "ranked", "blitz", "rapid", "beginner", "intermediate", "advanced"].includes(data.mode) ? data.mode : "casual",
        timeControlIndex: Number.isInteger(data.timeControlIndex) ? data.timeControlIndex : null,
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
      const normalizedRoomId = String(roomId || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(normalizedRoomId)) {
        socket.emit("serverError", { message: "Invalid room code" });
        return;
      }

      const roomData = rooms.get(normalizedRoomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const gameState = roomData;
      if (["w", "b"].some((c) => String(gameState.players[c].userId) === String(socket.user._id))) {
        socket.emit("serverError", { message: "You are already in this room" });
        return;
      }

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
      clearReconnectTimer(normalizedRoomId, color);

      // Update game document
      await Game.findByIdAndUpdate(roomData.gameId, {
        blackPlayer: socket.user._id,
      });

      players.set(socket.id, {
        roomId: normalizedRoomId,
        color,
        playerName,
        userId: socket.user._id,
      });
      socket.join(normalizedRoomId);

      // Notify the joining player directly with room info and assigned color
      socket.emit("joinedRoom", {
        roomId: normalizedRoomId,
        gameState,
        color,
        chatHistory: gameState.chatHistory,
      });

      // Notify both players that someone joined
      io.to(normalizedRoomId).emit("playerJoined", {
        gameState,
        newPlayer: { color, name: playerName },
      });

      console.log(`${playerName} joined room ${normalizedRoomId} as ${color}`);
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
      const { roomId } = data;
      if (!roomId) {
        socket.emit("serverError", { message: "Room is required" });
        return;
      }

      const user = socket.user;
      if (!user?._id) {
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
      let gameUpdate = {
        $push: {
          moves: {
            from: `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`,
            to: `${String.fromCharCode(97 + toCol)}${8 - toRow}`,
            piece: piece,
          },
        },
      };

      if (gameState.status === "checkmate") {
        const winnerColor = color;
        const loserColor = gameState.turn;
        const winnerId = player.userId;
        const loserId = gameState.players[loserColor]?.userId || null;

        gameUpdate = {
          ...gameUpdate,
          result: winnerColor === "w" ? "white" : "black",
          winner: winnerId,
          endTime: new Date(),
        };

        await updatePlayerStats(winnerId, loserId);
      } else if (
        gameState.status === "stalemate" ||
        gameState.status === "draw-50move" ||
        gameState.status === "draw-repetition"
      ) {
        gameUpdate = {
          ...gameUpdate,
          result: "draw",
          winner: null,
          endTime: new Date(),
        };
        try {
          await updateDrawStats(gameState.players.w.userId, gameState.players.b.userId);
        } catch (statsError) {
          console.error("Draw stats update error:", statsError);
        }
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
        await updateDrawStats(roomData.players.w.userId, roomData.players.b.userId);
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
    for (const key of socketEventRateLimits.keys()) {
      if (key.startsWith(`${socket.id}:`)) socketEventRateLimits.delete(key);
    }
    socket.broadcast.emit("socialUserStatus", { userId: socket.user._id, status: "offline" });
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


  onSafe("socialTyping", (data = {}) => {
    const conversationId = String(data.conversationId || "");
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit("socialTyping", {
      conversationId,
      userId: socket.user._id,
      username: socket.user.username,
      isTyping: Boolean(data.isTyping),
    });
  });

  onSafe("joinConversation", (data = {}) => {
    const conversationId = String(data.conversationId || "").trim();
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
  });

  onSafe("leaveConversation", (data = {}) => {
    const conversationId = String(data.conversationId || "").trim();
    if (!conversationId) return;
    socket.leave(`conversation:${conversationId}`);
  });

  onSafe("socialMessage", async (data = {}) => {
    try {
      const Conversation = require("./models/Conversation");
      const conversationId = String(data.conversationId || "").trim();
      const text = stripHtmlTags(String(data.text || "")).trim().slice(0, 1000);
      if (!conversationId || !text) return;
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("serverError", { message: "Conversation not found" });
        return;
      }
      const isAllowed = conversation.type === "public" || conversation.participants.some((id) => String(id) === String(socket.user._id));
      if (!isAllowed) {
        socket.emit("serverError", { message: "Not allowed" });
        return;
      }
      const message = { sender: socket.user._id, senderName: socket.user.username, text, readBy: [socket.user._id] };
      conversation.messages.push(message);
      if (conversation.messages.length > 300) conversation.messages = conversation.messages.slice(-300);
      conversation.lastMessageAt = new Date();
      await conversation.save();
      const savedMessage = conversation.messages[conversation.messages.length - 1];
      io.to(`conversation:${conversationId}`).emit("socialMessage", { conversationId, message: savedMessage });
    } catch (error) {
      console.error("Social message error:", error);
      socket.emit("serverError", { message: "Failed to send message" });
    }
  });

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
