Implement the first notification-controls slice for The Penthouse rebuild. Use this prompt as the contract. Keep scope tight and practical.

Project context
- The Penthouse rebuild is now live publicly
- Mobile: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Shared contracts in `packages/contracts`
- Android push is already working
- Settings/profile UI already exists
- Device token registration already exists

Goal
Add device-level notification controls that make the live app feel manageable day to day, without turning this into a full preferences platform.

Build this exact slice

1. Add notification controls to Settings
- Add a new member-facing notification section in Settings
- Keep it in the existing settings/profile area rather than creating a whole new app section
- The UI should feel practical, not overbuilt

2. Add these controls
- `Push on this device`
  - boolean
  - off = backend suppresses push for this device token
- `Show message previews`
  - boolean
  - off = backend push notifications use generic body text instead of message content
- `Quiet hours`
  - boolean enable/disable
  - start time
  - end time
  - device-local timezone
  - cross-midnight windows must work
- `Show in-app toasts`
  - boolean
  - local-only preference
  - off = foreground toasts are suppressed, but actual chat/message delivery still works

3. Storage model
- Backend-backed device settings:
  - store on `device_tokens`, not in a separate preferences system
- Add columns to `device_tokens` for:
  - `notifications_enabled`
  - `previews_enabled`
  - `quiet_hours_enabled`
  - `quiet_hours_start_minute`
  - `quiet_hours_end_minute`
  - `timezone`
- Local-only setting:
  - store `show in-app toasts` in the existing client-side storage layer used for mobile/web persisted session-style values

4. API/contracts
- Add a small device-notification-settings contract surface
- Recommended endpoints:
  - `GET /api/v1/me/device-notification-settings?token=...`
  - `PUT /api/v1/me/device-notification-settings`
- The update request should include:
  - `token`
  - `notificationsEnabled`
  - `previewsEnabled`
  - `quietHoursEnabled`
  - `quietHoursStartMinute`
  - `quietHoursEndMinute`
  - `timezone`
- Validation rules:
  - quiet-hours minutes are integers `0..1439`
  - if quiet hours are enabled, both start and end are required
  - start and end must not be equal
  - if quiet hours are disabled, clear stored quiet-hours values

5. Token refresh behavior
- This is an important part of the slice
- When Firebase rotates the device token, the device’s existing notification settings must carry forward
- Do not silently reset the device to defaults on token refresh
- Smallest acceptable implementation:
  - extend device-token registration so the client can pass `previousToken`
  - when a new token replaces the previous token for the same user, the backend copies notification-setting fields from the old row before it is discarded

6. Push behavior rules
- If `notificationsEnabled` is false:
  - do not send push to that token
- If quiet hours are enabled and the current local time for that device falls inside the configured window:
  - do not send push to that token
- If `previewsEnabled` is false:
  - send generic push body text instead of message content
  - keep the payload useful enough for tap-through
- Do not widen this into a per-chat mute system in this pass

7. Foreground toast behavior
- When `show in-app toasts` is false:
  - suppress foreground in-app toast rendering
  - do not affect active-chat behavior or actual message delivery
- Keep active-chat quiet behavior intact

8. UI expectations
- Include:
  - loading state
  - save/update state
  - clear labels
  - plain-language help text
- If the current device has no push token available:
  - still show the local toast control
  - show a clear, non-scary message that device push controls are unavailable until push is active on this device

9. Tests
- Backend
  - get/update device notification settings
  - non-auth or wrong-user access rejected
  - quiet-hours validation
  - quiet-hours suppression of push
  - preview-off path sends generic body text
  - notifications-enabled false suppresses push
  - token refresh preserves notification settings when `previousToken` is provided
- Frontend
  - settings load and render
  - save/update flow works
  - local toast preference persists
  - no-push-token state renders correctly
  - foreground toast suppression obeys the local setting

10. Keep scope tight
- no per-chat mute
- no multi-device management screen
- no iOS work
- no badge counts
- no sound/vibration channel controls
- no redesign of the whole settings page

Likely files
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/members.ts`
- `services/api/src/push/fcm.ts`
- `services/api/src/db/migrations/*.sql`
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/services/notifications.ts`
- `apps/mobile/src/services/sessionStorage.ts`
- `apps/mobile/src/components/ProfileSettings.vue`
- `apps/mobile/src/App.vue`
- related backend and frontend tests

Docs
- Update project memory concisely if this lands:
  - `docs/obsidian/00 - Knowledge Hub.md`
  - `docs/obsidian/12 - Native Notifications and Strict Read Receipts.md`
  - `docs/obsidian/13 - MVP Stability Plan v2.md`

Validation
- run relevant mobile tests
- run relevant backend tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`

Return
1. Root cause addressed
2. Files changed
3. API / settings shape
4. Tests updated
5. Validation results
6. Any remaining runtime risk or manual proof still worth doing
