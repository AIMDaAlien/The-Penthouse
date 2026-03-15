---
tags: [penthouse, handoff, opencode, obsidian]
created: 2026-03-12
---

# Opencode Handoff

## 1. What the project is

- Mobile-first app rebuild
- `Vue 3 + Vite + Capacitor`
- `Fastify + PostgreSQL`
- shared contracts in `packages/contracts`
- Android-first internal testing

## 2. What has already been built

- invite auth + refresh rotation
- shared General chat
- realtime hardening with bounded degraded polling
- user management backend + member UI
- media upload/rendering + Giphy/Klipy
- strict read receipts + local notifications
- backend test-account acknowledgement gating

## 3. What is implemented but still incomplete

- local notifications exist but need UX hardening
- strict read logic exists but needs more validation around background/live-bottom behavior
- mobile UI recovery is incomplete
- right-edge clipping remains
- test-account acknowledgement exists on the backend only; mobile register/ack flow still needs implementation

Important client/backend seam:

- the mobile register flow still uses the old payload
- it still needs to send `acceptTestNotice` + `testNoticeVersion`
- there is not yet a mobile acknowledgement screen/gate for version bumps

## 4. Current source-of-truth docs

Required reading:

- `docs/START_HERE.md`
- `docs/INTERNAL_TESTING.md`
- `docs/RELEASE_GATE_STAGE_E.md`
- `docs/BACKEND_READINESS_MVP_V2.md`
- `docs/obsidian/00 - Knowledge Hub.md`
- `docs/obsidian/09 - Realtime Hardening.md`
- `docs/obsidian/10 - Media Integration.md`
- `docs/obsidian/11 - Stability Fixes v1.md`
- `docs/obsidian/12 - Native Notifications and Strict Read Receipts.md`
- `antigravity/policy/delegation-policy.v1.json`
- `antigravity/customizations.md`
- `antigravity/handoffs/OPUS_PHASE3_UI_RECOVERY_PROMPT.md`
- `antigravity/handoffs/OPUS_BACKEND_REVIEW_PROMPT_PHASE1_2.md`

## 5. Current working status

- `npm run validate`: passing
- `npm run scenario:test`: passing
- strict DB release gate: not yet rerun successfully in the current environment
- worktree contains uncommitted backend/doc changes for MVP Stability Plan v2
- rollout remains internal only

## 6. Immediate next work

In order:

1. get Opus backend review on Phase 1/2
2. run strict DB release gate with Docker/Postgres available
3. execute Opus Phase 3 UI recovery + notification UX hardening
4. verify two-emulator Android behavior end-to-end
5. do not reopen public rollout until UI signoff

## 7. What Opencode should not do

- do not change backend contracts unless a real blocker appears
- do not start DMs, admin UI, or push notifications
- do not broaden the visual redesign beyond screenshot-guided restoration
- do not treat current registration failures as backend bugs until the new client notice fields are wired

## 8. Questions Opencode should check with the user

- which main-branch screenshots are the authoritative baseline for each screen
- whether the test-account notice copy/version wording should stay as-is or be revised before wiring the client gate
- whether Gemini remains paused after Opus finishes the UI recovery pass
- when Docker/Postgres is available for the strict DB gate rerun
- which screens the user cares most about matching first: auth, chat, directory, or settings

## Current operating rules

- Public rollout is paused.
- Backend work remains Codex-owned.
- All non-backend work for the current cycle is delegated to Opus.
- Use the base Antigravity policy, plus the current-cycle override documented in [[05 - Multi-Model Delegation Workflow]].

## Recommended starting point for the next agent

1. Read `docs/BACKEND_READINESS_MVP_V2.md` first.
2. Read `docs/obsidian/00 - Knowledge Hub.md` for the project-memory map.
3. Use the two Opus prompt files as the execution/review starting packet.
4. Treat the repo as **internal-only, backend-stable, UI-recovery in progress**.
