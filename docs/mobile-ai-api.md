# Mobile AI API

## Architecture

ChessPlay mobile uses a backend AI endpoint instead of bundling Stockfish inside the Expo app. This keeps Android/iOS builds stable and lets the backend decide whether a real Stockfish UCI engine is available.

The web app still uses its existing browser worker Stockfish assets. This endpoint is additive and does not change web AI behavior.

## Engine Source

The backend attempts to run Stockfish through:

1. `STOCKFISH_PATH`, if set.
2. `stockfish` from the server `PATH`.

If no executable is available, the endpoint returns a deterministic legal fallback move and marks:

```json
{
  "source": "fallback"
}
```

The fallback is not random. It selects from legal moves with a small heuristic for captures, promotions, checks, mate, and center/development preferences.

## Endpoint

`POST /api/ai/move`

Auth required.

Rate limited to 40 requests per minute per client.

### Request

```json
{
  "board": [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"]
  ],
  "turn": "w",
  "level": "easy",
  "moveHistory": [],
  "fen": "optional full FEN",
  "hint": false
}
```

### Response

```json
{
  "move": {
    "fromRow": 6,
    "fromCol": 4,
    "toRow": 4,
    "toCol": 4,
    "promotion": "q"
  },
  "evaluation": {
    "type": "cp",
    "value": 0.31
  },
  "bestLine": ["e2e4", "e7e5"],
  "depth": 8,
  "source": "stockfish"
}
```

`evaluation` is `null` when fallback is used.

## AI Levels

- `easy`: skill 1, 450ms
- `medium`: skill 8, 800ms
- `hard`: skill 16, 1300ms
- `pro`: skill 20, 2000ms

## Mobile Flow

1. Mobile creates backend-compatible local game state.
2. User moves locally with backend-compatible validation.
3. Mobile calls `POST /api/ai/move` for the AI side.
4. Mobile applies the returned move locally with the same backend-compatible adapter.
5. Mobile records completed AI games through `POST /api/games/record`.

## Production Setup

Install Stockfish on the backend host and set:

```bash
STOCKFISH_PATH=/usr/bin/stockfish
```

If the host image exposes `stockfish` on `PATH`, `STOCKFISH_PATH` is optional.
