---
tags: [penthouse, v4, deployment, env]
created: 2026-05-10
---

# V4 Deployment Changes

## Required env updates

Set these in production:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `PUBLIC_APP_URL`
- `GIPHY_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Optional but supported:

- `UPLOAD_DIR`
- `MAX_FILE_SIZE_MB`
- `UPLOAD_MAX_MB`
- `TEST_ACCOUNT_NOTICE_VERSION`
- `LEGACY_APK_DOWNLOAD_PATH`
- `LEGACY_APK_STATUS`
- `DISABLE_RATE_LIMIT`

`MAX_FILE_SIZE_MB` and `UPLOAD_MAX_MB` both work. This is deliberate compatibility with v4 source and v3 deployment templates.

## Docker build

The API Dockerfile builds the contracts package first, then the API package:

```bash
docker build -f services/api/Dockerfile .
```

## Compose shape

Keep using:

- `infra/docker-compose.yml` for local Postgres and test Postgres
- `infra/compose/docker-compose.yml` for local full-stack Compose
- `infra/compose/docker-compose.production.yml` for production
- `infra/compose/docker-compose.truenas.yml` for TrueNAS bind mounts

## Public behavior

The PWA remains the source of truth. `GET /api/v1/app-distribution` reports the PWA install URL and only treats Android APKs as deprecated legacy continuity.
