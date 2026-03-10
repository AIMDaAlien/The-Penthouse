# Realtime Hardening

## Goal

Harden Android-first chat transport so the app can establish Socket.IO reliably, while keeping HTTP chat refresh as a bounded degraded mode instead of an accidental always-on fallback.

## What changed

### Mobile client

- Replaced the old boolean status model with a realtime state machine:
  - `idle`
  - `connecting`
  - `connected`
  - `degraded`
  - `failed`
- Added explicit diagnostics state:
  - current transport
  - last socket error
  - last disconnect reason
  - last successful connection time
  - whether fallback polling is active
- Locked Android transport order to:
  - `polling`
  - then `websocket`
- Set explicit Socket.IO path:
  - `/socket.io/`
- Kept `rememberUpgrade = false`
- Added resume-from-background reconnect + chat resync
- Limited fallback polling to:
  - selected chat only
  - chat view only
  - degraded/failed states only
- Added a dev-only diagnostics panel behind the connection badge

### API / server

- Added explicit Socket.IO path:
  - `/socket.io/`
- Replaced permissive socket CORS with explicit origin checks
- Allowed native local testing origins used by Android/Capacitor:
  - `http://localhost`
  - `https://localhost`
  - `http://127.0.0.1`
  - `https://127.0.0.1`
  - `capacitor://localhost`
  - `ionic://localhost`
  - `app://localhost`
  - plus configured `CORS_ORIGIN` values
  - plus `null` / no-origin local traffic
- Added server-side observability for:
  - handshake start
  - engine connection error
  - engine connect/close
  - namespace connect
  - auth rejection reason
  - transport upgrade

## Why this matters

Before this slice:

- Android chat was usable only because HTTP polling kept refetching messages.
- The app still said `Realtime offline`.
- API logs gave almost no signal about whether socket traffic was even reaching the server.

After this slice:

- degraded mode is explicit instead of accidental
- diagnostics show what the client thinks is happening
- API logs show whether the server saw:
  - the handshake
  - the auth failure
  - the connection
  - the transport
- there is now a clean escalation path if Android still refuses to establish true realtime

## Tests added / updated

### Mobile

- `ConnectionStatus.test.ts`
  - new realtime state props
  - diagnostics panel
  - degraded / failed behavior
- `App.test.ts`
  - connecting state on startup
  - degraded state on connect error
  - failed state on reconnect exhaustion
  - fallback only in active chat view
  - chat rejoin after reconnect

### API

- `integration-realtime.test.ts`
  - successful socket connection logs
  - invalid token auth rejection logs
  - unavailable-account auth rejection logs

## Validation

- `npm --workspace apps/mobile run test`
- `npm --workspace services/api run typecheck`
- `DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse JWT_SECRET=integration-test-jwt-secret-long-enough npm --workspace services/api run test:integration`
- `DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse JWT_SECRET=integration-test-jwt-secret-long-enough npm run validate`
- `npm run scenario:test`
- `npm --workspace apps/mobile run android:prep`

## Current truth

- If Android still shows `Realtime offline`, the app should still keep the active chat usable through bounded polling.
- The next debugging step is no longer guesswork:
  - check the badge diagnostics
  - check the API terminal for socket log lines

## Next escalation if Android true realtime still fails

If Android still cannot reach true socket realtime even after these changes:

1. put local API traffic behind a dedicated local domain/proxy path
2. use Caddy/TLS for the local test path
3. stop relying on plain emulator `localhost` as the only transport route
