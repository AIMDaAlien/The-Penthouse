# Claude Handoff - PWA Source of Truth Frontend Update

Date: 2026-04-15
Branch: `pwa`

## Current backend/infra contract

The public install policy now comes from:

```http
GET /api/v1/app-distribution
```

Expected production shape:

```json
{
  "sourceOfTruth": "pwa",
  "defaultPlatform": "pwa",
  "pwa": {
    "status": "live",
    "url": "https://penthouse.blog",
    "installUrl": "https://penthouse.blog"
  },
  "legacyAndroid": {
    "status": "unavailable",
    "deprecated": true,
    "url": "https://penthouse.blog/downloads/legacy/the-penthouse.apk",
    "fileName": "the-penthouse.apk",
    "notes": "Deprecated Android APK retained only for existing installs. Use the PWA for new installs."
  }
}
```

## Frontend goal

Make the PWA the only primary install/update path. The older Android APK is legacy continuity only, and may be unavailable until the artifact is recovered.

## Concrete frontend tasks

- Remove copy or CTAs that present `/downloads/the-penthouse-rebuild.apk` as the main rebuild download.
- Treat `pwa.installUrl` as the primary CTA target.
- Show legacy Android APK only as a secondary/deprecated option when `legacyAndroid.status === "available"`.
- If `legacyAndroid.status === "unavailable"`, do not render a dead APK download button.
- Keep `/auth` and logged-in app behavior unchanged except for any install/update UI.
- Clean up the pre-auth protected calls from root load if touching the landing/auth flow:
  - current smoke sees 401/400 calls to `/api/v1/chats`, `/api/v1/chats/self` before auth.

## Infra behavior already wired

- `/downloads/the-penthouse-rebuild.apk` redirects to `/`.
- `/downloads/the-penthouse.apk` redirects to `/downloads/legacy/the-penthouse.apk`.
- The legacy APK file should live at `/mnt/Backup/penthouse-rebuild/downloads/legacy/the-penthouse.apk` if recovered.
