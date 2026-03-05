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

## Policy / Delegation

Use the assets under `antigravity/` as the routing and workflow source of truth.
