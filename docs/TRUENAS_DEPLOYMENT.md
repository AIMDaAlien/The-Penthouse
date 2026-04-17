# TrueNAS Deployment

This rebuild can use the same broad shape as your old TrueNAS setup:

- repo clone on a dataset
- Docker Compose stack
- Caddy in front
- app/API on port `3000`

The two real differences from the old branch are:

1. the rebuild needs PostgreSQL
2. push notifications need a Firebase Admin key on the server
3. the public site now serves the PWA as the default and keeps APKs under legacy downloads only if recovered

## What carried over from the old setup

The old main-branch repo at `/Users/aim/Documents/Private Social Media Test` used:

- a Compose stack
- Caddy as the edge proxy
- app service on `3000`
- TrueNAS dataset paths under `/mnt/Storage_Pool/...`

That means you do not need a brand new deployment model. You can reuse the same TrueNAS pattern.

## Recommended TrueNAS paths

Keep the rebuild in its own dataset tree so it does not collide with the old app:

- app root: `/mnt/Backup/penthouse-rebuild/app`
- postgres data: `/mnt/Backup/penthouse-rebuild/postgres`
- uploads: `/mnt/Backup/penthouse-rebuild/uploads`
- downloads: `/mnt/Backup/penthouse-rebuild/downloads`
- caddy data: `/mnt/Backup/penthouse-rebuild/caddy-data`
- caddy config: `/mnt/Backup/penthouse-rebuild/caddy-config`
- firebase key: `/mnt/Backup/penthouse-rebuild/secrets/firebase-admin.json`

On TrueNAS itself, the rebuild Caddy container should follow the same host-port shape as the old live stack:

- host `9080` -> container `80`
- host `9443` -> container `443`

This avoids fighting the TrueNAS UI, which already owns host `80/443`.

## Files to use

- base stack: `infra/compose/docker-compose.production.yml`
- TrueNAS override: `infra/compose/docker-compose.truenas.yml`
- TrueNAS env template: `infra/compose/.env.truenas.example`
- Caddy config: `infra/compose/caddy/Caddyfile.production`

## One-time setup on TrueNAS

SSH into the box and create the dataset folders:

```bash
mkdir -p /mnt/Backup/penthouse-rebuild/{app,postgres,uploads,downloads/legacy,caddy-data,caddy-config,secrets}
```

Clone the repo:

```bash
cd /mnt/Backup/penthouse-rebuild
git clone <YOUR_REPO_URL> app
cd app
```

Create the env file:

```bash
cp infra/compose/.env.truenas.example infra/compose/.env.truenas
chmod 600 infra/compose/.env.truenas
```

Then fill in the real values:

- `ROOT_SITE_ADDRESS`
- `API_SITE_ADDRESS`
- `CADDY_HTTP_PORT`
- `CADDY_HTTPS_PORT`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `PUBLIC_APP_URL`
- `LEGACY_APK_DOWNLOAD_PATH`
- `LEGACY_APK_STATUS`
- `GIPHY_API_KEY`
- `KLIPY_API_KEY`
- `TRUENAS_DOWNLOADS_PATH`
- `FCM_SERVICE_ACCOUNT_FILE`

Copy the Firebase Admin JSON file into the secrets path named in `.env.truenas`.

## Put legacy APKs in the legacy downloads directory

The PWA is now the source of truth. New users should open `https://penthouse.blog/`; they should not be sent to a rebuild APK.

If the older Android APK is recovered, place it here:

- `/mnt/Backup/penthouse-rebuild/downloads/legacy/the-penthouse.apk`
  - deprecated Android APK, kept only for existing installs

If your old live deployment already has the legacy APK, copy it forward without renaming it:

```bash
cp /mnt/Storage_Pool/penthouse/data/downloads/the-penthouse.apk \
  /mnt/Backup/penthouse-rebuild/downloads/legacy/the-penthouse.apk
```

Then set this in `infra/compose/.env`:

```bash
LEGACY_APK_STATUS=available
```

Keep `LEGACY_APK_STATUS=unavailable` while the file is missing. The old `/downloads/the-penthouse.apk` URL redirects to the legacy path. The old `/downloads/the-penthouse-rebuild.apk` URL redirects to `/`.

## Start the stack

From the repo root on TrueNAS:

```bash
docker compose \
  -f infra/compose/docker-compose.production.yml \
  -f infra/compose/docker-compose.truenas.yml \
  --env-file infra/compose/.env.truenas \
  up -d --build
```

On a normal TrueNAS install, the public Caddy container will bind to `9080/9443`, not directly to `80/443`.
That matches the old Penthouse deployment shape and keeps the rebuild isolated from the TrueNAS host UI.

### Internal preview option

If you want the rebuild running beside the old live branch before public cutover, use the preview override instead.

This exposes the API directly on `http://YOUR_TRUENAS_IP:3001` and keeps `caddy` out of the way.

```bash
docker compose \
  -f infra/compose/docker-compose.production.yml \
  -f infra/compose/docker-compose.truenas.yml \
  -f infra/compose/docker-compose.truenas.preview.yml \
  --env-file infra/compose/.env.truenas \
  up -d --build
```

## Health checks

Check the containers:

```bash
docker compose \
  -f infra/compose/docker-compose.production.yml \
  -f infra/compose/docker-compose.truenas.yml \
  --env-file infra/compose/.env.truenas \
  ps
```

Check the API internally:

```bash
docker compose \
  -f infra/compose/docker-compose.production.yml \
  -f infra/compose/docker-compose.truenas.yml \
  --env-file infra/compose/.env.truenas \
  exec -T api wget -q --spider http://localhost:3000/api/v1/health && echo ok
```

Check externally:

```bash
curl -fsSL https://penthouse.blog/
curl -fsSL https://api.penthouse.blog/api/v1/app-distribution
curl -fsSL https://api.penthouse.blog/api/v1/health
curl -I https://penthouse.blog/downloads/the-penthouse-rebuild.apk
```

If you are testing directly against the TrueNAS host before public DNS/routing is switched, use the mapped host ports:

```bash
curl -H 'Host: penthouse.blog' http://YOUR_TRUENAS_IP:9080/
curl -H 'Host: api.penthouse.blog' http://YOUR_TRUENAS_IP:9080/api/v1/app-distribution
curl -H 'Host: api.penthouse.blog' http://YOUR_TRUENAS_IP:9080/api/v1/health
```

For the internal preview path:

```bash
curl -fsSL http://YOUR_TRUENAS_IP:3001/api/v1/health
```

## What is different from the old branch

- old branch had one app container; rebuild has `postgres`, `api`, and `caddy`
- old branch stored app data in one bind mount; rebuild splits DB and uploads cleanly
- rebuild push notifications require:
  - `apps/mobile/android/app/google-services.json` when building Android
  - Firebase Admin JSON on the server host

## Mobile build note

For release builds, the Android app must point to the public API:

```bash
export VITE_API_URL="https://api.penthouse.blog"
npm --workspace apps/mobile run android:prep
```

Then provide Android signing values either through environment variables or a local `apps/mobile/android/keystore.properties` file.

Expected keys:

- `PENTHOUSE_UPLOAD_STORE_FILE`
- `PENTHOUSE_UPLOAD_STORE_PASSWORD`
- `PENTHOUSE_UPLOAD_KEY_ALIAS`
- `PENTHOUSE_UPLOAD_KEY_PASSWORD`

If those are not present, the release build will still complete, but the output will remain unsigned and should not be published.

Only build a signed APK/AAB if Android legacy continuity is explicitly needed. The PWA remains the default public release surface.

The rebuild Android baseline is now:

- `versionCode 100`
- `versionName 2.0.0-alpha.1`

## Plain verdict

Yes, you can run this on your TrueNAS box without starting from scratch again.

Reuse the old model:

- same TrueNAS host
- same Caddy edge idea
- same repo-on-dataset pattern

Add the rebuild-specific pieces:

- PostgreSQL persistence
- Firebase Admin key
- public API URL for Android release builds
- a public downloads directory that can hold recovered legacy APKs under `downloads/legacy/`
