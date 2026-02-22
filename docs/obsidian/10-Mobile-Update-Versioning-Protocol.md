# Mobile Update + Versioning Protocol (Expo + Self-Hosted APK)

## Goal

Define a clear update model so users always see:

- when an update is available
- what changed (changelog)
- whether update is optional or mandatory

while keeping deploys automated from GitHub pushes.

## What We Implemented

### 1. Single APK Build + Deploy Pipeline

- Workflow: `.github/workflows/deploy-truenas.yml`
- On push to `main`:
  - builds Android APK with EAS
  - generates release notes from commit range
  - publishes APK to `data/downloads/the-penthouse.apk`
  - writes `data/downloads/app-update.json` with:
    - `latestVersion`
    - `notes`
    - `mandatory`
    - `minSupportedVersion`
    - `checksumSha256`

### 2. OTA Pipeline for JS/Asset Updates

- Workflow: `.github/workflows/eas-ota-update.yml`
- On push to `main` touching `mobile/**`:
  - publishes OTA update to EAS branch `preview`
  - uses generated release notes as OTA message

### 3. In-App Update Prompting

- Added update gate in root layout.
- App now checks:
  - binary update feed: `/api/app/update`
  - OTA availability: `expo-updates`
- App shows changelog modal with:
  - `Update now` action
  - `Later` for optional updates
  - forced update flow when `mandatory=true` or current version is below `minSupportedVersion`

## Can We Bypass APK Reinstall?

Short answer: not fully for binary/native updates.

- Android requires package installation for new binaries.
- You can update **in place** (no uninstall, user data preserved), but user still confirms install.
- Full silent binary replacement is generally not available for normal consumer distribution.
- OTA updates are the bypass path only for JS/assets in the same runtime.

## Versioning Rules (SemVer)

- `PATCH` (`1.2.3 -> 1.2.4`): bug fixes
- `MINOR` (`1.2.3 -> 1.3.0`): new features, backwards-compatible API behavior
- `MAJOR` (`1.2.3 -> 2.0.0`): breaking behavior/protocol/API

Operational rules:

- Use OTA for JS/asset-only changes that do not require native rebuild.
- Publish a new APK when native dependencies/config/runtime compatibility changes.
- Use `mandatory` and `minSupportedVersion` for forced upgrades.

## Important Expo Constraint

Current config uses:

- `runtimeVersion.policy = appVersion`

This means OTA updates apply only to clients on the same app version.

## Files Added/Changed In This Session

- `.github/workflows/deploy-truenas.yml`
- `.github/workflows/eas-ota-update.yml`
- `scripts/generate_release_notes.sh`
- `scripts/publish_apk.sh`
- `mobile/src/services/appUpdates.ts`
- `mobile/src/components/AppUpdateGate.tsx`
- `mobile/src/services/api.ts`
- `mobile/app/_layout.tsx`
- `mobile/eas.json`
- `DEPLOYMENT.md`

## Commits (Session)

- `eece6f2` - CI consolidation: one APK pipeline source of truth
- `6806696` - OTA workflow + in-app update prompts + changelog automation
