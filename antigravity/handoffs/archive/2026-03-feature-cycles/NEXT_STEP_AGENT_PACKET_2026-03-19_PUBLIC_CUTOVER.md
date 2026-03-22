# Public Cutover Packet

## Current state

- The rebuild stack is staged on TrueNAS at `/mnt/Storage_Pool/penthouse-rebuild/app`.
- The rebuild public-style stack is running safely on alternate ports:
  - HTTP: `9081`
  - HTTPS: `9444`
- The old live public Penthouse stack is still separate and untouched:
  - Caddy on `9080/9443`
  - host nginx still owns real `80/443`
- The legacy APK has already been copied to:
  - `/mnt/Storage_Pool/penthouse-rebuild/downloads/the-penthouse.apk`
- The rebuild landing page, legacy page, and public Caddy/Compose files are already in the repo.
- Android push now works in manual testing when Firebase/env are configured correctly.

## Real blockers

1. The rebuild APK is still unsigned.
   - Current release output is `app-release-unsigned.apk`
   - No existing release signing key has been found
   - Public APK publishing is blocked until this is handled

2. Public TLS/cutover strategy on TrueNAS is not finalized.
   - Caddy auto-HTTPS cannot succeed while `penthouse.blog` and `api.penthouse.blog` still resolve to the old live stack
   - TrueNAS host nginx owns `80/443`
   - The likely correct path is host nginx TLS termination with proxying to the rebuild stack

## Assumption for this round

- Treat the rebuild as a fresh-install public app unless the old Android signing key is later recovered.
- Do not block this round on in-place upgrade compatibility from the old APK.

## Agent order

1. `Opencode`
   - mechanical Android release readiness
   - versioning
   - optional signing scaffold
   - docs cleanup for signed build flow

2. `Claude Opus 4.6`
   - exact TrueNAS TLS termination/cutover review
   - nginx/Caddy split
   - smallest safe path to public domain cutover

## Output goal

At the end of this round we want:

- a clean signed-build path ready in the repo
- a bumped Android version baseline
- a reviewed, concrete TrueNAS cutover plan
- no guesswork left around how `penthouse.blog` and `api.penthouse.blog` switch over
