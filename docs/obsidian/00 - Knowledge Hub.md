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
14. [[14 - Opencode Handoff]]

## Source docs in repo

- [[../START_HERE|Start Here (non-engineer guide)]]
- [[../adr/ADR-0001-rebuild-baseline|ADR-0001 Rebuild Baseline]]
- [[../BACKEND_READINESS_MVP_V2|Backend Readiness Report: MVP Stability Plan v2]]
- [[../../services/api/docs/RELIABILITY_DRILL|Reliability Drill Runbook]]
- [[../../antigravity/customizations|Antigravity customizations]]

## Current status (as of 2026-03-12)

- Rebuild baseline is in place:
  - Vue + Capacitor
  - Fastify + PostgreSQL
  - contract-first shared schemas
- User management is implemented:
  - profiles
  - member directory
  - admin invite/member controls
  - moderation-aware visibility
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
- Strict local notifications + strict read receipts are implemented in the current internal build.
- Backend-only versioned test-account acknowledgement is implemented:
  - contracts updated
  - migration `007` added
  - API/realtime gating active
- Public rollout is paused.
- All non-backend implementation for the current cycle is delegated to Opus.

## Current blockers

- Mobile UI regression and right-edge clipping are still unresolved.
- Notification/read UX still needs a hardening pass.
- Client-side test-notice acknowledgement flow is still pending.
- Strict DB release gate still needs a rerun in a working Docker/Postgres environment.
