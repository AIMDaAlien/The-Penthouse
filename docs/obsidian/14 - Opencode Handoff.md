---
tags: [penthouse, handoff, opencode, obsidian, historical]
created: 2026-03-12
archived: 2026-03-22
---

# Opencode Handoff (Historical)

> **This note is a historical snapshot from the internal-rollout period (2026-03-12).**
> It should not be treated as current execution guidance.
> Current project-memory entry points are `docs/obsidian/00 - Knowledge Hub.md` and `antigravity/handoffs/README.md`.

## What the project is

- Mobile-first app rebuild
- `Vue 3 + Vite + Capacitor`
- `Fastify + PostgreSQL`
- shared contracts in `packages/contracts`
- Android-first internal testing

## What had been built at the time of this handoff

- invite auth + refresh rotation
- shared General chat
- realtime hardening with bounded degraded polling
- user management backend + member UI
- media upload/rendering + Giphy/Klipy
- strict read receipts + local notifications
- backend test-account acknowledgement gating

## What was still incomplete at the time

> All items below have since been resolved. See [[13 - MVP Stability Plan v2]] and [[00 - Knowledge Hub]] for current state.

- local notifications needed UX hardening
- strict read logic needed more validation around background/live-bottom behavior
- mobile UI recovery was incomplete; right-edge clipping remained
- test-account acknowledgement existed on the backend only; mobile register/ack flow had not been wired
- the mobile register flow still used the old payload (no `acceptTestNotice` / `testNoticeVersion`)

## Source-of-truth docs referenced at the time

- `docs/START_HERE.md`
- `docs/INTERNAL_TESTING.md`
- `docs/BACKEND_READINESS_MVP_V2.md`
- `docs/obsidian/00 - Knowledge Hub.md`
- `antigravity/handoffs/archive/2026-03-internal-rollout/OPUS_PHASE3_UI_RECOVERY_PROMPT.md`
- `antigravity/handoffs/archive/2026-03-internal-rollout/OPUS_BACKEND_REVIEW_PROMPT_PHASE1_2.md`

## Operating rules at the time

- Public rollout was paused.
- Backend work was Codex-owned.
- All non-backend work for the current cycle was delegated to Opus.
- Gemini was paused unless explicitly re-enabled.
