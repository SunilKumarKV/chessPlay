# Real-Time WebSocket Sockets & Events

## Purpose
This document describes the design, event schemas, room lifecycle, and connection protocols for WebSockets inside ChessPlay.

## Navigation
[README](../README.md) • [architecture.md](architecture.md) • [frontend.md](frontend.md) • [api.md](api.md)

---

## Socket Connection Lifecycle

All real-time communications in ChessPlay are powered by **Socket.IO**:
1. **Handshake**: The client initiates a WebSocket connection to the server, passing the authorization token inside the `auth` payload parameters.
2. **Authentication**: The server validates the JWT signature. If valid, the connection is accepted; if expired or missing, it rejects the connection.
3. **Room Assignment**: Users are assigned to rooms based on their active match ID (`gameId`) or private lobby lists.

---

## Event Catalog

### 1. Client-to-Server Events (C2S)

#### `joinQueue`
- **Description**: Places the user into the matchmaking queue.
- **Payload**:
  ```json
  {
    "timeControl": "5+3"
  }
  ```

#### `sendMove`
- **Description**: Submits a chess move for verification and routing.
- **Payload**:
  ```json
  {
    "gameId": "cldx7b3pq0000j365o8zpf01a",
    "from": "e2",
    "to": "e4",
    "promotion": "q"
  }
  ```

---

### 2. Server-to-Client Events (S2C)

#### `matchFound`
- **Description**: Fired when matchmaking succeeds and assigns positions.
- **Payload**:
  ```json
  {
    "gameId": "cldx7b3pq0000j365o8zpf01a",
    "color": "white",
    "opponent": {
      "username": "grandmaster_bob",
      "rating": 1850
    }
  }
  ```

#### `opponentMove`
- **Description**: Forwards verified opponent moves to the user.
- **Payload**:
  ```json
  {
    "from": "e7",
    "to": "e5",
    "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
  }
  ```

---

## Examples

### 1. Client-Side Socket Connection Setup
```typescript
import { io, Socket } from 'socket.io-client';

export const connectGameSocket = (accessToken: string): Socket => {
  return io(process.env.VITE_SOCKET_URL!, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnectionDelayMax: 10000
  });
};
```

### 2. Server-Side Move Handler Listener
```typescript
socket.on('sendMove', async (payload: { gameId: string; from: string; to: string }) => {
  // 1. Verify player is authorized to move in this gameId
  // 2. Validate move legality with chess.js
  // 3. Update database PGN & FEN state
  // 4. Emit to game room: socket.to(payload.gameId).emit('opponentMove', { from, to, fen })
});
```

---

## Notes
- > [!IMPORTANT]
  > Socket authorization tokens expire on the same cycle as REST access tokens. Clients must send updated tokens on reconnect handshakes.
- > [!WARNING]
  > Always validate move vectors on the backend. Never trust coordinates sent directly from the browser without server verification.

---

## Best Practices
- **Implement Reconnection Buffers**: Give players a **30-second window** to reconnect before declaring an automatic abandonment victory for their opponent.
- **Clock Synces**: Use a periodic heartbeat event (`timeSync`) to align frontend countdown timers with backend game clocks.
- **Room Isolation**: Ensure players can only broadcast events to rooms in which they are registered.

---

## References
- [System Architecture Guide](architecture.md)
- [Client Frontend Interface Guide](frontend.md)
- [Socket Gateway Implementation Directory](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/src)
