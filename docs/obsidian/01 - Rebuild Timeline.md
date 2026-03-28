---
tags: [penthouse, timeline, changelog, rebuild]
created: 2026-03-05
---

# Rebuild Timeline

## Why this rebuild exists

The previous iteration accumulated too many intertwined changes. Fixing one thing broke another.  
The rebuild goal is stability first, with a strict order of implementation to prevent future cleanup pain.

## Locked baseline

- Mobile app: Vue 3 + Vite + Capacitor (Android-first)
- Backend: Fastify + PostgreSQL
- Shared contracts: `packages/contracts`
- Process: verify-first evidence, serial gated workflow, explicit owner/reviewer/arbiter

## Timeline of concrete progress

### 2026-03-04 - Stage B/C backend hardening

Commit: `18fc1aa`  
Highlights:
- Added integration tests for auth rotation/logout and chat authorization/idempotency.
- Normalized refresh error messages to avoid token lifecycle leakage.
- Filled OpenAPI spec from stub to full contract coverage.

### 2026-03-04 - Mobile app decomposition

Commit: `93ca6f1`  
Highlights:
- Split monolithic `App.vue` into focused components:
  - `AuthPanel`
  - `ChatListPanel`
  - `MessageList`
  - `MessageComposer`
  - `ConnectionStatus`
- Added mobile-first responsive behavior and clearer chat UI states.

### 2026-03-04 - Mobile review fixes

Commit: `8e38ee2`  
Highlights:
- Socket auth now reads token dynamically on reconnect.
- Re-join chat room on reconnect.
- Queue flush no longer blocks on one failed item.
- Removed dead code/CSS.

### 2026-03-05 - Test harness maturity

Commit: `ca53a8f`  
Highlights:
- Migrated UI tests to Vitest + happy-dom.
- Added optimistic-message flow tests in `App.test.ts`.
- Landed 17 passing mobile tests.

### 2026-03-05 - Race hardening pass (working tree)

Current uncommitted hardening pass:
- Atomic refresh rotation to prevent concurrent replay minting multiple refresh tokens.
- Atomic message idempotency handling for REST and Socket paths using conflict-safe insert.
- Added concurrent regression tests for both cases.
- Added safe parsing for stored user data to prevent boot crash on corrupt localStorage.

### 2026-03-08 - User management backend foundation

Current working tree:
- Added user profile fields, roles, statuses, avatar linkage, and forced-password-change support.
- Added member self-service APIs for profile update, password change, and recovery code rotation.
- Added member directory APIs.
- Added admin backend APIs for invite rotation, member search, remove, ban, temp password, and chat audit history.
- Tightened auth so protected requests reload live user state from the database.
- Added integration coverage for admin bootstrap, invite rotation, temp-password flow, access revocation, and moderation-hidden messages.

### 2026-03-09 - Realtime hardening

Highlights:
- Replaced boolean-only socket status with an explicit realtime state machine.
- Added bounded degraded polling for the active chat only.
- Added Android-focused socket diagnostics and API-side observability logs.
- Hardened Socket.IO path/origin handling for Capacitor and emulator testing.

### 2026-03-09 - Media integration

Highlights:
- Added image, video, file, and GIF message support.
- Wired uploads through the API and normalized media metadata.
- Added Giphy/Klipy picker support and fullscreen media viewing.

### 2026-03-10 - Stability Fixes v1

Highlights:
- Split mobile session persistence into native/web storage adapters.
- Added test DB safety checks to prevent destructive local integration mistakes.
- Tightened chat viewport containment and Android IME handling.
- Hardened Klipy parsing and error handling.

### 2026-03-11 - Native notifications + strict read receipts

Highlights:
- Added Capacitor local notifications for unread messages outside the active live chat.
- Tightened `seen` so it only advances when the receiver is in-app, in-chat, and at the live bottom.
- Stopped launcher/background state from counting as read.

### 2026-03-12 - MVP Stability Plan v2 backend hardening

Current working tree:
- Contracts updated for versioned test-account acknowledgement.
- Migration `007` added for notice acceptance persistence.
- Backend notice-gating is complete across register, auth payloads, protected-route gating, and socket auth.
- Backend regression coverage expanded for notice-version mismatch and acknowledgement flows.
- Rollout is paused pending UI recovery and client-side notice UX wiring.

### 2026-03-15 - Runtime UI recovery follow-up

Current working tree:
- Typing was already wired end-to-end, but the indicator lived inside the scroll container and was clipped below the viewport in real chats.
- Directory presence looked missing in runtime because offline users rendered no marker at all; the directory now always shows a presence dot.
- Klipy inline chat rendering was using the preview asset instead of the animated asset; inline playback now follows the animated URL.
- The typing event contract now accepts nullable `displayName` values so valid typing events are not dropped for users without a display name.
- Two-emulator Android retesting confirmed typing, presence, and Klipy inline playback are restored in runtime.

### 2026-03-19 - Push proof + public rollout staging

Current working tree:
- Android push is now proven on Google Play-backed emulator/runtime paths:
  - background push works
  - killed-app push works
  - push tap-through opens the correct chat
  - logout cleanup still holds
- The failed push investigation ended with two environment truths:
  - AOSP-only emulator images are not the right target for Firebase push validation
  - the backend must actually start with the Firebase Admin key configured or FCM silently becomes a no-op
- Public rollout support was added and staged:
  - rebuild landing page
  - legacy fallback page
  - separate rebuild APK path
  - preserved legacy APK path
- TrueNAS staging now runs beside the old live app before public cutover.
- Android release readiness moved forward:
  - release build baseline bumped to `versionCode 100`
  - `versionName` set to `2.0.0-alpha.1`
  - optional signing scaffold added
  - fresh signing key created outside the repo
  - signed rebuild APK produced and copied to the TrueNAS rebuild downloads directory

### 2026-03-28 - Public site refresh

Highlights:
- Redesigned the staged rebuild landing page to match the mobile app's visual identity.
- Logo treatment aligned with the app auth screen: "The" in periwinkle Erode 300, "PENT HOUSE" in light Erode 300.
- Typography standardized: Ubuntu (body), JetBrains Mono (technical labels), Erode (logo only).
- Palette pulled from the mobile app's CSS variables (`--bg-base`, `--action-primary`, `--text-secondary`, etc.) for coherence.
- Buttons changed from gradient fills to frosted glass periwinkle with backdrop-filter.
- Added glassmorphic cards for testing scope and legacy fallback sections.
- Atmospheric background: radial gradient ellipses, floating orbs, grain texture overlay.
- Mobile-first responsive: 1.5x logo on phones, generous side margins, safe area insets, reduced-motion support.
- Three POC variants explored (Soft Glass, Editorial Stack, Neon Pulse); Editorial Stack chosen and refined.
- Copy updated to singular/first-person voice reflecting single-tester staged rollout.
- Both APK download paths preserved: `/downloads/the-penthouse-rebuild.apk` and `/downloads/the-penthouse.apk`.

## Where this leaves us now

- Auth, chat, media, user management, realtime hardening, and Android push foundations are present.
- Phase 1/2 backend work for MVP Stability Plan v2 is done in code.
- Strict DB release gate still needs a clean rerun in a working Docker/Postgres environment.
- The remaining launch blockers are now release signing, public cutover, and one small Klipy picker polish item.
