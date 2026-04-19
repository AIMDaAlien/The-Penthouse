---
tags: [penthouse, mvp, stability, backend-first, obsidian]
created: 2026-03-12
---

# MVP Stability Plan v2

## Summary

The rebuild is now live publicly. The strategy has shifted from "make the rebuild viable" to "expand the admin/operator surface carefully without reopening core reliability risk."

This phase also carries the current delegation model:

- Codex owns backend/contracts/tests/release gate
- Codex acts as validating manager and overall planner
- Claude owns frontend implementation in `apps/web/`
- Gemini is currently used for member-facing editorial-luxury visual ideation and design critique
- Claude Opus 4.7 is consulted for major second takes on architecture, security/privacy, release strategy, or broad frontend rewrites

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

Historical prompt:

- `antigravity/handoffs/archive/2026-03-internal-rollout/OPUS_PHASE3_UI_RECOVERY_PROMPT.md`

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
- The PWA root and API are live on TrueNAS at `https://penthouse.blog/` and `https://api.penthouse.blog/api/v1/health`, and the auth page loads in a headless browser smoke.
- TrueNAS deployment storage was cut over from offline `Storage_Pool` paths to `/mnt/Backup/penthouse-rebuild` on 2026-04-15.
- The PWA is now the public source of truth and default install/update path.
- The current alpha release tag is `v2.1.0-alpha.1`.
- `GET /api/v1/app-distribution` exposes that policy for frontend and client consumers.
- APKs are legacy-only: `/downloads/the-penthouse-rebuild.apk` redirects to `/`, and `/downloads/the-penthouse.apk` redirects to `/downloads/legacy/the-penthouse.apk`.
- Legacy APK status remains unavailable until an older APK is recovered under `/mnt/Backup/penthouse-rebuild/downloads/legacy/`.
- Production alpha smoke passed on 2026-04-15:
  - browser/PWA smoke verified `/welcome`, `/auth`, manifest, service-worker control, and offline shell rendering for `/welcome` and `/`
  - backend smoke registered two fresh users, created a DM, sent a message, and read it back through `https://api.penthouse.blog`
- Production `JWT_SECRET` and `ALTCHA_HMAC_KEY` were rotated during the alpha deploy, so old sessions were intentionally invalidated.
- Nightly PostgreSQL dumps now run through TrueNAS cron job `1` at 03:00, with dumps under `/mnt/Backup/penthouse-rebuild/backups/postgres/`; restore was tested successfully.
- TrueNAS stack watchdog tooling now exists for public uptime recovery: `scripts/truenas-stack-watchdog.sh --boot` is intended for post-init reboot recovery, `--once` is intended for one-minute cron recovery, and failure reports identify cases like missing Docker overlay2 layers under `/mnt/.ix-apps/docker/overlay2`.
- Known frontend follow-up: the welcome page still loads Erode from a third-party font CDN that returned HTTP 500 during smoke. It falls back, but the dependency should be removed or self-hosted.
- Tier A DM enhancements are integrated and locally runtime-proven as of 2026-04-19:
  - message editing
  - delete-for-everyone tombstones
  - voice-note upload/render
  - starred messages
  - archive conversations by real pointer click
  - direct hard-load `/chat/:id`
- Known frontend follow-up: the chat thread direct-load fix works, but still logs a Vite eager-fetch SSR warning. Claude should move the chat-page API calls behind a browser-only/on-mount boundary or into proper route load plumbing.
- Manual mobile Add-to-Home-Screen proof is still pending.
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
