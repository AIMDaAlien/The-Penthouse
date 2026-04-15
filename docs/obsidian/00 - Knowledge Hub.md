---
tags: [penthouse, rebuild, knowledge-base, obsidian]
created: 2026-03-05
---

# The Penthouse Rebuild Knowledge Hub

This vault is the "what we built and why" map for people joining the project later.

## Read in this order

1. [[01 - Rebuild Timeline]]
2. [[02 - Architecture in Plain English]]
3. [[03 - Stability Rules (Anti-Tech-Debt)]]
4. [[04 - Reliability Fix Log]]
5. [[05 - Multi-Model Delegation Workflow]]
6. [[06 - Copyable Rebuild Checklist]]
7. [[07 - User Management Basics]]
8. [[08 - Live Chat Essentials]]
9. [[09 - Realtime Hardening]]
10. [[10 - Media Integration]]
11. [[11 - Stability Fixes v1]]
12. [[12 - Native Notifications and Strict Read Receipts]]
13. [[13 - MVP Stability Plan v2]]
14. [[14 - Opencode Handoff]] (historical snapshot)

### PWA rebuild (v2.1 — current branch)

15. [[15 - PWA Rebuild]] — why the frontend was rebuilt as a PWA and what the baseline covers
16. [[16 - Wave A - Live Chat on the PWA]] — typing indicators, presence, read receipts, GIF, muting
17. [[17 - Wave B - Rich Messaging]] — reactions, reply/quote, delete, pins, icon refresh
18. [[18 - Wave C - Community Features]] — slash commands, polls, note to self

## Source docs in repo

- [[../START_HERE|Start Here (non-engineer guide)]]
- [[../adr/ADR-0001-rebuild-baseline|ADR-0001 Rebuild Baseline]]
- [[../BACKEND_READINESS_MVP_V2|Backend Readiness Report: MVP Stability Plan v2]]
- [[../../services/api/docs/RELIABILITY_DRILL|Reliability Drill Runbook]]
- [[../../antigravity/customizations|Antigravity customizations]]

## Current status (as of 2026-03-28)

- Rebuild baseline is in place:
  - Vue + Capacitor
  - Fastify + PostgreSQL
  - contract-first shared schemas
- User management is implemented:
  - profiles
  - member directory
  - admin invite/member controls
  - admin operator summary panel
  - admin message hide / restore moderation with required reasons
  - admin chat audit visibility of original content plus latest moderation metadata
  - moderation-aware member tombstones
- Realtime hardening is implemented:
  - explicit client state machine
  - bounded degraded polling
  - socket diagnostics panel
  - API-side socket observability logs
- Media integration is implemented:
  - uploads
  - inline rendering
  - fullscreen media viewer
  - Giphy/Klipy
  - local GIF/data controls in Settings
- Recent runtime recovery wins are confirmed in emulator testing:
  - auth/layout clipping resolved by the global box-sizing fix
  - typing indicator visible in real chats again
  - presence indicators readable again
  - Klipy inline playback restored
  - Klipy picker polish now respects animation/data preferences locally
- Strict local notifications + strict read receipts are implemented in the current internal build.
- Balanced Admin Suite v1 is now implemented:
  - reversible message moderation
  - required moderation reasons
  - member tombstones instead of silent disappearance
  - expanded read-only operator diagnostics for realtime, moderation, and push settings counts
- Android push is now proven on Google Play-backed Android:
  - background push works
  - killed-app push works
  - push tap-through returns to the correct chat
  - logout cleanup holds
- Device-level notification controls now exist in Settings:
  - push on this device
  - message previews on/off
  - quiet hours
  - local in-app toast toggle
- Session and device management now exists in Settings:
  - active session list backed by refresh-token sessions
  - current session labeling
  - revoke one other session
  - revoke all other sessions
  - lightweight device labels plus push-active state per session
- Ops hardening v2 is now visible in the operator panel:
  - truthful build/runtime metadata
  - uploads directory diagnostics with unavailable fallbacks
  - push counters labeled since process start
  - bounded 5xx diagnostics by route group
  - optional backup status from a real status file when configured
  - cleanup pass applied:
    - FCM warning logs no longer print raw device tokens
    - upload scanning is now capped for operator safety
    - malformed backup-status files degrade cleanly to `unavailable`
    - the Fastify 5xx response hook now has direct test coverage
- Invite and onboarding controls v1 are now implemented:
  - multi-invite management replaces the single master invite code
  - admin can create, list, and revoke invite codes with labels and optional limits
  - registration mode toggle (invite_only / closed) controls whether new accounts can be created
  - AuthPanel reflects closed mode with a clear notice instead of the registration form
  - dedicated Invites tab in admin settings
- AOSP-only emulator images are not a valid push-proof target for this Firebase path.
- Public PWA/API rollout reached partial live status on TrueNAS as of 2026-04-14:
  - the rebuild stack originally ran under `/mnt/Storage_Pool/penthouse-rebuild/app`
  - on 2026-04-15 it was copied and cut over to `/mnt/Backup/penthouse-rebuild/app` after `Storage_Pool` went offline
  - Caddy is bound on TrueNAS host ports `9080` and `9443`
  - DNS points `penthouse.blog` and `api.penthouse.blog` at the current observed WAN IPv4 `69.250.152.141`
  - Caddy certificates were issued for both domains after restarting Caddy
  - `https://penthouse.blog/` returns HTTP 200
  - `https://api.penthouse.blog/api/v1/health` returns OK
  - current bind mounts point at `/mnt/Backup/penthouse-rebuild/{postgres,uploads,downloads,caddy-data,caddy-config}`
  - PWA is now the default install/update source of truth
  - backend distribution metadata is exposed at `/api/v1/app-distribution`
  - old APK URLs are treated as legacy: `/downloads/the-penthouse.apk` redirects to `/downloads/legacy/the-penthouse.apk`, and `/downloads/the-penthouse-rebuild.apk` redirects to `/`
  - legacy APK status remains `unavailable` until an older APK is recovered and placed under `/mnt/Backup/penthouse-rebuild/downloads/legacy/`
  - browser smoke reaches `/auth` with the sign-in UI visible
  - logged-in chat proof remains pending
  - unauthenticated browser load still produces noisy protected chat calls to `/api/v1/chats/self` and `/api/v1/chats`
- Android release signing was prepared for the earlier rebuild APK path, but APK distribution is now legacy-only:
  - fresh signing key created outside the repo
  - release baseline set to `versionCode 100`
  - any recovered APK should be treated as deprecated legacy continuity, not the default release surface
- Versioned test-account acknowledgement is implemented across backend and mobile client flow:
  - contracts updated
  - migration `007` added
  - API/realtime gating active
  - mobile register/ack flow active
- Real-device smoke proof exists for the earlier Android public-domain path, but the 2026-04-15 PWA TrueNAS cutover still needs fresh logged-in chat proof.
- Public site refresh completed:
  - landing page redesigned to match mobile app visual identity (Erode logo, Ubuntu body, JetBrains Mono technical)
  - frosted glass periwinkle palette coherent with mobile app CSS variables
  - glassmorphic cards, atmospheric background, mobile-first responsive
  - copy updated to singular first-person voice for staged single-tester rollout

## PWA rebuild status (as of 2026-04-09)

The `pwa` branch is the active development branch and public deployment target. The PWA is the canonical release surface; older Android APKs are legacy fallback only.

- PWA baseline is complete and testable in a browser
- Wave A is complete (typing, presence, read receipts, GIF, muting)
- Wave B is complete (reactions, reply/quote, delete, pins, UI polish)
- Wave C is complete (slash commands, polls, note to self)
- Remaining Wave B items still to build: image attachments, markdown rendering, message editing

## Current blockers

- Strict DB release gate still needs a rerun in a working Docker/Postgres environment.
