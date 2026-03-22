# Opus Prompt: Android-First Push Notification Diagnosis

Claude Opus 4.6, do a bounded diagnosis and implementation-shaping pass for an Android-first push notification slice in The Penthouse.

## Project context

- Mobile-first chat app rebuild
- Frontend: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Shared contracts in `packages/contracts`
- Public rollout is paused, but the product now needs a real path toward public-ready notifications

## What is already true

- Local notifications exist and are useful only while the app runtime is still alive.
- Android WebView suspension makes the current local-only approach unreliable for real background delivery.
- Android build files already contain conditional `google-services` plugin wiring if `google-services.json` exists.
- There is currently no push-token schema, no push-token API, no Capacitor push plugin, and no server-side push sender.

## Goal

Define the smallest safe Android-first push slice that gets the app out of the local-notification dead end without wandering into a broad notification-platform redesign.

## Scope

Focus only on:

- Android push delivery path
- client token registration and cleanup
- backend token storage
- backend push send trigger for incoming messages
- notification tap routing into the correct chat
- minimal suppression rules so push and in-app UX do not fight each other

## Do not do

- iOS
- DMs
- admin UI
- notification preferences/settings UI
- marketing rollout planning
- broad auth/session redesign

## Useful repo facts

- `apps/mobile/android/app/build.gradle` already conditionally applies `com.google.gms.google-services`
- `apps/mobile/android/app/src/main/AndroidManifest.xml` has no push service wiring yet
- `apps/mobile/package.json` has local notifications but not the Capacitor push plugin
- `services/api/src/routes/members.ts` is a likely home for authenticated device-token endpoints
- `services/api/src/db/migrations` currently has no push-token table

## What I want back

1. A decision-ready architecture for the smallest Android-first push slice
2. Exact backend additions needed:
   - DB shape
   - API endpoints
   - contracts
3. Exact mobile additions needed:
   - plugin
   - registration flow
   - open-from-notification handling
4. Safe suppression rules for v1
5. What to keep as local-only fallback behavior
6. A bounded implementation checklist only

## Important

- Keep this minimal and public-delivery focused.
- Manual runtime truth matters more than mocked tests.
- Do not prescribe iOS work in this slice.
- Do not leave the implementer with open design decisions.
