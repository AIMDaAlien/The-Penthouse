# Codex Handoff — Production Compose Fixes

**Files to edit:** `infra/compose/docker-compose.production.yml`  
**New file to create:** `infra/compose/.env.production.example`

---

## Fix A — Add `ALTCHA_HMAC_KEY` to the `api` service environment

In `docker-compose.production.yml`, the `api` service environment block is missing `ALTCHA_HMAC_KEY`.
The ALTCHA challenge endpoint (`POST /api/v1/altcha`) will crash at startup without it.

Add this line to the `api.environment` block (alongside `JWT_SECRET`):

```yaml
      ALTCHA_HMAC_KEY: ${ALTCHA_HMAC_KEY}
```

---

## Fix B — Make FCM optional (push notifications are post-MVP)

The current production compose hardcodes a Firebase service account file mount:
```yaml
      - ${FCM_SERVICE_ACCOUNT_FILE}:/run/secrets/firebase-admin.json:ro
```

If `FCM_SERVICE_ACCOUNT_FILE` is unset or points to a non-existent path, `docker compose up` fails.
Push notifications are explicitly out of scope for MVP (see root CLAUDE.md).

Change the volume mount to use `/dev/null` as a fallback:
```yaml
      - ${FCM_SERVICE_ACCOUNT_FILE:-/dev/null}:/run/secrets/firebase-admin.json:ro
```

Also remove this line from the `api.environment` block (or make it optional):
```yaml
      FCM_SERVICE_ACCOUNT_PATH: /run/secrets/firebase-admin.json
```
Replace with:
```yaml
      FCM_SERVICE_ACCOUNT_PATH: ${FCM_SERVICE_ACCOUNT_FILE:-}
```

---

## Fix C — Create `infra/compose/.env.production.example`

Create this file so the server operator knows exactly what to fill in.
This file IS committed to the repo (it's an example/template — no real secrets).

```dotenv
# ── Domains ─────────────────────────────────────────────────────────────────
ROOT_SITE_ADDRESS=penthouse.blog
API_SITE_ADDRESS=api.penthouse.blog

# ── Caddy ports ──────────────────────────────────────────────────────────────
CADDY_HTTP_PORT=80
CADDY_HTTPS_PORT=443

# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_USER=penthouse
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=penthouse

# ── API secrets ───────────────────────────────────────────────────────────────
JWT_SECRET=CHANGE_ME_AT_LEAST_32_CHARS_RANDOM
ALTCHA_HMAC_KEY=CHANGE_ME_AT_LEAST_32_CHARS_RANDOM
CORS_ORIGIN=https://penthouse.blog
UPLOAD_MAX_MB=20
ADMIN_BOOTSTRAP_USERNAME=

# ── External APIs ─────────────────────────────────────────────────────────────
GIPHY_API_KEY=H2jGWv5wskQcoU1gMU2f3YuLCYYLHqjN
KLIPY_API_KEY=

# ── TrueNAS absolute paths (adjust to your pool/dataset layout) ───────────────
TRUENAS_POSTGRES_PATH=/mnt/pool/penthouse/postgres
TRUENAS_UPLOADS_PATH=/mnt/pool/penthouse/uploads
TRUENAS_DOWNLOADS_PATH=/mnt/pool/penthouse/downloads
TRUENAS_CADDY_DATA_PATH=/mnt/pool/penthouse/caddy/data
TRUENAS_CADDY_CONFIG_PATH=/mnt/pool/penthouse/caddy/config

# ── FCM (post-MVP — leave as /dev/null until push notifications are implemented) ──
FCM_SERVICE_ACCOUNT_FILE=/dev/null
PUBLIC_DOWNLOADS_PATH=/dev/null
```

---

## Why this matters

Without Fix A: the API container starts but the `/api/v1/altcha` endpoint throws a 500 on every registration attempt.  
Without Fix B: `docker compose up` refuses to start entirely if the host path doesn't exist.  
Without Fix C: the operator has no reference for what secrets to populate.

These are the only compose-level blockers for the penthouse.blog alpha deploy.
