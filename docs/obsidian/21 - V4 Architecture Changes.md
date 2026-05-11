---
tags: [penthouse, v4, architecture, drizzle, contracts]
created: 2026-05-10
---

# V4 Architecture Changes

## Backend

V4 keeps Fastify and Socket.IO, but the data layer is now Drizzle instead of raw `pg` query modules.

- Schema root: `services/api/src/db/schema.ts`
- Feature schemas: `services/api/src/features/*/schema.ts`
- Migrations: `services/api/src/db/migrations/`
- Database access: `services/api/src/db/pool.ts`

This makes table ownership clearer: custom emotes, folders, push, wallpapers, pins, and channel pieces live near their feature code instead of one monolithic schema file.

## Contracts

The shared contract package remains `packages/contracts`, with Zod schemas for REST payloads, realtime events, push payloads, and workflow routing.

Important files:

- `packages/contracts/src/api.ts`
- `packages/contracts/src/events.ts`
- `packages/contracts/src/push.ts`
- `packages/contracts/src/workflow.ts`

## Frontend

The frontend is Svelte 5/SvelteKit and remains PWA-first.

- App shell: `apps/web/src/routes/+layout.svelte`
- Chat route: `apps/web/src/routes/chat/[id]/+page.svelte`
- API client: `apps/web/src/lib/services/api.ts`
- Socket store: `apps/web/src/lib/stores/socket.svelte.ts`

## Deployment compatibility

The cutover keeps the v3 deployment shape:

- Docker Compose and Caddy in `infra/compose/`
- local Postgres and test Postgres in `infra/docker-compose.yml`
- API image build through `services/api/Dockerfile`
- operational scripts in `scripts/`

The important change is that v4 env names and v3 env names are normalized in `services/api/src/config/env.ts`, so older deployment templates do not silently drift.
