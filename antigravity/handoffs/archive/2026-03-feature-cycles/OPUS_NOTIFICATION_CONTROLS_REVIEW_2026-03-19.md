Claude Opus 4.6, do a bounded review of the first notification-controls slice for The Penthouse rebuild after implementation lands.

Review target
- The rebuild is now the live public app
- Android push is already working
- A new member-facing notification-controls slice has been added
- This review is about correctness, privacy, and usability, not broad redesign

What to review

1. Preference correctness
- Confirm device-level preferences behave like device-level preferences
- Watch for accidental account-wide behavior where device-only behavior was intended
- Confirm token refresh does not silently reset preferences

2. Privacy and delivery behavior
- Confirm `preview off` really stops message-content leakage in push bodies
- Confirm push payloads still carry enough data for tap-through
- Confirm quiet hours and push-off settings truly suppress push for that token
- Confirm foreground toast suppression does not break message delivery

3. Gating and validation
- Review the new settings API validation:
  - token ownership
  - quiet-hours bounds
  - start/end ambiguity
  - timezone handling
- Call out any path where a user could update another device’s settings incorrectly

4. Product/operator clarity
- The settings UI should be understandable to a normal user
- Call out confusing wording, stale-state behavior, or settings that appear stronger than they really are
- Especially watch for “push unavailable” or “quiet hours active” messaging that could mislead

5. Scope discipline
- Call out drift into:
  - per-chat mute
  - multi-device management
  - iOS strategy
  - notification analytics
  - settings-page redesign

Do not do
- no push-architecture redesign
- no server-management redesign
- no broad profile/settings review beyond this slice

Files/seams to review
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/members.ts`
- `services/api/src/push/fcm.ts`
- migration adding device notification preference fields
- relevant backend tests
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/services/notifications.ts`
- `apps/mobile/src/services/sessionStorage.ts`
- `apps/mobile/src/components/ProfileSettings.vue`
- `apps/mobile/src/App.vue`
- relevant frontend tests

Return
1. Findings first, ordered by severity
2. Any missing acceptance checks
3. Any privacy-leak or stale-preference risk
4. Brief verdict: safe for real member use, or not yet
