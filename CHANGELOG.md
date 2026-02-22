# Changelog

All notable changes to The Penthouse are documented in this file.

## [1.2.0] - 2026-02-22

### Added
- GitHub Release publishing in CI (`deploy-truenas` workflow) with APK asset + release notes.
- Release metadata body including APK checksum and downgrade guidance.
- Stronger release docs in `README.md` (pipeline, versioning, OTA vs APK, downgrade flow).

### Changed
- Mobile release version bumped to `1.2.0` (`mobile/app.json`, `mobile/package.json`).
- APK pipeline now tags/releases by app version (`v<expo.version>`).
- Homepage/download flow remains driven by `/api/app/update` + `/downloads/the-penthouse.apk`.

### Fixed
- Auth token invalidation behavior aligned so expired/invalid access tokens return `401` and properly trigger refresh flow.
- Refresh fallback handling hardened in mobile API client for token-expiry edge cases.
- Auth bootstrap now clears stale tokens and socket state on profile fetch failure.
- Socket disconnect banner behavior improved to avoid persistent false "server unreachable" state on transient disconnects.

### Performance
- Reduced APK payload by removing unnecessary bundled icon/font assets and unused font imports.
- Android build config remains ARM-only for release (`armeabi-v7a`, `arm64-v8a`) to avoid emulator ABI bloat.

## [1.0.0] - 2026-02-09

### Added
- Initial self-hosted release of The Penthouse backend + mobile client.
- Real-time chat, servers/channels, friend system, media sharing, voice messages, and push notifications.
- Landing page and APK delivery endpoints.
