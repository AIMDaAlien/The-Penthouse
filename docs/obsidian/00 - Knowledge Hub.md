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

## Source docs in repo

- [[../START_HERE|Start Here (non-engineer guide)]]
- [[../adr/ADR-0001-rebuild-baseline|ADR-0001 Rebuild Baseline]]
- [[../../services/api/docs/RELIABILITY_DRILL|Reliability Drill Runbook]]
- [[../../antigravity/customizations|Antigravity customizations]]

## Current status (as of 2026-03-09)

- Rebuild baseline is in place (Vue + Capacitor, Fastify + PostgreSQL, contract-first).
- Stage B/C hardening is implemented (auth, chat, tests, OpenAPI, mobile split/test harness).
- Concurrency race fixes for token rotation and message idempotency are implemented in working tree.
- User management backend foundation is locked:
  - profiles
  - member directory APIs
  - admin invite/member controls
  - moderation-aware visibility
- Member-facing user-management UI is in place.
- Live chat essentials are implemented:
  - typing indicators
  - presence badges/counts
  - per-message latency for sent messages
- Realtime hardening is implemented:
  - explicit client state machine
  - bounded degraded polling
  - socket diagnostics panel
  - API-side socket observability logs
- Remaining major unknown is Android true socket connectivity under local emulator testing. If it still refuses to connect, the next escalation is a local Caddy/TLS path instead of plain `localhost`.
