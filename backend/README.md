# ChessPlay Backend

Real-time multiplayer chess game backend using Node.js and Socket.IO.

## Features

- **Room Management**: Create and join game rooms
- **Real-time Communication**: Instant move synchronization between players
- **Game State Management**: Maintains chess board state and game rules
- **Player Management**: Handle player connections and disconnections

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API

### Socket Events

#### Client → Server

- `createRoom` - Create a new game room
  - Data: `{ playerName: string }`
  - Response: `{ roomId: string, gameState: object }`

- `joinRoom` - Join an existing room
  - Data: `{ roomId: string, playerName: string }`
  - Response: `{ gameState: object, newPlayer: object }`

- `makeMove` - Make a chess move
  - Data: `{ fromRow: number, fromCol: number, toRow: number, toCol: number }`
  - Response: `{ gameState: object, move: object }`

- `getRooms` - Get list of active rooms (debug)
  - Response: `Array<{ id: string, players: object, status: string }>`

#### Server → Client

- `roomCreated` - Room successfully created
- `playerJoined` - A player joined the room
- `moveMade` - A move was made
- `playerLeft` - A player left the room
- `error` - An error occurred

### HTTP Endpoints

- `GET /health` - Health check endpoint
  - Returns: `{ status: 'ok', rooms: number, players: number }`

## Game State Structure

```javascript
{
  board: Array[8][8], // Chess board with piece notation (e.g., 'wP', 'bK')
  turn: 'w' | 'b',    // Current player's turn
  enPassant: null | [number, number],
  castling: {
    w: { kingSide: boolean, queenSide: boolean },
    b: { kingSide: boolean, queenSide: boolean }
  },
  status: 'playing' | 'check' | 'checkmate' | 'stalemate',
  moveHistory: Array,
  players: {
    w: { id: string | null, name: string },
    b: { id: string | null, name: string }
  }
}
```

## Running with Frontend

To run both frontend and backend together:

1. Start the backend:

```bash
cd backend
npm run dev
```

2. In another terminal, start the frontend:

```bash
npm run dev
```

The frontend will connect to the backend automatically.
