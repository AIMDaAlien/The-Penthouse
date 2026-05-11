# Agent Handoff Format

When a frontend change requires a backend change (or vice versa), leave a handoff note in the task description or as a comment in the relevant contracts file.

## Format

```
HANDOFF → [target agent] [target file]
Needs: [exact endpoint shape / event name / type change]
Why: [one sentence]
```

## Example

```
HANDOFF → Codex services/api/src/routes/chats.ts
Needs: GET /api/v1/chats/:chatId/messages to return `cursor` field in response
Why: Frontend pagination uses cursor-based scroll
```

## Rules

- Be exact — name the file, the field, the type
- One handoff note per change needed
- The receiving agent must acknowledge before implementing

## 2026-05-10 - v4 cutover branch

HANDOFF -> Release operator `v4-cutover`
Needs: validate the merged v4 source in the incumbent v3 deployment shape before pushing to `origin/main`.
Why: v4 replaces `apps/web`, `services/api`, and `packages/contracts`, while v3-only deployment assets remain the production path.

Preserved from v3:

- `infra/compose/`
- `infra/docker-compose.yml`
- `services/api/Dockerfile`
- `services/api/.env.example`
- `scripts/`
- `antigravity/`
- `docs/DEPLOYMENT.md`
- `docs/TRUENAS_DEPLOYMENT.md`
- `docs/INTERNAL_TESTING.md`
- `docs/obsidian/`

Cutover-specific checks:

- `GIPHY_API_KEY` must come from env, never source.
- npm remains the package manager; stale `pnpm-workspace.yaml` was removed.
- `GET /api/v1/app-distribution` remains available for deployment clients.
- Android scripts stay in the repo, but v4 alpha is PWA-first and Android release is deferred to beta.
