# Deployment Guide

This project is deployable without Expo or EAS. The mobile app is a Capacitor Android app, and the backend already has a Docker-friendly shape.

## Plain-English deployment shape

There are two separate things to ship:

1. The public site + downloads
- landing page at `penthouse.blog`
- direct Android APK downloads
- legacy fallback download
- Caddy in front for HTTPS and routing

2. The backend
- Fastify API
- PostgreSQL database
- uploaded files

3. The Android app
- build the Capacitor Android app locally
- point it at the public API URL at build time
- distribute it through Google Play internal testing first

## Recommended path

For the public site and backend, use the repo's Docker Compose stack on a small Linux VM.

Why:
- the repo already has a Compose + Caddy shape
- this is cheaper and simpler than bending the app around Expo-hosted workflows
- you keep control of PostgreSQL, uploads, APK delivery, and the Firebase server key

If you are deploying on TrueNAS specifically, use the TrueNAS override and keep the Caddy container on `9080/9443`.
That matches the older Penthouse deployment pattern and avoids clashing with the TrueNAS UI on host `80/443`.

For the Android app, use a normal Android release flow:
- set `VITE_API_URL` to the public API URL before building
- produce a release APK/AAB
- upload to Google Play internal testing first

## What must exist before production

- `penthouse.blog` or another root domain for the landing/download site
- `api.penthouse.blog` or another API subdomain
- a Linux host with Docker and Docker Compose
- Firebase Android app config:
  - `apps/mobile/android/app/google-services.json`
- Firebase Admin key on the server host
- production values for:
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `CORS_ORIGIN`
  - `GIPHY_API_KEY`
  - `KLIPY_API_KEY`
  - `FCM_SERVICE_ACCOUNT_PATH`

## Backend deployment

Use:

- `infra/compose/docker-compose.production.yml`
- `infra/compose/.env.production.example`
- `infra/compose/caddy/Caddyfile.production`

### 1. Create the production env file

Copy:

```bash
cp infra/compose/.env.production.example infra/compose/.env.production
```

Then fill in the real values.

Important values:

- `ROOT_SITE_ADDRESS`
  - example: `penthouse.blog`
- `API_SITE_ADDRESS`
  - example: `api.penthouse.blog`
- `CADDY_HTTP_PORT`
- `CADDY_HTTPS_PORT`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN`
  - this should include both the public site and API origins
- `GIPHY_API_KEY`
- `KLIPY_API_KEY`
- `PUBLIC_DOWNLOADS_PATH`
  - host path containing:
    - `the-penthouse.apk`
    - `the-penthouse-rebuild.apk`
- `FCM_SERVICE_ACCOUNT_FILE`
  - host path to the Firebase Admin JSON file

### 2. Start the production stack

From the repo root:

```bash
docker compose -f infra/compose/docker-compose.production.yml --env-file infra/compose/.env.production up -d --build
```

### 3. Put both APK files on the host

Your downloads directory must contain both files:

- `the-penthouse.apk`
  - the earlier legacy APK, kept as fallback
- `the-penthouse-rebuild.apk`
  - the new rebuild APK, shown as the main download

Example:

```bash
mkdir -p /srv/penthouse/downloads
cp /path/to/legacy/the-penthouse.apk /srv/penthouse/downloads/the-penthouse.apk
cp /path/to/new/the-penthouse-rebuild.apk /srv/penthouse/downloads/the-penthouse-rebuild.apk
```

### 4. Verify the public site and API

```bash
curl https://ROOT_DOMAIN/
curl -I https://ROOT_DOMAIN/downloads/the-penthouse.apk
curl -I https://ROOT_DOMAIN/downloads/the-penthouse-rebuild.apk
curl https://API_DOMAIN/api/v1/health
```

You should see:

- the rebuild landing page at the root domain
- both APK files downloadable
- healthy API response from the API domain

### 5. Run the release gate before treating the deploy as real

With a working production-like database URL available in your shell:

```bash
npm run validate
npm run scenario:test
DATABASE_URL=postgresql://... npm run release:gate -- --require-db
```

## Android app release prep

This app does not use Expo Go. That is a good thing here.

For release builds, the app must talk to the public API, not `localhost`.

### 1. Set the public API base

Before building the mobile app:

```bash
export VITE_API_URL="https://api.penthouse.blog"
```

### 2. Sync Android assets

```bash
npm --workspace apps/mobile run android:prep
```

### 3. Build a release artifact

Use Android Studio for the final signed build, or Gradle if your signing config is already set up.

Recommended release path:
- open `apps/mobile/android` in Android Studio
- generate a signed bundle / APK
- upload to Google Play internal testing first

### Signing setup

This repo now supports two non-secret ways to provide signing values:

1. environment variables
2. a local `apps/mobile/android/keystore.properties` file

Expected keys:

- `PENTHOUSE_UPLOAD_STORE_FILE`
- `PENTHOUSE_UPLOAD_STORE_PASSWORD`
- `PENTHOUSE_UPLOAD_KEY_ALIAS`
- `PENTHOUSE_UPLOAD_KEY_PASSWORD`

If those values are missing, the release build still works, but it produces an unsigned APK.

Example `keystore.properties`:

```properties
PENTHOUSE_UPLOAD_STORE_FILE=/full/path/to/penthouse-release.jks
PENTHOUSE_UPLOAD_STORE_PASSWORD=change_me
PENTHOUSE_UPLOAD_KEY_ALIAS=penthouse
PENTHOUSE_UPLOAD_KEY_PASSWORD=change_me
```

Example signing-key creation:

```bash
keytool -genkey -v \
  -keystore /full/path/to/penthouse-release.jks \
  -alias penthouse \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Back that keystore up somewhere safe outside the repo immediately. Losing it means future Android updates cannot be signed with the same identity.

### Current Android release baseline

The rebuild Android app now uses:

- `versionCode 100`
- `versionName 2.0.0-alpha.1`

That is the baseline for the first public rebuild release, instead of the default Capacitor `1 / 1.0`.

## Firebase notes

Push notifications require both sides:

1. Android app config
- `apps/mobile/android/app/google-services.json`

2. Backend server key
- mounted into the API container
- exposed to the API as `FCM_SERVICE_ACCOUNT_PATH`

If either side is missing, push will not work.

## Public site message

The landing page should plainly tell people:

- this is the rebuilt version of the currently hosted app
- reliability and working behavior were prioritized first
- visual/design matching is still being refined
- the legacy APK is still available as fallback

## First rollout recommendation

Do not jump straight to public release.

Use this order:

1. Google Play internal testing
2. small closed test group
3. one more regression sweep against the live backend
4. then wider rollout

## Known current boundary

- Android push is now the real notification path
- Google Play services are required for this Firebase-based Android push implementation
- AOSP-only emulator images are not the right push-validation target
- the root site serves the rebuild page and both APK download links
- the legacy APK should stay available even after the rebuild becomes the main public version
