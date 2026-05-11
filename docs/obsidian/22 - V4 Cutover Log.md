---
tags: [penthouse, v4, cutover, release]
created: 2026-05-10
---

# V4 Cutover Log

## Source overwritten

The incumbent repo was cut over by replacing:

- `apps/web/`
- `services/api/`
- `packages/contracts/`

Generated output, local env files, dependency folders, and transient test artifacts were excluded from the copy.

## Preserved from v3

- `infra/compose/`
- `infra/docker-compose.yml`
- `services/api/Dockerfile`
- `services/api/.env.example`
- `services/api/docs/`
- `scripts/`
- `antigravity/`
- `docs/DEPLOYMENT.md`
- `docs/TRUENAS_DEPLOYMENT.md`
- `docs/INTERNAL_TESTING.md`
- `docs/obsidian/`
- `.claude/`
- `.codex/`
- root operational artifacts such as `CLAUDE.md`, `HANDOFF_E2E_TESTING.md`, and `QA_REPORT.md`

## Cutover adjustments

- Root version is `4.0.0-alpha.1`.
- npm remains the package manager because the incumbent root package and lockfile were already npm-based.
- Stale `pnpm-workspace.yaml` was removed.
- `GIPHY_API_KEY` now comes from env.
- `GET /api/v1/app-distribution` was preserved for deployment clients.
- API tests now target the v3 test database on `localhost:5433`.

## Still beta/post-alpha

- Voice chat is scaffolded, not alpha release scope.
- Android APK work is preserved as scripts, but not promoted as the v4 alpha install path.
