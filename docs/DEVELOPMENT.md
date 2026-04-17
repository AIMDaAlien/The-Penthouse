# The Penthouse — Development Setup

This guide walks you through setting up The Penthouse locally for development and testing.

## Prerequisites

- **Node.js** 22+ (check with `node --version`)
- **Docker** (for PostgreSQL) — if you have a PostgreSQL server running elsewhere, update `.env` accordingly
- **Android Studio** or emulator (for mobile testing; optional but recommended for alpha)

## Quick Start

### 1. Install dependencies

```bash
cd /Users/aim/Documents/THE\ PENTHOUSE\ OPTIMIZED
npm install
```

This installs dependencies for all workspaces: `apps/web`, `services/api`, `packages/contracts`.

### 2. Start PostgreSQL

```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres
```

Wait ~3 seconds for the database to be ready. Verify:
```bash
docker compose -f infra/compose/docker-compose.yml logs postgres | grep "database system is ready"
```

### 3. Set up the database

Run migrations:
```bash
npm --workspace services/api run migrate
```

This creates tables, indexes, and the shared "General" channel.

### 4. Start the backend (Fastify + Socket.IO)

In a new terminal:
```bash
npm --workspace services/api run dev
```

You should see:
```
[14:32:45] INFO: Server listening on http://localhost:3000
```

### 5. Start the frontend (SvelteKit PWA)

In another new terminal:
```bash
npm --workspace apps/web run dev
```

You should see:
```
  VITE v6.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 6. Open the app

Go to **http://localhost:5173** in a browser. You should see the login screen with "The PENTHOUSE" logo.

---

## First test: Create accounts and chat

### Create two users (simulate two people)

**Terminal 1: Browser A**
- Go to http://localhost:5173
- Click **Create account**
- Username: `alice`, Password: `test1234`
- **Accept the alpha notice** (checkbox)
- Click **Create account**

You should see the chat list (empty for now).

**Terminal 2: Browser B (incognito/different browser)**
- Go to http://localhost:5173
- Click **Create account**
- Username: `bob`, Password: `test1234`
- Accept alpha notice
- Click **Create account**

### Create a direct message chat

This is currently a TODO — the backend supports direct messages but the UI doesn't have a "Create chat" button yet.

### Fallback: Use the shared General channel

For now, both users are automatically members of the "General" channel (created by migrations).

**In Browser A:**
- You should see a chat labeled "General" in the chat list
- Click it
- Type a message: `Hello from Alice!`
- Press Enter or click the send button (↑)

**In Browser B:**
- Refresh the page (to load chats)
- Click "General"
- You should see Alice's message appear in real-time
- Type back: `Hi Alice!`
- Send it

**Back in Browser A:**
- You should see Bob's message in real-time

✅ If messages appear instantly on both sides, the socket connection and end-to-end flow works.

---

## Testing on Android

### Using Android Studio emulator

1. **Start the emulator** with at least 1 GB RAM
2. **Port-forward** the Fastify server to the emulator:
   ```bash
   adb reverse tcp:3000 tcp:3000
   adb reverse tcp:5173 tcp:5173
   ```
3. **In the emulator's browser**, go to `http://localhost:5173`

### Using a physical Android phone

1. Find your development machine's local IP:
   ```bash
   ipconfig getifaddr en0   # macOS
   # or
   ip route | grep "^default" | awk '{print $3}'  # Linux
   ```
   Example: `192.168.1.50`

2. **Update `.env` in `apps/web/`**:
   ```env
   PUBLIC_API_URL=http://192.168.1.50:3000
   PUBLIC_SOCKET_URL=http://192.168.1.50:3000
   ```

3. **Restart the frontend**:
   ```bash
   npm --workspace apps/web run dev
   ```

4. **In your phone's browser**, go to `http://192.168.1.50:5173`

5. **"Add to Home Screen"** (Chrome menu → "Install app") to test as a PWA

---

## Useful commands

| Command | What it does |
|---------|-------------|
| `npm run validate` | Runs typecheck + tests on all workspaces |
| `npm run typecheck --workspace=apps/web` | TypeScript check frontend only |
| `npm run test --workspace=services/api` | Unit + integration tests (integration tests require DB) |
| `npm --workspace services/api run migrate` | Run pending migrations |
| `npm --workspace services/api run dev` | Backend (Fastify) dev server |
| `npm --workspace apps/web run dev` | Frontend (SvelteKit) dev server |
| `docker compose -f infra/compose/docker-compose.yml down` | Stop PostgreSQL |
| `docker compose -f infra/compose/docker-compose.yml logs postgres` | View PostgreSQL logs |

---

## Troubleshooting

### "Connection refused: localhost:3000"

**Frontend can't reach the backend.**

- Check that the backend dev server is running (`npm --workspace services/api run dev`)
- Check `apps/web/.env` — `PUBLIC_API_URL` should match where your backend is running
- On Android: Make sure port-forward or IP is correct

### "Database connection failed"

**Backend can't connect to PostgreSQL.**

- Check PostgreSQL is running: `docker ps`
- If not, start it: `docker compose -f infra/compose/docker-compose.yml up -d postgres`
- Check `DATABASE_URL` in `services/api/.env.example` (or create `.env` with the right URL)

### Messages don't appear in real-time

**Socket.IO connection issue.**

- Open browser DevTools → **Network** tab
- Filter for "WS" (WebSocket)
- You should see a connection to `localhost:3000` (or your remote IP)
- If it's not there, Socket.IO fell back to polling (check console for warnings)
- Backend Socket.IO diagnostics are logged to stdout when you run `npm --workspace services/api run dev`

### "Alpha notice checkbox won't work"

Make sure you clicked the checkbox and it's actually checked before clicking "Create account".

---

## Next steps

Once you've verified the happy path works:

1. **Test offline behavior** — Put your phone in airplane mode while in a chat, send a message, turn airplane mode off. The message should retry and deliver.

2. **Test multi-user** — Use the emulator and physical phone simultaneously to verify real-time sync

3. **Check the console** for any error messages that don't appear in the UI

4. **Test on Android Studio emulator vs. physical device** — There can be subtle differences in WebSocket behavior

---

## Notes for deployment

When you deploy to TrueNAS:

1. **Update `PUBLIC_API_URL`** in `apps/web/.env` (or build-time env var) to point to your production domain:
   ```env
   PUBLIC_API_URL=https://api.penthouse.blog
   PUBLIC_SOCKET_URL=https://api.penthouse.blog
   ```

2. **Run migrations** on the production database before starting the backend

3. **Build the frontend** for production:
   ```bash
   npm --workspace apps/web run build
   ```
   The output in `apps/web/build/` can be served by Caddy (already configured in `infra/compose/docker-compose.production.yml`)

4. See `docs/DEPLOYMENT.md` and `docs/TRUENAS_DEPLOYMENT.md` for full deployment steps
