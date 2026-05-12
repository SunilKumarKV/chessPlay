# ChessPlay Production Upgrade Report v1.1.1

## Fixed
1. Replaced initial black screen with branded ChessPlay splash/loading screen.
2. Added fallback timeout for session restore so slow backend does not leave users stuck.
3. Added dashboard API timeout handling to prevent infinite dashboard loading.
4. Blocked placeholder/demo/disposable email domains on frontend and backend.
5. Added optional backend domain allowlist using AUTH_ALLOWED_EMAIL_DOMAINS.
6. Added real Analysis page with FEN loading, PGN loading, Stockfish best-move analysis, and board preview.
7. Added Play vs Player local pass-and-play mode.
8. Added Same WiFi/LAN page with production-safe explanation and local setup path.
9. Added local/offline navigation entries to dashboard/sidebar.
10. Improved theme consistency by exposing global CSS theme variables and replacing hardcoded layout backgrounds.

## Important note about Same WiFi play
A Vercel-hosted frontend cannot directly discover nearby devices on the same WiFi without either:
- a local backend/server running inside the same network, or
- a WebRTC signaling flow.

This upgrade adds a LAN setup page and working pass-and-play fallback. For true two-device offline LAN play, implement a local Socket.IO LAN mode or WebRTC manual pairing in the next phase.

## Tests passed
- npm run lint
- npm run build
- npm run test:production
- npm --workspace backend test
