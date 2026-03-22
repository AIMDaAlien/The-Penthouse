# Opencode Prompt: Android-First Push Notification Implementation

Use Opus's push-notification diagnosis as the contract. Do not widen the scope and do not redesign the notification system.

Project: The Penthouse  
Current line: local `main` tracking `origin/rebuild`  
Status: internal-only alpha prep moving toward public readiness

## Why this slice exists

Local notifications now fire correctly when the JS runtime is alive, but Android suspends the WebView in background. That kills Socket.IO and stops `message.new` from arriving. Public-ready background delivery therefore requires real push.

## Implement exactly this v1 slice

### Backend

1. Add migration `008_device_tokens.sql` with:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `platform TEXT NOT NULL CHECK (platform IN ('android', 'ios'))`
   - `token TEXT NOT NULL UNIQUE`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - index on `user_id`

2. Add contract schemas in `packages/contracts/src/api.ts`:
   - `RegisterDeviceTokenRequestSchema`
   - `RegisterDeviceTokenResponseSchema`
   - `UnregisterDeviceTokenRequestSchema`
   - Request shape:
     - `{ platform: 'android' | 'ios', token: string }`
   - Register response:
     - `{ id: string }`

3. Add matching OpenAPI shapes in `packages/contracts/openapi.v1.yaml`.

4. Add authenticated endpoints in `services/api/src/routes/members.ts`:
   - `PUT /api/v1/me/device-tokens`
     - idempotent register/refresh
     - same token for same user updates `updated_at`
     - if token exists for another user, reassign it cleanly
   - `DELETE /api/v1/me/device-tokens`
     - body contains `{ token }`
     - only remove if it belongs to the authenticated user
     - return `204`

5. Add `FCM_SERVICE_ACCOUNT_PATH` env support to the API config and `.env.example`.

6. Create `services/api/src/push/fcm.ts`:
   - use `firebase-admin`
   - lazy-init only when `FCM_SERVICE_ACCOUNT_PATH` is set
   - otherwise make push sending a no-op so local dev still works without Firebase
   - export `sendPushForNewMessage(chatId, senderId, payload)`

7. Wire push sending into `services/api/src/realtime/socket.ts` immediately after the existing `message.new` socket broadcast.
   - fire-and-forget only
   - push failures must never block socket delivery

8. `sendPushForNewMessage` behavior:
   - look up device tokens for members of the chat excluding the sender
   - skip users who currently have an active socket in `chat:<chatId>`
   - send FCM `notification + data` hybrid payload
   - use Android high priority
   - use `channelId: "messages"`
   - use `tag: "chat:<chatId>"` so tray entries collapse by chat
   - on `registration-token-not-registered`, delete the stale token row

### Mobile

1. Add `@capacitor-firebase/messaging` compatible with Capacitor 6.
2. Sync Android after install.
3. Use Firebase Android app id `blog.penthouse.app`.
4. Assume `apps/mobile/android/app/google-services.json` is the required manual config file.

5. Register token on login/session restore:
   - fetch FCM token
   - `PUT /api/v1/me/device-tokens { platform: 'android', token }`
   - listen for token refresh and re-register automatically

6. Unregister on logout:
   - `DELETE /api/v1/me/device-tokens { token }`
   - delete the local FCM token afterward

7. Add push open handling:
   - on notification action performed, read `chatId`
   - route into `openChat(chatId)`

8. Add foreground handling:
   - suppress system notification in foreground
   - if already viewing the exact chat, skip entirely
   - otherwise keep the existing in-app toast behavior

9. Keep the current local-notification path as a fallback/bonus when the JS runtime is still alive just after backgrounding.

## Suppression rules for v1

- Sender never gets push
- Recipient with active socket in `chat:<chatId>` does not get push
- Foreground app suppresses system push UI and uses in-app handling
- Exact live chat view suppresses notification noise entirely
- Opening a chat should still clear that chat’s tray notifications

## Do not do

- iOS
- DMs
- admin UI
- notification preferences or mute settings
- badge counts
- rich reply actions
- broad auth/session redesign
- broad lifecycle cleanup unless directly required

## Docs to update if behavior lands

- `docs/obsidian/12 - Native Notifications and Strict Read Receipts.md`
- `docs/obsidian/13 - MVP Stability Plan v2.md`
- `docs/INTERNAL_TESTING.md`
- `README.md` only if Firebase setup or env prerequisites need to be called out

## Validation

- relevant mobile tests
- relevant backend tests
- `npm run validate`
- `npm run scenario:test` if the new API seam changes end-to-end behavior
- call out manual setup needed:
  - Firebase project created
  - `google-services.json` placed in `apps/mobile/android/app/`
  - `FCM_SERVICE_ACCOUNT_PATH` set for the API

## Return

1. Files changed
2. Contracts/routes/migration added
3. Validation results
4. Manual setup still required
5. Remaining limitations in plain English
