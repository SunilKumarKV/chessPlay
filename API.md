# ChessPlay REST API Overview

## Purpose
This document provides an entrypoint reference for the ChessPlay HTTP REST API, highlighting base paths, authentication formats, and global error handling policies.

## Navigation
[README](README.md) • [docs/api.md](docs/api.md) • [ARCHITECTURE.md](ARCHITECTURE.md) • [docs/authentication.md](docs/authentication.md)

---

## Global API Design

### Base URL
In development, the server listens by default at `http://localhost:5000/api`. In production, the client calls the configured `VITE_API_URL` environment value.

### Authentication
Secure endpoints require authorization via JSON Web Tokens (JWT) sent in the HTTP `Authorization` header as a Bearer token:
```text
Authorization: Bearer <access_token>
```

### Global Error Payload Format
All errors returned by backend controllers follow a consistent JSON structure:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description of what went wrong.",
    "details": {}
  }
}
```

---

## Core Endpoint Modules

| Endpoint Path | Method | Auth Required | Description |
|---|---|---|---|
| `/auth/register` | `POST` | No | Creates a new user profile. |
| `/auth/login` | `POST` | No | Authenticates a user and returns access/refresh tokens. |
| `/auth/refresh` | `POST` | No | Exchanges a valid refresh token for a new access token. |
| `/puzzles/daily` | `GET` | Yes | Retrieves the daily handpicked puzzle quota. |
| `/payments/razorpay/order` | `POST` | Yes | Generates a new billing order. |
| `/payments/razorpay/verify`| `POST` | Yes | Verifies payment signature and triggers plan upgrade. |
| `/waitlist` | `POST` | No | Registers an email to the ChessPlay beta launch queue. |

---

## Examples

### 1. Waitlist Registration Request
`POST /api/waitlist`
```json
{
  "email": "developer@chessplay.xyz",
  "referrerCode": "SUNIL123"
}
```

### 2. Waitlist Registration Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "cldx7b3pq0000j365o8zpf01a",
    "email": "developer@chessplay.xyz",
    "position": 1420,
    "createdAt": "2026-07-12T09:05:41.000Z"
  }
}
```

---

## Notes
- > [!IMPORTANT]
  > Sensitive authentication and billing endpoints are protected by rate limiters (maximum 100 requests per 15-minute window).
- > [!WARNING]
  > Refresh tokens are stored securely in client-side cookies with `httpOnly` and `secure` enabled, whereas access tokens are returned in the response payload.

---

## Best Practices
- **Token Handling**: Store access tokens in memory (Zustand/Redux) rather than in vulnerable storage spaces like `localStorage`.
- **Handle 401 Gracefully**: Configure frontend request interceptors (e.g. Axios or fetch wrapper) to catch expired tokens and fire the `/auth/refresh` call automatically.
- **Payload Validation**: Always sanitize and validate parameters before sending them to backend routing controllers.

---

## References
- [Detailed REST API Specifications](docs/api.md)
- [Authentication and Token Lifecycles](docs/authentication.md)
- [Backend Route Implementation Source Directory](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/routes)
