require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { isValidMove: validateMove, applyMove } = require("./chessUtils");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const User = require("./models/User");
const Game = require("./models/Game");

const app = express();
const server = http.createServer(app);

// Configure CORS for the frontend
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost and local network IPs
      const allowedOrigins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        /^http:\/\/192\.168\.\d+\.\d+:5173$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
        /^http:\/\/172\.\d+\.\d+\.\d+:5173$/,
      ];

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
    methods: ["GET", "POST"],
  },
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

app.use(cors());
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
      socket.emit("roomCreated", { roomId, gameState });
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
      const { fromRow, fromCol, toRow, toCol } = data;
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
      applyMove(gameState, fromRow, fromCol, toRow, toCol);

      // Record move in database
      const piece = gameState.board[toRow][toCol];
      await Game.findByIdAndUpdate(roomData.gameId, {
        $push: {
          moves: {
            from: `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`,
            to: `${String.fromCharCode(97 + toCol)}${8 - toRow}`,
            piece: piece,
          },
        },
      });

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
