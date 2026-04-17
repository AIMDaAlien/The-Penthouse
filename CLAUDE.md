# The Penthouse — Project Constitution

## What this project is
A privacy-focused, invite-only social messaging PWA for small communities (~20–200 users).
Self-hosted on a personal server. No dependency on big tech services where avoidable.

## Current branch: `pwa`
- Replaces the Vue + Capacitor mobile app with a SvelteKit PWA
- Backend (Fastify + PostgreSQL + Socket.IO) is unchanged
- Target version: **v2.1.0** (releases after MVP alpha is stable)
- Previous release: v2.0.0-alpha (Vue + Capacitor, on `main`)

---

## Repository structure

```
apps/web/          ← SvelteKit PWA frontend (CLAUDE owns this)
services/api/      ← Fastify backend (Codex/GPT-5.4 owns this)
packages/contracts/ ← Shared Zod schemas + TypeScript types (coordination required)
infra/             ← Docker Compose, Caddy, env configs (Codex/GPT-5.4 owns this)
scripts/           ← Build + release gate scripts (Codex/GPT-5.4 owns this)
```

---

## Agent delegation map

| Directory | Primary agent | Can the other agent read? | Can the other agent edit? |
|---|---|---|---|
| `apps/web/` | Claude (Sonnet) | Yes | Only with explicit handoff note |
| `services/api/` | Codex (GPT-5.4) | Yes | Only with explicit handoff note |
| `packages/contracts/` | Both (coordinate) | Yes | Both, but document the change |
| `infra/` | Codex (GPT-5.4) | Yes | No |
| `scripts/` | Codex (GPT-5.4) | Yes | No |
| `CLAUDE.md` files | Claude (Sonnet) | Yes | No — only updated by the human owner |

---

## MVP feature lock — ENFORCED

The following features are the ONLY features in scope for the initial `pwa` alpha release.
No agent may add features outside this list without explicit approval from the project owner.

### In scope
1. Login / Register / Logout
2. Password reset (in-app)
3. Chat list (direct messages + group channels)
4. Open a chat and read messages
5. Send a text message (real-time via Socket.IO)
6. Basic user profile (display name, avatar)
7. PWA install prompt (add to home screen)
8. Connection status indicator (online/offline/reconnecting)

### Explicitly out of scope for MVP
- GIF picker / Giphy / Klipy
- Media uploads (images, video, files)
- Typing indicators
- Read receipts / seen status
- Push notifications (Web Push / VAPID)
- Admin suite UI (backend admin routes exist, UI comes post-MVP)
- Member directory
- Presence indicators
- Message reactions

These features will be added in post-MVP sprints. Do not implement them speculatively.

---

## The 3-file rule
No single task prompt may touch more than 3 files.
If a feature requires more than 3 files, split it into multiple tasks.
This rule prevents scope creep and cascading breakage.

---

## How agents hand off work to each other

When a frontend change requires a backend change (or vice versa), the implementing agent
leaves a **handoff note** in the task description or as a comment in the relevant contracts file.

Format:
```
HANDOFF → [target agent] [target file]
Needs: [exact endpoint shape / event name / type change]
Why: [one sentence]
```

Example:
```
HANDOFF → Codex services/api/src/routes/chats.ts
Needs: GET /api/v1/chats/:chatId/messages to return `cursor` field in response
Why: Frontend pagination uses cursor-based scroll
```

---

## No scope creep clause
If an agent receives a prompt and notices it would require touching files outside its scope
or implementing features outside the MVP list, it must STOP and report back to the project owner
before proceeding. Never silently expand scope.

---

## Versioning policy
- `main` = v2.0.0-alpha (Vue + Capacitor, current public release)
- `pwa` branch = v2.1.0 development (this branch)
- Version is bumped in root `package.json` and `apps/web/package.json` at release time only
- Pre-release tag: `-alpha.N` until public release readiness is confirmed

---

## Stack reference

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 2.x + TypeScript |
| PWA | @vite-pwa/sveltekit (Workbox) |
| Realtime client | socket.io-client |
| HTTP client | fetch (native, no axios) |
| Backend | Fastify + PostgreSQL + Socket.IO |
| Shared types | @penthouse/contracts (Zod schemas) |
| Infra | Docker Compose + Caddy (self-hosted) |

---

## What "done" means for any task
A task is complete when:
1. The feature works in a browser dev server (`npm run dev`)
2. TypeScript compiles without errors (`npm run typecheck`)
3. No existing tests are broken (`npm run test`)
4. No files outside the task scope were modified
