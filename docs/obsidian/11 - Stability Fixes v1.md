# Stability Fixes v1

## Goal

Lock down the rough edges that made local Android testing feel unreliable even when the backend was mostly correct.

This slice focused on:

- session persistence across normal rebuilds
- stopping destructive tests from touching the dev database
- keeping the chat shell pinned inside the device viewport
- making media render like chat content instead of broken file links
- fixing Android soft-keyboard typing behavior
- hardening Klipy parsing so provider failures do not masquerade as empty results

## What changed

### 1. Session persistence

- Mobile auth state now uses a storage adapter instead of raw component-level `localStorage` reads.
- Native Android uses `@capacitor/preferences`.
- Web keeps `localStorage` as the fallback.
- Existing `localStorage` session keys are migrated once into native storage on mobile.
- Boot is now async and ordered:
  1. load stored user + tokens
  2. refresh if needed before showing auth
  3. only clear local session if refresh really fails

### 2. Test DB safety

- Integration test helpers now hard-refuse to run against non-test database names.
- This prevents accidental deletion of dev users/chats when running the API integration suite locally.
- Dedicated test validation was run against `penthouse_test`.

### 3. Chat layout containment

- The shell now uses `100dvh` with overflow containment.
- The message list is the scrollable region.
- Header and composer stay pinned in the chat layout.
- Width handling for action buttons and composer controls was tightened for Android device widths.

### 4. Media rendering

- Uploaded image/video metadata now carries width and height when the client can derive it.
- Chat media bubbles are bounded and proportional instead of acting like oversized file rows.
- GIF captions were removed from the in-chat rendering path.
- File attachments still keep their filename cards.
- Image and GIF bubbles now open a fullscreen modal viewer with zoom controls.

### 5. Typing correctness

- Typing state is no longer shut off just because IME composition is active.
- That was the main reason Android soft-keyboard input flickered or failed to show `is typing...`.
- Typing remains active until:
  - 5 seconds of inactivity
  - send
  - blur
  - draft cleared
  - disconnect

### 6. GIF provider hardening

- Klipy parsing now supports the current `file.url` response shape.
- Known parse failures return provider errors instead of a misleading `No GIFs found`.
- Giphy remains working through the same proxy model.

## Validation

- `npm --workspace apps/mobile run test`
- `npm --workspace apps/mobile run build`
- `npm --workspace services/api run typecheck`
- `DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse_test JWT_SECRET=integration-test-jwt-secret-long-enough npm --workspace services/api run test:integration`
- `DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse_test JWT_SECRET=integration-test-jwt-secret-long-enough npm run validate`
- `npm run scenario:test`
- `npm --workspace apps/mobile run android:prep`

## Practical lessons

- If local testing keeps “forgetting” users, check test DB isolation before blaming the mobile session layer.
- Android WebView behavior is less forgiving than desktop web for keyboard composition and storage assumptions.
- Media support becomes much easier to reason about once width/height are treated as first-class metadata.
- A fake empty GIF state is worse than an explicit provider error because it sends debugging effort in the wrong direction.

## Current residual issues (as of 2026-03-12)

- Right-edge clipping is still unresolved on narrow Android layouts.
- The restored baseline helped, but it did not fully solve narrow-width overflow.
- Notification logic exists, but it still needs a UX hardening pass.
