# Native Notifications and Strict Read Receipts

## What changed

- Read receipts no longer advance just because a chat is selected in app state.
- A message only becomes `seen` when the receiving user is:
  - in the app
  - on the chat screen
  - at the live bottom of the message list
- Backgrounding the app or turning the screen off no longer counts as `seen`.
- Android local notifications are now wired through Capacitor Local Notifications.
- Notifications open the app back into the relevant chat when tapped.

## Why it matters

The previous logic was too optimistic. It treated "selected chat exists in state" as equivalent to "the user actually saw the message." That was technically wrong and would produce false `✓✓` receipts.

The new rule uses the same source of truth for both unread state and seen state:

- the app must be foregrounded
- the chat must be the active screen
- the latest messages must be visible

## Current notification slice

Android now has an FCM-backed push path plus the existing local-notification fallback.

That means:

- if Firebase is configured, the backend can send Android push notifications even after the WebView stops receiving socket events
- if the app runtime is still alive enough to receive `message.new`, the existing local-notification path can still fire as a fast fallback
- foreground delivery still prefers the in-app toast path instead of noisy system notifications while the user is already in the app

This is still Android-first. iOS push is not part of this slice.

## Current status (as of 2026-03-19)

- The Android permission prompt works.
- Device tokens can now be registered to the backend for Android push delivery.
- FCM sending is lazy and no-ops unless `FCM_SERVICE_ACCOUNT_PATH` is configured on the API.
- Device-level notification controls now live in Settings:
  - push enabled/disabled for this device
  - previews enabled/disabled
  - quiet hours with timezone-aware suppression
  - local in-app toast suppression
- Local notifications still work as a belt-and-suspenders fallback while the runtime is alive enough to receive the incoming realtime event.
- Read logic is stricter now and no longer advances just because a chat is selected in app state.
- The immediate Android scheduling bug was fixed earlier by removing the near-future schedule block for incoming local notifications.
- Long-background Android delivery now depends on FCM being configured on both the backend and app build.
- Manual retesting on Google Play-backed Android now confirms:
  - background push works
  - killed-app push works
  - push tap-through opens the intended chat
  - foreground in-app notification behavior is acceptable
- AOSP-only emulator images should not be treated as push-validation evidence for this Firebase path.
- The notification slice is no longer blocked on architecture. The remaining work is public release readiness and final cutover.

## DM mute note

Direct messages now have a per-thread mute on top of the device-level controls.

- muting a DM suppresses backend push for that thread for the muted member only
- it also suppresses the in-app foreground toast and the local background fallback for that DM
- mute does not block delivery, unread counts, or chat-list updates

## Files touched

- `apps/mobile/src/App.vue`
- `apps/mobile/src/services/notifications.ts`
- `apps/mobile/src/services/http.ts`
- `apps/mobile/capacitor.config.ts`
- `services/api/src/routes/members.ts`
- `services/api/src/routes/chats.ts`
- `services/api/src/realtime/socket.ts`
- `services/api/src/push/fcm.ts`
- `docs/INTERNAL_TESTING.md`

## Validation

- mobile tests passed
- full repo validation passed
- Capacitor Android sync now needs the Firebase Messaging plugin as well
- real push proof requires:
  - Google Play-backed emulator or real Android device
  - valid `google-services.json` in the Android app
  - valid backend Firebase Admin key at runtime
