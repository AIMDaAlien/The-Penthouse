# Start Here (Non-Engineer Guide)

This project is split into three main parts:

1. `apps/mobile`
- Your mobile-first app UI (Vue + Capacitor).
- What users see and tap.

2. `services/api`
- Your backend server (Fastify).
- Handles login, chats, messages, uploads, and realtime updates.

3. `packages/contracts`
- Shared schemas/types.
- Keeps app and backend in sync so one side does not silently break the other.

## Why this structure prevents tech debt

- Contracts are defined first.
- API and app both import those contracts.
- CI checks fail if type contracts break.
- High-risk workflow gates are already configured in `antigravity/`.

## Run locally

1. Start PostgreSQL:
```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres
```

2. Start API:
```bash
npm --workspace services/api run dev
```

3. Start mobile app (web dev mode):
```bash
npm --workspace apps/mobile run dev
```

## Safety checks before any merge

```bash
npm run validate
npm run scenario:test
npm run release:gate
```

All must pass.

## Obsidian knowledge notes

If you are onboarding others, start with:

- `docs/obsidian/00 - Knowledge Hub.md`

## Internal device testing

- `docs/INTERNAL_TESTING.md`
