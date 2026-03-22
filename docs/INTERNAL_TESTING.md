# Internal Testing

This project is ready for controlled internal testing.

## Goal

Validate the first stable slice on real hardware before adding more scope:

- invite auth
- login/logout
- session survival across normal rebuilds
- shared General chat open/send/receive
- media upload and rendering
- fullscreen image/GIF viewer
- GIF picker via Giphy/Klipy
- typing indicator
- live presence badges/counts
- strict read receipts only when the latest messages are actually visible
- local native notifications for unread messages outside the active chat
- Android push notifications via FCM when Firebase is configured
- offline queue and retry
- reconnect after API/network interruption

## Android prep

From the repo root:

```bash
npm --workspace apps/mobile run android:prep
```

What it does:

- builds the Vue app
- creates the Capacitor Android project if missing
- syncs web assets into Android
- writes `apps/mobile/android/local.properties` if it can find your Android SDK
- runs `adb reverse tcp:3000 tcp:3000` for every connected emulator or USB-debug Android device

Why that matters:

- the Android app can then call the local API through `http://localhost:3000`
- this is more reliable for local testing than depending on emulator host aliases

## Debug APK build

```bash
npm --workspace apps/mobile run android:build:debug
```

Output:

- `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## Current environment requirements

- JDK 17 available
- Android SDK installed and discoverable through `ANDROID_SDK_ROOT`, `ANDROID_HOME`, or `apps/mobile/android/local.properties`
- Optional: a device or emulator visible in `adb devices`
- For Android push validation only:
  - `apps/mobile/android/app/google-services.json`
  - `services/api/.env` with `FCM_SERVICE_ACCOUNT_PATH` pointing at a Firebase service account JSON

## Preflight checks

Run these before every device test session:

1. Confirm the API is actually up:
```bash
curl http://localhost:3000/api/v1/health
```

Expected:
```json
{"status":"ok","app":"The Penthouse API", ...}
```

2. Confirm Android port reverse is active:
```bash
adb reverse --list
```

Expected:
```text
... tcp:3000 tcp:3000
```

3. If either check fails, rerun:
```bash
docker compose -f infra/compose/docker-compose.yml up -d postgres
npm --workspace services/api run dev
npm --workspace apps/mobile run android:prep
```

4. After `android:prep`, press `Run` again in Android Studio so the emulator installs the latest bundle.

5. Keep the API terminal visible during realtime testing.

Expected realtime log lines:

- success:
  - `socket handshake start`
  - `socket connected`
- auth rejection:
  - `socket auth failed: missing token`
  - `socket auth failed: invalid token`
  - `socket auth failed: account unavailable`
- transport failure:
  - `socket engine connection error`

If Android shows `Realtime offline` and the API terminal shows none of those socket lines, treat it as a path/runtime issue before debugging chat logic.

## Phase 2 manual test checklist

Use two clients:

- Android emulator + browser
- Android emulator + second emulator
- Android emulator + real Android phone

You do not need two humans. Two clients are enough.

### 1. Auth boot check

1. Open the app.
2. If you see `Network error: could not reach API at http://localhost:3000`, stop and rerun the preflight checks above.
3. Register user A with invite code `PENTHOUSE-ALPHA`.
4. Log out.
5. Log back in as user A.

Pass:

- registration succeeds
- login succeeds
- chat list loads
- after a normal rebuild/update, the user stays logged in or only needs to log back in
- re-registration is not required unless the server-side account was actually removed

Fail:

- network error
- generic auth failure
- app hangs after login

### 2. Shared General chat

1. On client 1, create or log in as user A.
2. On client 2, create or log in as user B.
3. On both clients, open `General`.
4. Send a message from client 1.
5. Confirm the message appears on client 2 without reopening the chat.
6. Reply from client 2.
7. Confirm the reply appears on client 1 without reopening the chat.

Pass:

- both users see the same `General`
- messages appear live both ways

Fail:

- users have different `General` rooms
- message only appears after reopening
- duplicate message appears

### 3. Delivery-state UI

1. Send a normal message while connected.
2. Confirm it ends in delivered state.
3. Temporarily break API or network and send another message.
4. Confirm the message shows queued or failed-retryable state.
5. Restore connectivity.
6. Confirm `Retry sends` or per-message retry works.

Pass:

- delivered message shows delivered state
- failed message is visibly retryable
- retried message delivers once

Fail:

- message stuck forever in sending
- retry does nothing
- same message appears twice

### 3b. Read receipts

1. Put client 1 in `General` and keep the message list scrolled to the bottom.
2. Send a message from client 2.
3. Confirm client 1 opening and actually viewing the latest message advances the sender to `✓✓`.
4. Repeat, but send client 1 to Android home or turn the screen off before the message arrives.
5. Confirm the sender stays at `✓` until client 1 comes back into the app and reaches the live bottom.

Pass:

- `✓✓` only appears when the receiving user is in-app, in the chat, and effectively at the latest message
- being on the launcher or with the screen off does not advance seen state

Fail:

- `✓✓` appears while the other user is backgrounded
- opening the chat but staying scrolled above the latest message still counts as seen

### 3a. Media

1. Upload an image from Android.
2. Confirm it renders inline as a bounded media bubble on both clients.
3. Tap the image and confirm the fullscreen viewer opens.
4. Use zoom in/out controls.
5. Send a GIF from Giphy.
6. Confirm the GIF renders without caption text under it.
7. Open Klipy and verify one of:
   - GIFs load correctly
   - or an explicit provider error is shown

Pass:

- uploaded images are rendered as images, not broken file rows
- image/GIF modal opens and closes cleanly
- GIF tiles appear in chat without caption text
- Klipy never fakes an empty state when the provider is actually failing

### 3c. Android notifications

1. Put client 2 on Android home with the app still installed and logged in.
2. Send a message from client 1 into `General`.
3. If Firebase is configured and the runtime is backgrounded or dead, confirm Android shows a push notification.
4. If the runtime is still alive enough to receive the socket event, a local notification may also fire as the fast fallback path.
5. Tap the notification.
6. Confirm the app opens back into `General`.

Pass:

- unread messages outside the active chat can trigger an Android notification
- tapping the notification opens the target chat

Note:

- without Firebase config, this falls back to the local-notification-only behavior
- local notifications still depend on the runtime being alive enough to receive the incoming realtime event
- true background Android delivery now depends on FCM being configured end to end

### 4. Connection badge honesty

1. With API and socket healthy, confirm the badge says `Connected`.
2. Break realtime/API connectivity while staying in the app.
3. Confirm the badge changes away from `Connected`.
4. If the device still has general network but realtime is down, confirm the badge says `Realtime offline`.
5. If the whole device is offline, confirm the badge says `Offline`.

Pass:

- badge matches actual state
- reconnect action appears when appropriate

Fail:

- badge says `Connected` while live updates are dead
- badge says `Offline` when the app can still reach the API

### 4a. Diagnostics panel

Development builds expose a small `Debug` toggle inside the connection badge.

1. Tap `Debug`.
2. Confirm the panel shows:
   - state
   - transport
   - fallback
   - last error
   - disconnect reason
   - last successful connection time
3. While both clients are healthy, confirm:
   - state = `connected`
   - transport = `polling` or `websocket`
   - fallback = `no`
4. If realtime drops, confirm:
   - state changes to `degraded` or `failed`
   - fallback = `yes` only while viewing the active chat
   - last error or disconnect reason is populated

Pass:

- diagnostics match the visible behavior
- fallback is only active in the selected chat view

Fail:

- diagnostics say `connected` while the badge or behavior contradicts it
- fallback remains active while browsing directory/settings

### 5. Typing indicator

1. Keep both clients in `General`.
2. On client 1, begin typing without sending yet.
3. Confirm client 2 shows a typing indicator with the correct display name.
4. Stop typing for around 5 seconds.
5. Confirm the indicator disappears.
6. Start typing again and then send the message.
7. Confirm the indicator clears when the message lands.

Pass:

- typing indicator appears only for the other user
- it uses the correct display name
- it clears on idle or send

Fail:

- typing indicator gets stuck
- wrong user name appears
- typing never appears until reopening the chat

### 5a. Media messages

1. In `General`, upload an image from client 1.
2. Confirm client 1 renders it immediately and client 2 receives it.
3. Upload a short video from client 2.
4. Confirm inline playback renders on both clients.
5. Upload a text file (`.txt` or `.md`).
6. Confirm it appears as a file card with filename and opens when tapped/clicked.
7. Open the GIF picker and send one GIF from `Giphy`.
8. Repeat with `Klipy`.

Pass:

- images render inline
- videos render inline with controls
- text files appear as attachments and open correctly
- GIF search/trending loads and sent GIFs render on both clients

Fail:

- upload succeeds but the message renders as blank text
- sent media only renders on the sending client
- GIF provider errors despite configured keys

### 6. Presence sync

1. Start client 1 and log in.
2. Start client 2 and log in.
3. Confirm the chat list online count reflects both connected users.
4. Open the directory on both clients.
5. Confirm both users show `Online`.
6. Close one client or disconnect it from the network.
7. Confirm the other client updates that member to `Offline`.
8. Reconnect the closed/disconnected client.
9. Confirm online count and directory badges recover.

Pass:

- newly connected clients receive the current online snapshot
- directory/profile presence does not require app restart
- online count updates after reconnect

Fail:

- a fresh client sees everyone as offline until they reconnect
- online count is obviously stale
- presence never flips back after reconnect

### 7. Reconnect after API restart

1. Keep both clients in `General`.
2. Stop the API server.
3. Confirm the badge leaves `Connected`.
4. Start the API server again.
5. Confirm the app reconnects or offers `Try reconnect`.
6. Send a message after recovery.
7. Confirm the other client receives it.

Pass:

- app recovers without full reinstall
- room membership resumes
- messages flow again

Fail:

- app never reconnects
- chat appears alive but no messages arrive
- forced logout during normal reconnect

### 8. Offline queue flow

1. Turn off the emulator/device network.
2. Send a message in `General`.
3. Confirm it moves to queued/failed state.
4. Turn network back on.
5. Confirm the app recovers and the queued message delivers once.

Pass:

- message survives the outage
- message sends once on recovery

Fail:

- queued message disappears
- queued message never retries
- recovery creates duplicates

### 9. Logout/session sanity

1. Log out from user A.
2. Log back in as user A.
3. Reopen `General`.
4. Confirm message history still loads.

Pass:

- session lifecycle works cleanly

Fail:

- forced logout loop
- history missing unexpectedly

## Quick fail log template

Copy this when something breaks:

```text
Date/Time:
Client:
Step:
Expected:
Actual:
Badge state:
Exact error text:
Was API health check passing?:
Was adb reverse active?:
Screenshot/log attached:
```

## Stop conditions

Stop the test run and log an issue if you see:

- stuck "sending" messages
- duplicate messages
- forced logout during normal reconnect
- missing messages after reconnect
- app crash on login/chat open/send
