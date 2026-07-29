# ChessPlay Mobile Auth API

This contract is for native Expo React Native clients. It runs in parallel with the existing web cookie auth flow.

Existing web endpoints remain unchanged:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/session`
- `GET /api/auth/socket-token`

Mobile clients must not depend on browser cookies. Store tokens in the mobile secure storage layer.

## Token Model

| Token | Purpose | Transport | Default Expiry |
|---|---|---|---|
| `accessToken` | HTTP bearer auth for mobile API requests | `Authorization: Bearer <accessToken>` | 900 seconds |
| `refreshToken` | Long-lived session renewal token | JSON request body for refresh/logout | `REFRESH_TOKEN_EXPIRES` or 7 days |
| `socketToken` | Socket.IO handshake token | `handshake.auth.accessToken` | 900 seconds |

Current Socket.IO middleware validates access JWTs from `handshake.auth.accessToken`, so `socketToken` is currently a freshly signed access JWT returned with explicit socket naming. Split it into a dedicated socket JWT only after the socket middleware supports `type: "socket"`.

Refresh tokens are hashed at rest using SHA-256. Refresh is rotated on every successful mobile refresh.

## Register

`POST /api/auth/mobile/register`

Request:

```json
{
  "username": "Sunil",
  "email": "sunil@example.com",
  "password": "Password123",
  "referralCode": "OPTIONAL"
}
```

Response `201`:

```json
{
  "user": {
    "id": "user_id",
    "username": "Sunil",
    "email": "sunil@example.com"
  },
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "socketToken": "jwt",
  "expiresIn": 900,
  "referralConnected": false
}
```

Validation matches web registration:

- production email validation
- strong password validation
- alphanumeric username validation
- duplicate email/username rejection
- referral connection support
- welcome email event queueing
- security event logging

## Login

`POST /api/auth/mobile/login`

Request:

```json
{
  "email": "sunil@example.com",
  "password": "Password123",
  "referralCode": "OPTIONAL"
}
```

Response `200`:

```json
{
  "user": {
    "id": "user_id",
    "username": "Sunil",
    "email": "sunil@example.com"
  },
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "socketToken": "jwt",
  "expiresIn": 900,
  "referralConnected": false
}
```

Security behavior:

- banned/deleted accounts are rejected
- wrong password returns `400 Invalid credentials`
- login failures and successes are logged as security events
- the refresh token hash is replaced by the new mobile refresh token hash

## Refresh

`POST /api/auth/mobile/refresh`

Request:

```json
{
  "refreshToken": "jwt"
}
```

Response `200`:

```json
{
  "user": {
    "id": "user_id",
    "username": "Sunil",
    "email": "sunil@example.com"
  },
  "accessToken": "new_jwt",
  "refreshToken": "new_refresh_jwt",
  "socketToken": "new_socket_jwt",
  "expiresIn": 900
}
```

Validation:

- verifies JWT signature with the refresh secret
- requires `type: "refresh"`
- requires `userId`
- rejects deleted or banned users
- verifies token version
- verifies the stored refresh token hash
- rotates the refresh token on success
- revokes the stored refresh hash and increments token version if reuse/mismatch is detected

## Session

`GET /api/auth/mobile/session`

Headers:

```http
Authorization: Bearer <accessToken>
```

Response `200`:

```json
{
  "user": {
    "id": "user_id",
    "username": "Sunil",
    "email": "sunil@example.com"
  }
}
```

Invalid, expired, deleted, banned, or token-version-mismatched sessions return `401`.

## Socket Token

`GET /api/auth/mobile/socket-token`

Headers:

```http
Authorization: Bearer <accessToken>
```

Response `200`:

```json
{
  "socketToken": "jwt"
}
```

Expo Socket.IO client usage:

```ts
io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  auth: { accessToken: socketToken }
});
```

## Logout

`POST /api/auth/mobile/logout`

Use either bearer access token:

```http
Authorization: Bearer <accessToken>
```

or request body refresh token:

```json
{
  "refreshToken": "jwt"
}
```

Response `200`:

```json
{
  "message": "Logged out"
}
```

Logout clears the stored refresh token hash and increments token version so outstanding mobile access/socket tokens are invalidated.

## Mobile Client Lifecycle

1. Login or register.
2. Store `accessToken`, `refreshToken`, `socketToken`, and expiry timestamp in SecureStore.
3. Send `Authorization: Bearer <accessToken>` for API calls.
4. Before or after access expiry, call `/api/auth/mobile/refresh` with `refreshToken`.
5. Replace all stored tokens with the refresh response.
6. For live games, connect Socket.IO with `auth.accessToken = socketToken`.
7. On logout, call `/api/auth/mobile/logout`, then clear SecureStore.

## Compatibility Notes

- Web auth remains cookie-based and unchanged.
- Mobile auth does not set or require cookies.
- This backend currently stores one refresh token hash per user, so a new login or refresh replaces the previous refresh token hash for that user.
- Password reset and account deletion invalidate refresh state by clearing `refreshTokenHash` and incrementing `tokenVersion`.
