# The Penthouse Rebuild

Clean-room rebuild of The Penthouse with a stability-first architecture.

## Stack

- Mobile app: Vue 3 + Vite + Capacitor (Android first)
- API: Fastify + PostgreSQL + Socket.IO
- Shared contracts: Type-safe schemas in `packages/contracts`
- Infra: Docker Compose + Caddy for TrueNAS-friendly single node deployment

## Quick Start

1. Install dependencies:
   - `npm install`
2. Start local infra:
   - `docker compose -f infra/compose/docker-compose.yml up -d postgres`
3. Run API:
   - `npm --workspace services/api run dev`
4. Run app:
   - `npm --workspace apps/mobile run dev`

## Validation

- `npm run validate`
- `npm run scenario:test`
- `npm run release:gate` (runs release-readiness checks in one pass)

## Deployment

- [docs/DEPLOYMENT.md](/Users/aim/Documents/The%20Penthouse/docs/DEPLOYMENT.md)
- [docs/TRUENAS_DEPLOYMENT.md](/Users/aim/Documents/The%20Penthouse/docs/TRUENAS_DEPLOYMENT.md)

Android release note:
- public rebuild APKs require signing values via env vars or `apps/mobile/android/keystore.properties`

Production backend files:

- [infra/compose/docker-compose.production.yml](/Users/aim/Documents/The%20Penthouse/infra/compose/docker-compose.production.yml)
- [infra/compose/docker-compose.truenas.yml](/Users/aim/Documents/The%20Penthouse/infra/compose/docker-compose.truenas.yml)
- [infra/compose/.env.production.example](/Users/aim/Documents/The%20Penthouse/infra/compose/.env.production.example)
- [infra/compose/.env.truenas.example](/Users/aim/Documents/The%20Penthouse/infra/compose/.env.truenas.example)
- [infra/compose/caddy/Caddyfile.production](/Users/aim/Documents/The%20Penthouse/infra/compose/caddy/Caddyfile.production)
- [infra/compose/site/public/index.html](/Users/aim/Documents/The%20Penthouse/infra/compose/site/public/index.html)
- [infra/compose/site/public/legacy/index.html](/Users/aim/Documents/The%20Penthouse/infra/compose/site/public/legacy/index.html)

## Internal Testing

- [docs/INTERNAL_TESTING.md](/Users/aim/Documents/The%20Penthouse/docs/INTERNAL_TESTING.md)

## Obsidian Project Memory

Start with the hub, then use the focused notes below for the current recovery phase.

- [docs/obsidian/00 - Knowledge Hub.md](/Users/aim/Documents/The%20Penthouse/docs/obsidian/00%20-%20Knowledge%20Hub.md)
- [docs/obsidian/01 - Rebuild Timeline.md](/Users/aim/Documents/The%20Penthouse/docs/obsidian/01%20-%20Rebuild%20Timeline.md)
- [docs/obsidian/08 - Live Chat Essentials.md](/Users/aim/Documents/The%20Penthouse/docs/obsidian/08%20-%20Live%20Chat%20Essentials.md)
- [docs/obsidian/10 - Media Integration.md](/Users/aim/Documents/The%20Penthouse/docs/obsidian/10%20-%20Media%20Integration.md)
- [docs/obsidian/13 - MVP Stability Plan v2.md](/Users/aim/Documents/The%20Penthouse/docs/obsidian/13%20-%20MVP%20Stability%20Plan%20v2.md)

## Policy / Delegation

Use the assets under `antigravity/` as the routing and workflow source of truth.
