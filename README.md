# The Penthouse

**v4.0.0-alpha.1**
Private chat for a small circle. Invite-only, self-hosted, real-time, and built with the sort of restraint that says the door policy matters.

The Penthouse is a SvelteKit PWA backed by a Fastify API, PostgreSQL, Socket.IO, Drizzle, and shared Zod contracts. It is currently alpha software: usable, deliberately scoped, and not pretending to be a public social network.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 + SvelteKit + TypeScript |
| PWA | Vite PWA + Workbox service worker |
| Backend | Fastify + Socket.IO |
| Data | PostgreSQL + Drizzle ORM |
| Contracts | `@penthouse/contracts` with Zod schemas |
| Infra | Docker Compose + Caddy |
| Brand notes | Gelasio serif, editorial layout, gold accent `#C9A96E` |

## Feature Highlights

- Real-time DMs, channels, typing, presence, and read receipts
- Pinned messages, replies, reactions, edits, deletes, and message search
- Custom emotes with `:name:` syntax, any-emoji reactions, and autocomplete
- Sticker packs and a unified `+` picker for emoji, GIFs, and stickers
- Giphy-backed GIF search through the API
- Voice notes with waveform playback, scrubbing, and speed control
- Availability states: available, busy, do-not-disturb, AFK, and notes
- Chat folders, per-chat channels, wallpapers, dark/light/system themes
- Web push scaffold with tiered scopes, quiet hours, and privacy levels

Voice chat is scaffolded for beta. Android APK release scripts are preserved for continuity, but v4 alpha is PWA-first.

## Quick Start

```bash
npm install
npm run db:start
npm --workspace services/api run dev
npm --workspace apps/web run dev
```

Local defaults:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Postgres: `localhost:5432`
- Test Postgres: `localhost:5433`

Set `GIPHY_API_KEY` in `services/api/.env` if you want live GIF results. Without it, the GIF endpoint returns an empty result set instead of failing chat.

## Validation

```bash
npm run validate
npm run test
npm run scenario:test
npm --workspace apps/web run build
npm --workspace services/api run build
docker build -f services/api/Dockerfile .
```

## Deployment

The deployment shape follows the incumbent v3 repo: Docker Compose, Caddy, PostgreSQL, and static PWA assets.

- General deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- TrueNAS deployment: [`docs/TRUENAS_DEPLOYMENT.md`](docs/TRUENAS_DEPLOYMENT.md)
- API env template: [`services/api/.env.example`](services/api/.env.example)
- Production env template: [`infra/compose/.env.production.example`](infra/compose/.env.production.example)

## Repository Map

```text
apps/web/           SvelteKit PWA
services/api/       Fastify API, Drizzle schema, migrations, Socket.IO
packages/contracts/ Shared Zod schemas and realtime contracts
infra/              Local and production Compose/Caddy config
scripts/            Backup, restore, release, and Android continuity scripts
antigravity/        Scenario testing and delegation policy harness
docs/obsidian/      Durable project memory
```

## Alpha Notes

This is a private alpha. Keep deployments boring, logs clean, and contracts explicit. If a feature needs a key, mount it through env. If a release claim matters, prove it with the running stack.
