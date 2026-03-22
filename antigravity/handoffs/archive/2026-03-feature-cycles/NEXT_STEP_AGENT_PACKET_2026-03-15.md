# Next-Step Agent Packet

Date: `2026-03-15`
Project: `The Penthouse`
Line: local `main` tracking `origin/rebuild`

## Summary

- Project memory has been updated to reflect the latest confirmed runtime fixes.
- The next active implementation target is an `Android-first push notification slice` for real background delivery.
- Opus has already completed the architecture pass, so Opencode should now treat that diagnosis as the implementation contract.
- Use the prompts in this folder in order:
  1. `OPUS_PUSH_NOTIFICATION_DIAGNOSIS_2026-03-15.md`
  2. `OPENCODE_PUSH_NOTIFICATION_IMPLEMENTATION_2026-03-15.md`
  3. `OPUS_PUSH_NOTIFICATION_REVIEW_2026-03-15.md`

## Current confirmed wins

- Auth/layout clipping was resolved by the global box-sizing fix.
- Typing indicator is visible in runtime again.
- Presence indicators are readable again.
- Klipy inline playback works in chat again.

## Current repo facts

- Local notifications now fire immediately instead of using the fragile `Date.now() + 1` scheduling path.
- Local notifications are still limited by Android WebView suspension. They cannot be trusted for public background delivery.
- Android already conditionally applies the Google services plugin if `apps/mobile/android/app/google-services.json` exists.
- The mobile app does not yet include the Capacitor push notifications plugin.
- The backend has no push-token schema, no token routes, and no server-side push sender yet.

## Next focus

- Real background delivery for Android
- Token registration and cleanup
- Small backend push seam for new-message delivery
- Sensible suppression rules so push does not replace in-app behavior noisily

## Guardrails

- Android first
- No iOS slice in this pass
- No DMs
- No admin UI
- No broad redesign
- No backend churn beyond the minimum token + send seam
- Major behavior changes are not done until docs are updated in the same round

## Definition of success

- A logged-in Android client can register a push token with the backend.
- A backgrounded Android client can receive a push notification for a new incoming message without depending on the WebView staying alive.
- Tapping the push notification opens the app into the intended chat.
- Foreground/live-chat behavior still prefers in-app handling instead of noisy duplicate alerts.

## Manual retest after the next pass

- Token registers on login/session boot.
- Backgrounded Android receives a real push notification for a new message.
- Tapping the push notification opens the intended chat.
- Foreground active-chat behavior does not feel spammy.
- Logout clears the current device token from the backend.
