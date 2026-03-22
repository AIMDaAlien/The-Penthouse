---
tags: [penthouse, mvp, stability, backend-first, obsidian]
created: 2026-03-12
---

# MVP Stability Plan v2

## Summary

The rebuild is now live publicly. The strategy has shifted from "make the rebuild viable" to "expand the admin/operator surface carefully without reopening core reliability risk."

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

Status: largely complete

Owner: Opus

- Restore visual stability across:
  - auth
  - chat
  - directory
  - settings/profile
  - forced-password gate
- Current recovery pass restored runtime typing, presence, and Klipy inline playback after Android emulator confirmation.
- Harden local-notification UX around strict read visibility.
- Admin/operator UI now has a read-only server summary panel for app health, member counts, content counts, invite state, and push configuration counts.
- Member-facing notification controls now exist in Settings for this-device push, previews, quiet hours, and local toast suppression.
- Member-facing media controls now exist in Settings for GIF animation and reduced data mode, and the Klipy picker follows those local preferences.
- Member-facing session/device management now exists in Settings for reviewing active sessions and revoking other devices cleanly.
- Use screenshot-guided restoration toward the main-branch feel.
- Do not change backend contracts in this phase unless a real blocker appears.

Working prompt:

- `antigravity/handoffs/OPUS_PHASE3_UI_RECOVERY_PROMPT.md`

## Phase 4 - Admin/operator depth

Status: in progress

- Balanced Admin Suite v1 is now complete in code:
  - reversible message hide / restore
  - required moderation reasons
  - member tombstones
  - admin audit visibility of original content plus moderation metadata
  - expanded read-only operator diagnostics
- Ops hardening v2 now extends that operator surface with:
  - truthful build/runtime metadata
  - uploads/storage diagnostics
  - push since-start counters
  - bounded 5xx summaries
  - optional backup status from a real file source
- Small hardening cleanup pass completed on top of Ops v2:
  - push warning logs redact raw FCM tokens
  - upload diagnostics use a capped scan instead of an unbounded walk
  - malformed backup-status files fall back cleanly
  - direct tests now cover the malformed-backup path and the real 5xx response hook
- The next work is expanding moderation and server-management depth without adding remote-control operations too early.

## Current status

- Backend notice-gating is implemented.
- Mobile/client notice UX is implemented.
- Android push is now proven on Google Play-backed runtime paths.
- The rebuild is live publicly on `penthouse.blog` / `api.penthouse.blog`.
- Admin/operator slices now in place:
  - user management
  - read-only server/operator summary
  - message moderation with realtime tombstones
- Invite and onboarding controls v1 now in place:
  - multi-invite management (create, list, revoke with labels and limits)
  - registration mode toggle (invite_only / closed)
  - dedicated admin Invites tab
  - AuthPanel reflects closed mode
- The main remaining operational hardening work is now:
  - strict DB release gate rerun
  - deeper moderation/operator follow-up slices
