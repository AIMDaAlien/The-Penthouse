# Codex Handoff — Alpha Release Deploy & Production Hardening

**Date:** 2026-04-15  
**Branch:** `pwa`  
**From:** Claude (Sonnet)  
**To:** Codex (GPT)

---

## Current state

- `penthouse.blog` is live, serving the SvelteKit PWA shell
- `api.penthouse.blog` is healthy (`/health` returns OK)
- Claude has just shipped the welcome landing page on the `pwa` branch (committed and pushed)
- TypeScript is clean in `apps/web` — 0 errors

The frontend is ready. Your job is to harden production and execute the release.

---

## Your tasks (in order)

### 1. Pull and rebuild on the server

```bash
git pull origin pwa
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build
docker compose exec api npm run db:migrate
```

After rebuilding, verify:
- `curl https://api.penthouse.blog/health` → `{"status":"ok"}`
- `https://penthouse.blog` → serves the welcome landing page (not the old login screen) for unauthenticated visitors

---

### 2. Rotate production secrets (CRITICAL — do not skip)

The dev `.env` secrets must NOT be used in production. Generate fresh values:

```bash
# JWT secret (64+ random bytes, hex or base64)
openssl rand -hex 64

# ALTCHA HMAC key
openssl rand -hex 32
```

Update these in the production environment (however you manage prod env — `.env.prod`, Docker secrets, or TrueNAS env vars):
- `JWT_SECRET` → fresh value (do not reuse the dev value)
- `ALTCHA_HMAC_KEY` → fresh value

After rotating, restart the API container and verify login still works end-to-end (register a test account, log in, send a message).

---

### 3. Wire up nightly pg_dump backup

The database needs at minimum a nightly backup to an off-server location before real users are on it.

Suggested approach (cron on TrueNAS or a container):
```bash
# Example cron entry — adjust path and credentials
0 3 * * * docker compose exec -T postgres pg_dump -U penthouse penthouse | gzip > /backups/penthouse-$(date +%Y%m%d).sql.gz
```

Requirements:
- Backups go to a path that is NOT inside the Docker volume (so a container crash doesn't eat the backup)
- Retain at least 7 days of backups
- Test a restore once: `gunzip < penthouse-YYYYMMDD.sql.gz | psql -U penthouse penthouse`

---

### 4. Smoke test the full flow on production

Do this after secrets are rotated and containers are rebuilt:

1. Open `https://penthouse.blog` in a private/incognito window
2. Should land on the welcome page (dark, The Penthouse logo, "Enter the app" button)
3. Click "Enter the app" — should transition to `/auth`
4. Register a new test account
5. Log in — should land on chat list
6. Send a message in a DM (open two browser tabs, different users)
7. Reload the page — socket should reconnect (green dot within ~2s)
8. Install the PWA via "Add to Home Screen" — launch from home screen, should be fullscreen
9. Airplane mode → reopen app — should load shell, show offline error on API calls (not crash)

---

### 5. Version bump + release tag

Only after the smoke test passes:

```bash
# In root package.json
# "version": "2.1.0-alpha.0" → "2.1.0-alpha.1"

# In apps/web/package.json  
# "version": "2.1.0-alpha.0" → "2.1.0-alpha.1"

git add package.json apps/web/package.json
git commit -m "chore: release v2.1.0-alpha.1"
git tag v2.1.0-alpha.1
git push origin pwa --tags
```

---

## What Claude owns — do NOT touch

- `apps/web/` (any frontend code)
- `packages/contracts/` (without a coordination note)

If you need a contract change to support any of the above, leave a HANDOFF note in this file and Claude will pick it up.

---

## Known good state

- `apps/web` TypeScript: 0 errors, 0 warnings (450 files checked)
- `start_url: "/"` in PWA manifest is correct — the auth guard handles routing
- APK endpoint: `GET /api/v1/app-distribution` already deployed; returns `legacyAndroid.status` — the welcome page reads it dynamically
