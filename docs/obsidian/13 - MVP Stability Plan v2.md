---
tags: [penthouse, mvp, stability, backend-first, obsidian]
created: 2026-03-12
---

# MVP Stability Plan v2

## Summary

Public rollout is paused. The current strategy is backend-first completion, then UI recovery, then an internal-only alpha-readiness freeze.

This phase also carries a temporary delegation override:

- Codex owns backend/contracts/tests/release gate
- Opus owns all non-backend implementation for the current cycle
- Gemini is paused unless explicitly re-enabled

## Phase 1 - Backend-only hardening

Status: complete in code

- Added server-enforced, versioned test-account acknowledgement.
- Extended auth/session payloads with notice-gating state.
- Added `POST /api/v1/me/test-notice/ack`.
- Added backend observability for notice-gating and read-state updates.
- Locked contracts/OpenAPI before any client integration.

## Phase 2 - Backend regression proof

Status: complete in code, strict DB gate still pending environment

- Expanded automated tests for:
  - register/login/refresh with notice-version mismatch
  - blocked-until-ack behavior
  - acknowledgement idempotency
- Current status:
  - `npm run validate`: passing
  - `npm run scenario:test`: passing
  - strict DB release gate: pending clean rerun in a working Docker/Postgres environment

Primary source of truth:

- [[../BACKEND_READINESS_MVP_V2|Backend Readiness Report: MVP Stability Plan v2]]

## Phase 3 - UI recovery + notification UX hardening

Status: next active phase

Owner: Opus

- Restore visual stability across:
  - auth
  - chat
  - directory
  - settings/profile
  - forced-password gate
- Fix remaining width clipping and composer fit issues.
- Harden local-notification UX around strict read visibility.
- Use screenshot-guided restoration toward the main-branch feel.
- Do not change backend contracts in this phase unless a real blocker appears.

Working prompt:

- `antigravity/handoffs/OPUS_PHASE3_UI_RECOVERY_PROMPT.md`

## Phase 4 - Alpha-readiness freeze

Status: not started

- Re-run full validation + scenario + integration gates.
- Execute two-emulator Android manual testing end-to-end.
- Keep rollout internal/closed until UI acceptance is signed off.

## Current status

- Backend notice-gating is implemented.
- Mobile/client notice UX is not implemented yet.
- Rollout remains internal-only.
- UI recovery is the next major product task.
