# REST API Reference Specification

## Purpose
This document contains the complete endpoint specifications, request schemas, response shapes, and response codes for all HTTP routes in ChessPlay.

## Navigation
[README](../README.md) • [API.md](../API.md) • [authentication.md](authentication.md) • [database.md](database.md)

---

## Global Routing Conventions
- **Base Route**: All requests are routed through `/api`.
- **Response Headers**: JSON payloads are served with `Content-Type: application/json`.
- **Standard Success Wrapper**: All successful endpoints return:
  ```json
  { "success": true, "data": {} }
  ```

---

## Endpoint Catalog

### 1. Authentication Module

#### `POST /auth/register`
- **Description**: Creates a new user profile record.
- **Request Body**:
  ```json
  {
    "email": "user@domain.com",
    "username": "chess_master",
    "password": "StrongPassword123!"
  }
  ```
- **Response Shape (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "cldx7b3pq0000j365o8zpf01a",
      "username": "chess_master",
      "emailVerified": false
    }
  }
  ```

#### `POST /auth/login`
- **Description**: Authenticates user credentials and signs session keys.
- **Request Body**:
  ```json
  {
    "username": "chess_master",
    "password": "StrongPassword123!"
  }
  ```
- **Response Shape (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "ey...",
      "user": {
        "username": "chess_master",
        "rating": 1200,
        "isPremium": false
      }
    }
  }
  ```
  *(Note: The refresh token is set simultaneously via an `httpOnly` secure Cookie.)*

---

### 2. Puzzle Engine Module

#### `GET /puzzles/daily`
- **Description**: Returns the user's daily queue of chess puzzles.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response Shape (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "puz_001",
        "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        "moves": ["d2d4", "e5d4", "f3d4"],
        "rating": 950,
        "themes": ["opening", "fork"]
      }
    ]
  }
  ```

---

## Examples

### 1. Handling Authorization Token Expiry Errors
When access tokens expire, backend routes reject requests with a `401` status code:
`Response Header: HTTP/1.1 401 Unauthorized`
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "The provided access token has expired."
  }
}
```

### 2. Submitting Feedback API Call
`POST /api/feedback`
```json
{
  "category": "bug",
  "text": "The chessboard grid overflows on iPhone 12 mini screens."
}
```
`Response Shape (200 OK)`:
```json
{
  "success": true,
  "message": "Feedback submitted successfully."
}
```

---

## Notes
- > [!IMPORTANT]
  > Rate limits apply: Authentication routes allow a maximum of **10 attempts per minute** before locking the user IP for 1 hour.
- > [!WARNING]
  > Schema validation failures return a `400 Bad Request` status accompanied by descriptive field validation error arrays.

---

## Best Practices
- **Implement Joi/Zod Schema Validations**: Validate payloads before hitting database execution layers.
- **Graceful Error Catching**: Always use Express error handler wrappers around route async actions to prevent server thread crashes.
- **Log Request Metadata**: Log timing markers, response sizes, and endpoint routes for diagnostic tracing.

---

## References
- [REST API Outline Reference](../API.md)
- [Authentication Operations](authentication.md)
- [Route Handlers Directory Path](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/routes)
