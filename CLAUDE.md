# The Penthouse — Project Constitution

## What this project is
A privacy-focused, invite-only social messaging PWA for small communities (~20–200 users).
Self-hosted on a personal server. No dependency on big tech services where avoidable.

## Current state
- `main` branch — v2.1.0-alpha.1, SvelteKit PWA (canonical release)
- Frontend: `apps/web/` (SvelteKit 2.x) — Vue + Capacitor retired
- Backend: `services/api/` (Fastify + PostgreSQL + Socket.IO) — unchanged architecture

---

## Repository structure

```
apps/web/           ← SvelteKit PWA frontend (Claude owns this)
services/api/       ← Fastify backend (Codex owns this)
packages/contracts/ ← Shared Zod schemas + TypeScript types (coordinate)
infra/              ← Docker Compose, Caddy, env configs (Codex owns this)
scripts/            ← Build + release scripts (Codex owns this)
docs/               ← Specs, plans, handoff docs
```

---

## Agent delegation map

| Directory | Owner | Other agent: read? | Other agent: edit? |
|---|---|---|---|
| `apps/web/` | Claude (Sonnet) | Yes | Only with handoff note |
| `services/api/` | Codex (GPT-5.4) | Yes | Only with handoff note |
| `packages/contracts/` | Both | Yes | Both — document changes |
| `infra/` | Codex (GPT-5.4) | Yes | No |
| `scripts/` | Codex (GPT-5.4) | Yes | No |
| `CLAUDE.md` files | Human owner | Yes | No — human only |

Handoff format → `docs/AGENT-HANDOFFS.md`

---

## Shipped features (v2.1.0-alpha.1)

- Auth: Login, Register, Logout, Password reset
- Chat list (DMs + group channels)
- Text messaging, real-time via Socket.IO
- GIF picker (Klipy), message reactions, threaded replies, polls, chat muting
- Read receipts (basic "Seen" display)
- Presence + connection status indicator
- Media uploads — images, video, documents (up to 10 files / 25 MB per message)
- User profile (display name, avatar)
- PWA install ("Add to Home Screen")

## Active development

- Typing indicators — named, animated, 3-second inactivity hide
- Read receipts redesign — Sent / Received (with latency) / Read (with elapsed time)

## Planned (post-alpha)

- Push notifications (Web Push / VAPID)
- Admin suite UI
- Member directory
- Message search

---

## The 3-file rule
No single task may touch more than 3 files. If a feature requires more, split into multiple tasks.

---

## No scope creep
If a task requires touching files outside its scope, stop and report back before proceeding.

---

## Versioning
- `main` = v2.1.0-alpha.1 (current)
- Bump `package.json` versions at release time only
- Pre-release tag: `-alpha.N` until public release readiness is confirmed

---

## Definition of done
1. Feature works in dev server (`npm run dev`)
2. TypeScript compiles clean (`npm run typecheck`)
3. No existing tests broken (`npm run test`)
4. No files outside task scope modified
