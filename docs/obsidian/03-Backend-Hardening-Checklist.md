# Backend Hardening Checklist (Express + Socket.IO + sql.js)

This is a pragmatic list of backend vulnerabilities and stability issues that were fixed in a minimal-risk way (no major redesign).

## Auth

- Registration optional-email bug:
  - Normalize `email` to `null` when blank/missing.
  - Duplicate checks conditional on whether email is present.
- Token security improvements:
  - Access token + refresh token model.
  - Refresh/reset tokens stored as SHA-256 hashes for new rows.
  - Temporary plaintext fallback for previously stored tokens.
- Backward compatibility:
  - Return `token` as an alias for `accessToken` so older mobile clients keep working.
- Added rate limits:
  - refresh
  - logout
  - forgot-password

## Friends / Blocked

- Fixed schema mismatch:
  - `blocked_users.created_at` migration added (safe try/catch).
  - `GET /api/friends/blocked` now works reliably.

## Invites

- Enforced `max_uses` atomically:
  - Transaction wraps check + membership insert + uses increment.
  - Exhausted invites return `410` with explicit error.

## Messages (IDOR Fixes)

- For routes with `:messageId`, fetch `chat_id` and verify membership before side effects:
  - react/unreact
  - read receipt
  - pin/unpin
  - edit/delete alignment hardening
- For `GET /pins/:chatId`, verify membership before listing.
- Clamp list pagination:
  - `limit` clamped to safe bounds (example: 1–100).

## WebSocket (Authorization)

- CORS origin allowlist aligned with HTTP CORS.
- Membership enforced on:
  - `join_chat`
  - `send_message`
  - `typing`
  - `stop_typing`
- Added a tiny short-TTL membership cache to avoid pounding the DB on typing spam.
- Added Socket.IO bounds/tuning:
  - `maxHttpBufferSize`
  - heartbeat settings

## Upload Safety

- Require both a valid extension and valid MIME type (previously it was `ext || mime`).
- Apply upload rate limiter.
- Safe deletion:
  - restrict deletes to uploads root using `path.basename` + fixed root
  - avoid request crashes by try/catch around unlink

## CORS / Reverse Proxy Correctness

- Parse `CORS_ORIGIN` as comma-separated allowlist.
- In production:
  - fail startup if `CORS_ORIGIN` missing
  - reject wildcard origins
- `app.set('trust proxy', 1)` so rate limiting and logs see the real client IP behind Caddy.

## Docker Hardening

- Avoid publishing app port directly; only Caddy exposed.
- `no-new-privileges`, `cap_drop: [ALL]`, `read_only: true`, `tmpfs: /tmp`.

## Tests

- Added Jest env setup (`JWT_SECRET`, `NODE_ENV=test`).
- Removed `forceExit` from Jest config.
- Added tests for:
  - blocked users route success
  - invite max uses `410`
  - non-member message action `403`
  - clamp limits
  - app update endpoint

