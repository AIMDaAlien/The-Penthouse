# The Penthouse

A private, self-hosted social platform built for close friends.

It ships as an Android APK with a web landing page at `https://penthouse.blog`, a real-time API/WebSocket backend, and an Expo mobile client.

## What this app does

- Real-time messaging (DMs, group chat, servers, channels)
- Friend system (requests, accept/decline, block)
- Voice messages and media sharing
- GIF/sticker integrations (GIPHY + Klipy)
- Push notifications
- Password reset flow
- In-app update prompts with changelog notes
- Self-hosted deployment with hardened backend defaults

## Architecture at a glance

- `mobile/`: Expo + React Native app (Android APK + OTA support)
- `server/`: Express + Socket.IO API, auth, media, friends, server/channel routes
- `server/public/`: landing page served at `https://penthouse.blog`
- `data/downloads/`: published APK + update manifest used by `/api/app/update`

## Release and update pipeline

### APK build + deploy (main pipeline)

Workflow: `.github/workflows/deploy-truenas.yml`

On every push to `main` (or manual dispatch):

1. Generate release notes from commit range.
2. Build Android APK with EAS (`preview` profile).
3. Upload APK as CI artifact.
4. Publish/update GitHub Release with:
   - version tag `v<expo.version>`
   - APK asset
   - release notes
5. Deploy to TrueNAS host:
   - publish APK to `data/downloads/the-penthouse.apk`
   - regenerate `data/downloads/app-update.json`
   - rebuild/restart app container
   - health-check `/api/health` and APK URL

### OTA updates (JS/assets only)

Workflow: `.github/workflows/eas-ota-update.yml`

- Runs on `main` pushes that touch `mobile/**`
- Publishes OTA update to EAS branch `preview`
- Uses generated release notes as OTA message

### Do users need to reinstall APK every time?

- Native/binary changes: users install newer APK (in-place update, no uninstall required).
- JS/assets-only changes in same runtime: OTA can update without APK reinstall.
- This repo uses `runtimeVersion.policy = appVersion`, so bumping app version creates a new runtime and requires a new APK.

## Versioning protocol

Use SemVer and bump `mobile/app.json -> expo.version` for each significant release.

- PATCH (`1.0.0 -> 1.0.1`): fixes/perf/security improvements
- MINOR (`1.0.0 -> 1.1.0`): new backward-compatible features
- MAJOR (`1.0.0 -> 2.0.0`): breaking changes

For significant updates, publish a new APK and GitHub Release.

## GitHub Releases + downgrade path

Each release publishes an APK asset so users can roll back if needed.

- Latest stable download: `https://penthouse.blog/downloads/the-penthouse.apk`
- Historical versions: GitHub Releases page

Downgrade flow:

1. Open the Releases page.
2. Download desired older APK asset.
3. Install over current app (Android may ask for confirmation).

## Quick start (local)

### Prereqs

- Node.js 18+
- npm

### Server

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Server default: `http://localhost:3000`

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Production deployment

See `DEPLOYMENT.md` for TrueNAS, Caddy, DNS/failover, backup, and runner setup.

## Testing

```bash
cd server
npm test
```

```bash
cd mobile
npx tsc --noEmit
```

## Changelog

Release history is tracked in `CHANGELOG.md`.
