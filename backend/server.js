const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { isValidMove: validateMove } = require("./chessUtils");

const app = express();
const server = http.createServer(app);

// Configure CORS for the frontend
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"],
  },
});

// Game rooms storage
const rooms = new Map();
const players = new Map(); // socket.id -> { roomId, color, playerName }

app.use(cors());
app.use(express.json());

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", rooms: rooms.size, players: players.size });
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
    players: {
      w: { id: null, name: "Player 1" },
      b: { id: null, name: "Player 2" },
    },
  };
}

// Simple move validation (basic implementation)
function isValidMove(gameState, fromRow, fromCol, toRow, toCol) {
  return validateMove(gameState, fromRow, fromCol, toRow, toCol);
}

// Apply a move to the game state
function applyMove(gameState, fromRow, fromCol, toRow, toCol) {
  const piece = gameState.board[fromRow][fromCol];
  gameState.board[fromRow][fromCol] = null;
  gameState.board[toRow][toCol] = piece;

  // Switch turns
  gameState.turn = gameState.turn === "w" ? "b" : "w";

  // Add to move history
  gameState.moveHistory.push({
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece: piece,
    timestamp: Date.now(),
  });

  return gameState;
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new room
  socket.on("createRoom", (data) => {
    const { playerName } = data;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const gameState = createInitialGameState();
    gameState.players.w.id = socket.id;
    gameState.players.w.name = playerName;

    rooms.set(roomId, gameState);
    players.set(socket.id, { roomId, color: "w", playerName });

    socket.join(roomId);
    socket.emit("roomCreated", { roomId, gameState });
    console.log(`Room ${roomId} created by ${playerName}`);
  });

  // Join an existing room
  socket.on("joinRoom", (data) => {
    const { roomId, playerName } = data;

    const gameState = rooms.get(roomId);
    if (!gameState) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Check if room is full
    if (gameState.players.w.id && gameState.players.b.id) {
      socket.emit("error", { message: "Room is full" });
      return;
    }

    // Assign color (prefer black if white is taken)
    let color = "b";
    if (!gameState.players.w.id) {
      color = "w";
    }

    gameState.players[color].id = socket.id;
    gameState.players[color].name = playerName;

    players.set(socket.id, { roomId, color, playerName });
    socket.join(roomId);

    // Notify both players
    io.to(roomId).emit("playerJoined", {
      gameState,
      newPlayer: { color, name: playerName },
    });

    console.log(`${playerName} joined room ${roomId} as ${color}`);
  });

  // Handle move
  socket.on("makeMove", (data) => {
    const { fromRow, fromCol, toRow, toCol } = data;
    const player = players.get(socket.id);

    if (!player) {
      socket.emit("error", { message: "Not in a room" });
      return;
    }

    const gameState = rooms.get(player.roomId);
    if (!gameState) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Validate turn
    if (gameState.turn !== player.color) {
      socket.emit("error", { message: "Not your turn" });
      return;
    }

    // Validate move
    if (!isValidMove(gameState, fromRow, fromCol, toRow, toCol)) {
      socket.emit("error", { message: "Invalid move" });
      return;
    }

    // Apply move
    applyMove(gameState, fromRow, fromCol, toRow, toCol);

    // Broadcast move to all players in room
    io.to(player.roomId).emit("moveMade", {
      gameState,
      move: { fromRow, fromCol, toRow, toCol },
    });

    console.log(
      `Move made in room ${player.roomId}: ${fromRow},${fromCol} -> ${toRow},${toCol}`,
    );
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const player = players.get(socket.id);
    if (player) {
      const gameState = rooms.get(player.roomId);
      if (gameState) {
        // Remove player from room
        gameState.players[player.color].id = null;

        // If room is empty, delete it
        if (!gameState.players.w.id && !gameState.players.b.id) {
          rooms.delete(player.roomId);
        } else {
          // Notify remaining player
          io.to(player.roomId).emit("playerLeft", {
            color: player.color,
            name: player.playerName,
          });
        }
      }
      players.delete(socket.id);
    }
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
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});
