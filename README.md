# The Penthouse

A privacy-focused, invite-only messaging PWA for small communities. Self-hosted, no big-tech dependencies.

**Current version:** v2.1.0-alpha.1 (SvelteKit PWA)

> **v2.0.0-alpha [DISCONTINUED]** — The previous release used Vue 3 + Capacitor for Android APK distribution. That approach is discontinued. The SvelteKit PWA is the canonical release going forward. Users install via browser "Add to Home Screen" — no APK, no app store.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 2.x + TypeScript |
| PWA | @vite-pwa/sveltekit (Workbox, service worker, offline) |
| Realtime | Socket.IO (client + server) |
| Backend | Fastify + PostgreSQL + Socket.IO |
| Shared types | @penthouse/contracts (Zod schemas) |
| Infra | Docker Compose + Caddy (self-hosted) |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres
docker compose -f infra/compose/docker-compose.yml up -d postgres

# 3. Start the API
npm --workspace services/api run dev

# 4. Start the PWA frontend
npm --workspace apps/web run dev
```

Frontend runs at `http://localhost:5173`. API runs at `http://localhost:3000`.

---

## What Changed Since v2.0.0-alpha

The `pwa` branch is a full frontend replacement. The backend (Fastify + PostgreSQL + Socket.IO) is unchanged in architecture; new feature endpoints were added on top.

### Frontend

- **Replaced** `apps/mobile` (Vue 3 + Capacitor) with `apps/web` (SvelteKit 2.x PWA)
- No Capacitor, no Android SDK, no APK signing required
- Users install via browser "Add to Home Screen" on Android Chrome
- Custom design system: CSS custom properties, dark theme, mobile-first layout

### Features added (Wave A)

- GIF picker (Klipy integration)
- Message reactions
- Message replies (threaded)
- Read receipts
- Poll creation and voting
- Chat muting
- Welcome / landing page with auth guard
- Connection status indicator (online / offline / reconnecting)

### Features added (Wave B)

- Media uploads — images, videos, and documents in messages
  - Up to 10 files · 25 MB per message
  - Real-thumbnail preview grid in the composer (1→2→3 columns)
  - Per-file XHR upload with progress rings and error/retry
  - File download chips for documents
  - +N overflow expand in the message bubble

### Backend additions

- Wave A/B DB migrations (polls, reactions, replies, pins, mute, media)
- Upload endpoint with rate limiting, MIME validation, and advisory locking
- Input validation and UUID guards hardened across all routes

---

## Repository Structure

```
apps/web/           ← SvelteKit PWA frontend (primary)
services/api/       ← Fastify backend
packages/contracts/ ← Shared Zod schemas + TypeScript types
infra/              ← Docker Compose, Caddy, env configs
scripts/            ← Build + release gate scripts
docs/               ← Design specs, implementation plans, handoff docs
```

---

## Production Deployment

Production compose files:

- `infra/compose/docker-compose.production.yml` — standard VPS
- `infra/compose/docker-compose.truenas.yml` — TrueNAS Scale

Environment template: `services/api/.env.example`

The PWA frontend is served as a static build via Caddy. No separate frontend Node.js process in production.

---

## Development

```bash
# Typecheck
npm --workspace apps/web run typecheck

# Tests
npm --workspace apps/web run test

# Build
npm --workspace apps/web run build

# Release gate
npm run release:gate
```

Agent delegation map: see `CLAUDE.md`.
