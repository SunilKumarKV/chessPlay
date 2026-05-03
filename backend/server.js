require("dotenv").config();

// Validate environment variables
const DEFAULT_JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not set or is using the default value.");
  console.error("Please set a secure JWT_SECRET in your environment variables.");
  process.exit(1);
}

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { isValidMove: validateMove, applyMove, opponent } = require("./chessUtils");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const User = require("./models/User");
const Game = require("./models/Game");

const app = express();
const server = http.createServer(app);

// Configure CORS for the frontend
const allowedOrigins = [
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

// Add production frontend URL if provided
if (process.env.VITE_FRONTEND_URL) {
  allowedOrigins.push(process.env.VITE_FRONTEND_URL);
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
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

const io = socketIo(server, {
  cors: corsOptions,
});

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

app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);

// Basic health check
app.get("/health", (req, res) => {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  let localIP = "localhost";
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== "localhost") break;
  }
  res.json({
    status: "ok",
    rooms: rooms.size,
    players: players.size,
    localIP,
    port: PORT,
  });
});

// Initialize a new game state
function createInitialGameState() {
  return {
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
    moveHistory: [],
    capturedW: [],
    capturedB: [],
    chatHistory: [],
    players: {
      w: { id: null, name: "Player 1" },
      b: { id: null, name: "Player 2" },
    },
  };
}

// Simple move validation wrapper
function isValidMove(gameState, fromRow, fromCol, toRow, toCol) {
  return validateMove(gameState, fromRow, fromCol, toRow, toCol);
}
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function computeRating(oldRating, expected, score, k = 32) {
  return Math.round(oldRating + k * (score - expected));
}

async function updatePlayerStats(winnerId, loserId) {
  try {
    const winner = await User.findById(winnerId);
    if (!winner) return;

    winner.gamesPlayed += 1;
    winner.gamesWon += 1;

    if (loserId) {
      const loser = await User.findById(loserId);
      if (loser) {
        loser.gamesPlayed += 1;

        const expectedWinner = expectedScore(winner.rating, loser.rating);
        const expectedLoser = expectedScore(loser.rating, winner.rating);

        winner.rating = computeRating(winner.rating, expectedWinner, 1);
        loser.rating = computeRating(loser.rating, expectedLoser, 0);

        await loser.save();
      }
    }

    await winner.save();
  } catch (error) {
    console.error("User rating update error:", error);
  }
}
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new room
  socket.on("createRoom", async (data) => {
    try {
      const { playerName } = data;
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

      const gameState = createInitialGameState();
      gameState.players.w.id = socket.id;
      gameState.players.w.name = playerName;

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
  socket.on("joinRoom", async (data) => {
    try {
      const { roomId, playerName } = data;

      const roomData = rooms.get(roomId);
      if (!roomData) {
        socket.emit("serverError", { message: "Room not found" });
        return;
      }

      const gameState = roomData;

      // Check if room is full
      if (gameState.players.w.id && gameState.players.b.id) {
        socket.emit("serverError", { message: "Room is full" });
        return;
      }

      // Assign color (prefer black if white is taken)
      let color = "b";
      if (!gameState.players.w.id) {
        color = "w";
      }

      gameState.players[color].id = socket.id;
      gameState.players[color].name = playerName;

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

  // Handle move
  socket.on("makeMove", async (data) => {
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

  const cleanupPlayer = async (socket, notify = true) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomData = rooms.get(player.roomId);
    if (roomData) {
      const gameState = roomData;
      gameState.players[player.color].id = null;
      gameState.players[player.color].name =
        player.color === "w" ? "Player 1" : "Player 2";

      // If both players are gone, save the game as ended
      if (!gameState.players.w.id && !gameState.players.b.id) {
        try {
          await Game.findByIdAndUpdate(roomData.gameId, {
            result:
              gameState.status === "playing" ? "ongoing" : gameState.status,
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

  socket.on("leaveRoom", () => {
    const player = players.get(socket.id);
    if (!player) return;

    socket.leave(player.roomId);
    cleanupPlayer(socket, true);
    socket.emit("leftRoom");
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    cleanupPlayer(socket, true);
    console.log(`Player disconnected: ${socket.id}`);
  });

  // Room chat messages
  socket.on("sendMessage", (data) => {
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

      const chatMessage = {
        userId: socket.user._id,
        username: socket.user.username,
        text: String(data.text || "").trim(),
        timestamp: new Date().toISOString(),
      };

      if (!chatMessage.text) return;

      roomData.chatHistory = roomData.chatHistory || [];
      roomData.chatHistory.push(chatMessage);
      if (roomData.chatHistory.length > 50) {
        roomData.chatHistory.shift();
      }

      io.to(player.roomId).emit("chatMessage", chatMessage);
    } catch (error) {
      console.error("Chat message error:", error);
      socket.emit("serverError", { message: "Failed to send message" });
    }
  });

  // Get room list (for debugging)
  socket.on("getRooms", () => {
    const roomList = Array.from(rooms.entries()).map(([id, state]) => ({
      id,
      players: {
        w: state.players.w.name,
        b: state.players.b.name,
      },
      status: state.status,
    }));
    socket.emit("roomsList", roomList);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Chess server running on port ${PORT}`);
  console.log(`Local network access: http://0.0.0.0:${PORT}`);
});
