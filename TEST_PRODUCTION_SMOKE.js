const fs = require("fs");
const assert = require("assert");
const chessUtils = require("./backend/chessUtils");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function initialGameState() {
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
    turn: "w",
    enPassant: null,
    castling: {
      w: { kingSide: true, queenSide: true },
      b: { kingSide: true, queenSide: true },
    },
    status: "playing",
    halfmoveClock: 0,
    positionHistory: [],
    moveHistory: [],
    capturedW: [],
    capturedB: [],
  };
  gameState.positionHistory = [chessUtils.getPositionKey(gameState)];
  return gameState;
}

function move(gameState, from, to) {
  return chessUtils.applyMove(
    gameState,
    8 - Number(from[1]),
    from.charCodeAt(0) - 97,
    8 - Number(to[1]),
    to.charCodeAt(0) - 97,
  );
}

function assertSourceChecks() {
  const auth = read("backend/routes/auth.js");
  assert(
    /const PUBLIC_USER_FIELDS = "username avatar country title rating gamesPlayed gamesWon privacy friends"/.test(auth),
    "Public user fields must not expose email",
  );
  assert(!/PUBLIC_USER_FIELDS = "[^"]*email/.test(auth), "PUBLIC_USER_FIELDS exposes email");
  assert(/targetUser\.privacy\?\.friendRequests === false/.test(auth), "Friend request privacy is not enforced");
  assert(/profileVisibility === false/.test(auth), "Profile visibility privacy is not enforced");
  assert(/res\.cookie\("authToken"/.test(auth), "Auth routes must set HttpOnly cookie");
  assert(!/token,\s*\n\s*user:/.test(auth), "Auth responses should not expose JWT tokens");

  const authMiddleware = read("backend/middleware/auth.js");
  assert(/getCookie\(req, "authToken"\)/.test(authMiddleware), "Auth middleware must read authToken cookie");
  assert(!/Authorization|Bearer/.test(authMiddleware), "Auth middleware should not accept browser bearer tokens");

  const server = read("backend/server.js");
  assert(/JWT_SECRET must be at least 32 characters/.test(server), "JWT secret length check is missing");
  assert(/FRONTEND_ORIGINS/.test(server), "CORS must use configured frontend origins");
  assert(/enforceProductionOrigin/.test(server), "Production origin enforcement is missing");

  const games = read("backend/routes/games.js");
  assert(/const targetUserId = req\.query\.userId/.test(games), "Game history cannot target viewed profile");
  assert(/privacy\?\.gameHistory === false/.test(games), "Game history privacy is not enforced");

  const settings = read("frontend/src/hooks/useSettings.js");
  assert(!/setTimeControl/.test(settings), "Settings save should not dispatch setTimeControl");
  assert(/privacy: settings\.privacy/.test(settings), "Privacy settings are not sent to backend");

  const board = read("frontend/src/features/chess/components/Board.jsx");
  assert(/!settings\.autoQueen/.test(board), "Promotion flow does not respect autoQueen");
  assert(/setPromotionPending\(\{ from, to, color: move\.color \}\);\s*return;/.test(board), "Promotion modal must open before dispatching a queen");

  const apiClient = read("frontend/src/services/apiClient.js");
  assert(/credentials: "include"/.test(apiClient), "API client must send auth cookies");
  assert(!/Authorization|Bearer/.test(apiClient), "API client should not send localStorage bearer tokens");
}

function assertChessStatus() {
  let gameState = initialGameState();
  gameState = move(gameState, "f2", "f3");
  gameState = move(gameState, "e7", "e5");
  gameState = move(gameState, "g2", "g4");
  gameState = move(gameState, "d8", "h4");
  assert.strictEqual(gameState.status, "checkmate", "Fool's Mate should be checkmate");
}

assertSourceChecks();
assertChessStatus();
console.log("Production smoke checks passed");
