# Unraid Deployment

Current as of 2026-05-03.

The active public Penthouse PWA/API stack now runs on Unraid after the TrueNAS drive failure.

## Host Facts

- Host: `192.168.0.120`
- Unraid OS: `7.2.4`
- Docker: `27.5.1`
- Docker Compose: `v5.0.2`
- Public domains:
  - `https://penthouse.blog/`
  - `https://api.penthouse.blog/`
- WAN IPv4 observed during deployment: `69.250.152.141`

## Paths

- App root: `/mnt/user/appdata/penthouse/app`
- Compose env: `/mnt/user/appdata/penthouse/app/infra/compose/.env.unraid`
- PostgreSQL data: `/mnt/user/appdata/penthouse/postgres`
- Uploads: `/mnt/user/appdata/penthouse/uploads`
- Downloads: `/mnt/user/appdata/penthouse/downloads`
- Legacy APK path: `/mnt/user/appdata/penthouse/downloads/legacy/the-penthouse.apk`
- Caddy data: `/mnt/user/appdata/penthouse/caddy-data`
- Caddy config: `/mnt/user/appdata/penthouse/caddy-config`
- Backups target: `/mnt/user/appdata/penthouse/backups/postgres`
- Imported TrueNAS dump: `/mnt/user/appdata/penthouse/backups/imported-truenas/penthouse-20260418-030001.sql.gz`
- Pre-restore Unraid DB dump: `/mnt/user/appdata/penthouse/backups/pre-restore/unraid-current-before-truenas-restore-20260424-234712.sql.gz`

## Start And Stop

Run from the Unraid host:

```bash
cd /mnt/user/appdata/penthouse/app/infra/compose

docker compose \
  -f docker-compose.production.yml \
  -f docker-compose.truenas.yml \
  --env-file .env.unraid \
  up -d
```

Stop:

```bash
cd /mnt/user/appdata/penthouse/app/infra/compose

docker compose \
  -f docker-compose.production.yml \
  -f docker-compose.truenas.yml \
  --env-file .env.unraid \
  down
```

Rebuild API after code changes:

```bash
cd /mnt/user/appdata/penthouse/app/infra/compose

docker compose \
  -f docker-compose.production.yml \
  -f docker-compose.truenas.yml \
  --env-file .env.unraid \
  up -d --build
```

## Ports

- Caddy container `80` maps to host `9080`.
- Caddy container `443` maps to host `9443`.
- Unraid WebGUI keeps host `80/443`.
- Public router forwarding must continue sending external `80 -> 9080` and `443 -> 9443` on `192.168.0.120`.

## Verification

```bash
curl -fsSL https://penthouse.blog/ >/dev/null
curl -fsSL https://api.penthouse.blog/api/v1/health
curl -fsSL https://api.penthouse.blog/api/v1/app-distribution
curl -I https://penthouse.blog/downloads/the-penthouse-rebuild.apk
curl -I https://penthouse.blog/downloads/the-penthouse.apk
```

Expected:

- root returns the SvelteKit PWA
- health returns `{"status":"ok","app":"The Penthouse API",...}`
- app-distribution reports `"sourceOfTruth":"pwa"`
- `/downloads/the-penthouse-rebuild.apk` redirects to `/`
- `/downloads/the-penthouse.apk` redirects to `/downloads/legacy/the-penthouse.apk`
- auth config returns `{"registrationMode":"invite_only"}`

## Restored TrueNAS Data

On 2026-04-24, the latest available TrueNAS SQL dump was restored from the local backup at `/Users/aim/Documents/penthouse-rebuild/backups/postgres/penthouse-20260418-030001.sql.gz`.

Restore facts:

- The restored dump was generated from PostgreSQL 16 and contained migrations through `022`.
- The Unraid API applied migrations `023` through `026` on startup after restore.
- Post-restore row counts were `5` users, `2` chats, `5` messages, and `26` schema migrations.
- The recovered `/Users/aim/Documents/penthouse-rebuild/uploads`, `downloads`, and `secrets` directories were empty.
- The fresh Unraid `.env.unraid` secrets were retained, so old sessions and refresh tokens should be treated as invalid even though user rows and password hashes were restored.
- The initial fresh Unraid smoke database was preserved before restore at `/mnt/user/appdata/penthouse/backups/pre-restore/unraid-current-before-truenas-restore-20260424-234712.sql.gz`.

## Current Gaps

- Web Push VAPID env scaffolding, backend foundation endpoints, and backend send pipeline exist, but browser push delivery still needs the frontend service worker/subscription UI and deployed VAPID values.
- `FCM_SERVICE_ACCOUNT_PATH` is empty; FCM push is disabled until a Firebase Admin JSON is mounted.
- Legacy APK status is `unavailable` until an older APK is recovered into the legacy downloads path.

## Backup Automation

Installed on 2026-04-29 through Unraid's persistent Dynamix custom cron file because the User Scripts plugin directory was not present on the host.

Persistent cron file:

- `/boot/config/plugins/dynamix/custom.cron`

Generated active cron entry:

- `/etc/cron.d/root`

Recommended cadence: daily at 03:00.

Installed job:

```cron
0 3 * * * PENTHOUSE_ENV_FILE=/mnt/user/appdata/penthouse/app/infra/compose/.env.unraid PENTHOUSE_BACKUP_DIR=/mnt/user/appdata/penthouse/backups/postgres PENTHOUSE_UPLOADS_DIR=/mnt/user/appdata/penthouse/uploads PENTHOUSE_UPLOADS_BACKUP_DIR=/mnt/user/appdata/penthouse/backups/uploads /bin/bash -lc '/mnt/user/appdata/penthouse/app/scripts/nightly-pg-dump.sh && /mnt/user/appdata/penthouse/app/scripts/nightly-uploads-backup.sh' >> /mnt/user/appdata/penthouse/backups/penthouse-backup.cron.log 2>&1
```

Manual scheduled-equivalent proof on 2026-04-29 passed:

- PostgreSQL dump: `/mnt/user/appdata/penthouse/backups/postgres/penthouse-20260429T151101Z.sql.gz`
- Uploads tarball: `/mnt/user/appdata/penthouse/backups/uploads/penthouse-uploads-20260429T151101Z.tar.gz`
- Both artifacts passed `gzip -t`.
- Backup status file reported `status=ok` and `lastSuccessfulBackupAt=2026-04-29T15:11:01Z`.

Equivalent manual runner:

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

export PENTHOUSE_ENV_FILE=/mnt/user/appdata/penthouse/app/infra/compose/.env.unraid
export PENTHOUSE_BACKUP_DIR=/mnt/user/appdata/penthouse/backups/postgres
export PENTHOUSE_UPLOADS_DIR=/mnt/user/appdata/penthouse/uploads
export PENTHOUSE_UPLOADS_BACKUP_DIR=/mnt/user/appdata/penthouse/backups/uploads

/mnt/user/appdata/penthouse/app/scripts/nightly-pg-dump.sh
/mnt/user/appdata/penthouse/app/scripts/nightly-uploads-backup.sh
```

PostgreSQL backups are written to:

- `/mnt/user/appdata/penthouse/backups/postgres/penthouse-*.sql.gz`

Uploads backups are written to:

- `/mnt/user/appdata/penthouse/backups/uploads/penthouse-uploads-*.tar.gz`

Both backup scripts keep 14 days by default. Override with `PENTHOUSE_BACKUP_RETENTION_DAYS` and `PENTHOUSE_UPLOADS_BACKUP_RETENTION_DAYS` if needed.

After installing the job, run it once manually and verify:

```bash
ls -lh /mnt/user/appdata/penthouse/backups/postgres/
ls -lh /mnt/user/appdata/penthouse/backups/uploads/
cat /mnt/user/appdata/penthouse/uploads/ops/backup-status.json
```

## Web Push VAPID Env

The PWA Web Push path uses VAPID keys. Set these values in `/mnt/user/appdata/penthouse/app/infra/compose/.env.unraid` before enabling browser subscription UI or validating live browser delivery:

```dotenv
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
VAPID_SUBJECT=mailto:admin@penthouse.blog
```

Generate the keypair from a trusted admin machine:

```bash
npx web-push generate-vapid-keys --json
```

The private key must stay out of tracked files and public logs.

The backend send pipeline already no-ops when VAPID is missing, so missing keys should not break normal chat delivery. Once the frontend subscription UI lands, rebuild or restart the API with these env vars present before testing real browser pushes.

## FCM Service Account Mount

Firebase push stays disabled until the Firebase Admin JSON is copied onto the Unraid host and the env file points the API at the mounted container path.

Recommended host path:

- `/mnt/user/appdata/penthouse/secrets/firebase-admin.json`

Set these values in `/mnt/user/appdata/penthouse/app/infra/compose/.env.unraid`:

```dotenv
FCM_SERVICE_ACCOUNT_FILE=/mnt/user/appdata/penthouse/secrets/firebase-admin.json
FCM_SERVICE_ACCOUNT_PATH=/run/secrets/firebase-admin.json
```

Then rebuild or restart the API stack:

```bash
cd /mnt/user/appdata/penthouse/app/infra/compose

docker compose \
  -f docker-compose.production.yml \
  -f docker-compose.truenas.yml \
  --env-file .env.unraid \
  up -d --build api
```

Do not commit the Firebase Admin JSON to the repo.
