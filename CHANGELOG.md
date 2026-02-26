# Changelog

All notable changes to The Penthouse are documented in this file.

## [1.3.0] - 2026-02-26

### Added
- Web client static asset compatibility routing so Expo bundles load from both `/_expo/*` and `/expo/*` paths.
- CI deploy verification now checks actual `/app` referenced CSS/JS assets, not just route reachability.
- Secured GIF search/trending flow through backend proxy endpoints to reduce client-side key exposure.
- Server icon uploads now enforce image-only validation with a dedicated 25 MB ceiling (`SERVER_ICON_MAX_BYTES`).

### Changed
- Mobile `MessageInput` and lobby UI spacing/layout were tightened to keep controls visible and reduce crowding.
- Deploy workflow now auto-falls back to `sudo docker compose` when runner socket permissions are restricted.
- TrueNAS deploy flow now performs data-path writeability probing and uses a safe fallback path when needed.
- OTA workflow native-impact guardrail is non-fatal (it now skips OTA and defers to APK release flow).

### Fixed
- `https://penthouse.blog/app` no longer white-screens due to missing root Expo assets.
- Registration failure paths now return clearer conflict/availability errors instead of generic failure copy.
- Global API rate-limit false positives reduced by excluding `/api/auth` and `/api/health` from shared bucket pressure.
- Media/server creation rate-limit responses align to the intended user-facing copy: `Too many requests, calm down.`
- Deploy reliability improved for Docker socket permission mismatches and host data directory permission drifts.

### Ops
- Release pipeline resilience improved for transient GitHub cache failures and EAS output parsing edge cases.
- SemVer guardrails remained enforced during this release (version lock across `mobile/app.json` and `mobile/package.json`, including agent-assisted bump flow).

## [1.2.0] - 2026-02-22

### Added
- Auth screens completely redesigned with Erode serif font, periwinkle background, frosted glass buttons, and underline inputs.
- Cinematic entrance animation on login, register, and forgot-password screens — PENTHOUSE scales from oversized + blurred to final size, then form elements cascade in with spring overshoot.
- Ambient breathing orbs on auth screens — white glow circles that pulse and drift using spring-based motion, fade in after entrance completes.
- Web parallax tilt on auth screens — mouse-driven subtle rotation of the phone container with spring easing.
- Landing page overhauled: house emoji replaced with auth-style "THE PENT HOUSE" header using Erode serif, divider line, and tagline.
- Hand-crafted SVG icons replace all four feature card emojis — Glassmorphic chat bubble, Art Deco microphone, Serif Accent server column, Art Deco privacy shield.
- Animated glassmorphic navbar with four links: Changelog (GitHub Releases), Source (repo), Status (live health dot), and Docs (DEPLOYMENT.md).
- Mobile hamburger menu with animated X transform and glass dropdown.
- Live server status dot in navbar — green when `/api/health` returns OK, red when unreachable.
- OTA updates with in-app update prompts and automated changelog.
- Server member management — invite, kick, and role assignment.
- Channel update and delete operations for server owners.
- Upload disk guard to prevent storage overflow from media uploads.
- "Server unreachable" banner on mobile, triggered by both API and WebSocket checks.
- Cloudflare DDNS updater cron for handling dynamic IP changes.
- SQLite maintenance cron — WAL checkpoint and query optimizer runs on schedule.
- GitHub Release publishing in CI with APK asset, checksum, and release notes.
- Release agent protocol (`RELEASE_AGENT_PROTOCOL.md`) for consistent versioning and publishing.

### Changed
- Landing page font changed from Inter to Ubuntu for all body text.
- PENT HOUSE branding uses Erode SemiBold loaded from Fontshare CDN with self-hosted TTF fallback.
- Download button uses periwinkle gradient instead of plain background.
- APK pipeline now tags releases by app version (`v<expo.version>`) with attached APK and checksum.

### Fixed
- Auth UI: missing send button restored, usernames are now case-insensitive.
- JWT token refresh flow hardened — login retries token refresh once before signing out.
- Refresh fallback clears stale tokens and socket state on profile fetch failure.
- Socket disconnect banner no longer shows persistent false "server unreachable" on transient drops.
- Legacy database conversion properly disables foreign keys and uses temp SQLite.
- Pinned messages schema migration fixed (`chat_id` column).
- Channel update/delete API compatibility aligned with mobile client.
- Auth screen rendering: white bars eliminated, periwinkle glow blends smoothly into edges.
- Erode font loading on deployed site — added Fontshare CDN as primary source to prevent fallback to lighter Georgia.

### Performance
- APK size reduced from ~90 MB to ~32 MB by removing unused bundled icons, fonts, and emulator ABIs.
- Android builds are ARM-only for release (`armeabi-v7a`, `arm64-v8a`), cutting ~30% of unused ABI weight.
- Adopted `expo-image` for faster image loading and lower memory usage.
- FlashList optimizations for smoother chat scrolling on lower-end devices.
- Backend transaction wrapping and module-level helpers reduce per-request overhead.
- Response timing headers added for server-side performance monitoring.

### Security
- Backend authorization hardened with token rotation and strict CORS enforcement.
- Axios and tar vulnerabilities patched in mobile dependencies.
- SSH hardening helper script added for production server.
- DoS request ceilings implemented to prevent abuse.

### Ops
- Zero-downtime deploys — app-only container recreate with graceful shutdown.
- Log rotation and Docker pruning cron to prevent disk exhaustion.
- Durable SQLite database setup with proper data directory ownership.
- Server version now reported via `/api/health` endpoint.
- Caddy health-gated restart removed to avoid false restarts during deploys.
- SQLite data permissions stabilized for TrueNAS jail environment.

## [1.0.0] - 2026-02-09

### Added
- Initial self-hosted release of The Penthouse backend + mobile client.
- Real-time chat, servers/channels, friend system, media sharing, voice messages, and push notifications.
- Landing page and APK delivery endpoints.
