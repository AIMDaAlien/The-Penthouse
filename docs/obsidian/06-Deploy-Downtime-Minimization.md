# Deploy Downtime Minimization (Compose + Caddy)

## Why Downtime Happens

In a single-host setup, updating the app typically means:

- container gets recreated
- TCP connections reset
- WebSocket clients disconnect briefly

For chat apps, even a short restart is noticeable.

## What We Implemented

### 1. Recreate Only the App (Keep Caddy Up)

The deploy workflow now:

- builds `penthouse-app` while the old one is still running
- recreates only `penthouse-app` (`--no-deps --force-recreate`)
- reloads Caddy config without restarting Caddy

This reduces visible downtime to the minimum restart window.

### 2. Graceful Shutdown in the App

On `SIGTERM`/`SIGINT`:

- mark health as `shutting_down`
- stop accepting new HTTP connections (`server.close()`)
- close Socket.IO
- after a grace period, force close lingering sockets

This prevents hard kills mid-request and reduces user-visible weirdness.

### 3. Give the Container Time to Drain

Compose:

- `stop_grace_period: 25s`
- `init: true`

### 4. Edge Retry During Short Restarts

Caddy `reverse_proxy` configured with a short retry window:

- try for up to ~5s
- retry every ~250ms

This can turn "1 request fails during deploy" into "request waits briefly then succeeds".

## What We Did NOT Implement (Yet)

### True Zero Downtime (Blue/Green)

True blue/green requires running two app instances simultaneously.

With the current DB approach (`sql.js` exporting to a local file), two active writers will corrupt/lose data unless re-architected.

If you want blue/green safely, the next step is migrating the DB to:

- SQLite (file-based with locking)
- Postgres (heavier but robust)

## Operational Expectation

With the above, a deploy should look like:

- brief blip (seconds) for WebSockets
- a small number of HTTP requests might wait rather than fail

That's "good enough" for small scale without major redesign.

