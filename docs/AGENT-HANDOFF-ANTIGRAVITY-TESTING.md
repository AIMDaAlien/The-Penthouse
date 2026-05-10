# Handoff: AntiGravity Browser Testing — The Penthouse v4

**Date:** 2026-05-08
**From:** Kimi K2.6 (lead orchestrator)
**To:** AntiGravity Agent (external tester)
**Goal:** Complete end-to-end browser validation of ALL remaining user flows

---

## ⚠️ CRITICAL INSTRUCTION

**Execute ALL stages below. Do NOT stop after Stage 2 (auth).**

The core value of this app is real-time messaging (Stage 3). Auth is just the gate. Your mission is to validate the entire user journey from first visit → registration → chat → messaging → settings → logout.

**Voice testing update:** E2E automated tests for voice are complete and passing (join/leave, mute/deafen sync, PTT, disconnect cleanup). Manual two-browser audio validation is **deferred** until TURN relay is implemented. Skip Stage 9 (Voice Manual) for now.

After EACH stage, fill out the test report (Section 7) and share your findings before proceeding.

---

## 1. Service Startup (Do This First)

Open three terminals and start all services:

### Terminal 1 — Database
```bash
cd /Users/aim/Documents/The-Penthouse-Kimi
npm run db:start
```

### Terminal 2 — Backend API
```bash
cd /Users/aim/Documents/The-Penthouse-Kimi/services/api
npm run migrate
npm run dev
```
Verify: `curl -s http://127.0.0.1:3000/api/v1/health | jq .` → `{"status":"ok","db":"reachable"}`

### Terminal 3 — Frontend
```bash
cd /Users/aim/Documents/The-Penthouse-Kimi/apps/web
npm run dev
```
Frontend will be on `http://localhost:5173`.

> **Note:** CAPTCHA is auto-bypassed in dev. No puzzle solving needed.

---

## 2. How to Use Playwright for Testing

Use these tools to drive the browser:

| Task | MCP Tool |
|------|----------|
| Navigate to a URL | `playwright/browser_navigate` |
| Click an element | `playwright/browser_click` |
| Fill a form field | `playwright/browser_fill_form` |
| Get accessibility tree | `playwright/browser_snapshot` |
| Take screenshot | `playwright/browser_take_screenshot` |
| Get console logs | `playwright/browser_console_messages` |
| Evaluate JS | `playwright/browser_run_code_unsafe` |

### Selector Tips
- Use **text-based selectors** when possible: `"click", {"element": "Create account"}`
- For form inputs, use `browser_fill_form` with field selectors
- Use `browser_snapshot` to see the accessibility tree and find correct selectors
- If text selectors fail, use the accessibility role + name from the snapshot

---

## 3. Test Stages (Execute ALL — Do Not Skip)

---

### Stage 1 — Static Visual & Responsive Check
**Goal:** Verify the app looks correct before any interaction.

**Steps:**
1. Navigate to `http://localhost:5173`
2. Verify redirect to `/auth` — you should see "The / PENT / HOUSE" logo
3. Take screenshot (save as `stage1-auth-desktop.png`)
4. Set viewport to mobile (375×812): use `browser_run_code_unsafe` → `window.innerWidth = 375; window.innerHeight = 812;`
5. Refresh page, take screenshot (`stage1-auth-mobile.png`)
6. Set viewport to tablet (768×1024), refresh, screenshot (`stage1-auth-tablet.png`)
7. Navigate to `/settings` while unauthenticated — verify redirect to `/auth`

**Pass Criteria:**
- [ ] Auth page renders without errors
- [ ] Logo visible on all viewport sizes
- [ ] No horizontal scroll on mobile
- [ ] Unauthenticated settings redirect works

**Report:** Fill out Stage 1 in the test report (Section 7).

---

### Stage 2 — Registration & Authentication Flow
**Goal:** Verify account creation, login, session, logout.

**Steps:**

#### 2.1 Register new user
1. Navigate to `http://localhost:5173/auth`
2. Click "Create account" tab
3. Fill form:
   - Username: `ag-test-{timestamp}` (use current epoch seconds)
   - Display name: `AntiGravity Bot`
   - Password: `TestPassword123!`
   - Confirm password: `TestPassword123!`
   - Check the alpha notice checkbox
4. Click "Create account"
5. **Expected:** Redirects to `/`, shows chat list with "General" channel

#### 2.2 Session persistence
1. Reload the page (`F5` or `browser_run_code_unsafe` → `location.reload()`)
2. **Expected:** Still on `/`, still authenticated, chat list loads

#### 2.3 Logout
1. Navigate to `/settings`
2. Find and click logout button
3. **Expected:** Redirects to `/auth`

#### 2.4 Login with existing user
1. Enter username + password from 2.1
2. Click "Sign in"
3. **Expected:** Redirects to `/`, socket connects

#### 2.5 Register duplicate (should fail)
1. Click "Create account"
2. Try to register with the SAME username from 2.1
3. **Expected:** Error message: "Username is already taken"

#### 2.6 Weak password rejection
1. Try password "short"
2. **Expected:** Submit button disabled or error message about password length

#### 2.7 CAPTCHA not visible
1. Look at registration form
2. **Expected:** No "Verify you're human" section visible

**Pass Criteria:**
- [ ] 2.1 Registration succeeds → chat list
- [ ] 2.2 Session persists across reload
- [ ] 2.3 Logout works → redirect to auth
- [ ] 2.4 Login works → redirect to chat
- [ ] 2.5 Duplicate username rejected
- [ ] 2.6 Weak password rejected
- [ ] 2.7 No CAPTCHA widget in dev

**Report:** Fill out Stage 2 in the test report.

---

### Stage 3 — Chat & Messaging (CORE — DO NOT SKIP)
**Goal:** Validate real-time messaging, the app's primary feature. **This is the most important stage.**

**Setup:** You need TWO separate browser contexts (not just tabs — separate incognito windows or separate browser profiles).

**User A:** `chatter-a-{timestamp}` / `TestPassword123!`
**User B:** `chatter-b-{timestamp}` / `TestPassword123!`

#### 3.1 Both users see "General" channel
1. Register User A in Browser 1
2. Register User B in Browser 2
3. Both should land on `/` with "General" visible in chat list
4. **Expected:** Both show "General" with 0 unread

#### 3.2 User A sends a message
1. Browser 1: Click "General"
2. Wait for chat thread to load
3. Click message input field
4. Type: `Hello from AntiGravity!`
5. Press Enter or click send button
6. **Expected:** Message bubble appears with checkmark (✓)

#### 3.3 User B receives in real-time
1. Browser 2: Look at chat list (stay on `/` or open "General")
2. **Expected:** "General" shows unread badge (1) OR if already in chat, message appears instantly

#### 3.4 User B replies
1. Browser 2: Open "General"
2. Click reply arrow on User A's message
3. Type reply: `Received loud and clear!`
4. Send
5. **Expected:** Reply bar shows referenced message above new bubble

#### 3.5 Typing indicator
1. Browser 1: Click in message input, type something but DON'T send
2. Browser 2: Watch the chat header/status area
3. **Expected:** "AntiGravity Bot is typing..." appears

#### 3.6 Read receipts
1. Browser 2: Scroll to see User A's message
2. Browser 1: Look at your sent message
3. **Expected:** Read receipt avatars appear below the message

#### 3.7 React to message
1. Browser 2: Click "More" (⋯) on User A's message
2. Click a reaction emoji (e.g., ❤️)
3. **Expected:** Reaction pill appears below the message

#### 3.8 Edit message
1. Browser 1: Click "More" on your own message
2. Click "Edit"
3. Change text to: `Hello from AntiGravity! (edited)`
4. Confirm
5. **Expected:** Message updates, shows "edited" label

#### 3.9 Delete message
1. Browser 1: Click "More" on your most recent message
2. Click "Delete"
3. Confirm
4. **Expected:** Message shows "Message deleted"

#### 3.10 Send many messages rapidly
1. Browser 1: Send 10+ messages quickly
2. **Expected:** All appear in order, no duplicates, no missing messages

#### 3.11 Scroll behavior
1. Send enough messages to make the thread scrollable
2. Scroll up to middle of thread
3. Send another message from Browser 2
4. **Expected:** View stays scrolled up (does NOT jump to bottom)
5. Scroll to bottom, send another message
6. **Expected:** Auto-scrolls to show new message

**Pass Criteria:**
- [ ] 3.1 Both users see General channel
- [ ] 3.2 Message sends successfully
- [ ] 3.3 Real-time delivery works
- [ ] 3.4 Reply functionality works
- [ ] 3.5 Typing indicator visible
- [ ] 3.6 Read receipts update
- [ ] 3.7 Reactions work
- [ ] 3.8 Edit works
- [ ] 3.9 Delete works
- [ ] 3.10 No duplicates under rapid send
- [ ] 3.11 Scroll behavior correct

**Report:** Fill out Stage 3 in the test report. Include screenshots of both browsers showing the conversation.

---

### Stage 4 — Folders & Channels
**Goal:** Verify folder and channel organization.

**Setup:** You need ONE user with multiple chats.

#### 4.1 Create a folder
1. In the chat list sidebar, click the "New Folder" button/form
2. Name it `Test Folder`
3. **Expected:** Folder appears in sidebar

#### 4.2 Move chat to folder
1. Right-click on a chat (not "General")
2. Select "Move to folder"
3. Choose `Test Folder`
4. **Expected:** Chat disappears from main list, appears inside folder

#### 4.3 Collapse/expand folder
1. Click the folder header
2. **Expected:** Folder collapses, chats hide
3. Click again
4. **Expected:** Folder expands, chats show

#### 4.4 Create a channel
1. Open "General" chat
2. Click "Create channel" in the channel list
3. Name it `random`
4. **Expected:** Channel appears in channel list below header

#### 4.5 Navigate channels
1. Click `random` channel
2. **Expected:** URL changes to `/chat/{channelId}`, thread loads
3. Send a message in the channel
4. **Expected:** Message appears, only channel members see it

#### 4.6 Channel inherits members
1. Register a new user (User C)
2. User C should see `random` channel in their General chat's channel list
3. **Expected:** User C can open `random` and send messages

**Pass Criteria:**
- [ ] 4.1 Folder creation works
- [ ] 4.2 Move to folder works
- [ ] 4.3 Collapse/expand works
- [ ] 4.4 Channel creation works
- [ ] 4.5 Channel navigation works
- [ ] 4.6 Late joiner sees channel

---

### Stage 5 — Push Notifications UI
**Goal:** Verify push permission UI flow.

**Steps:**
1. Register a fresh user
2. On the chat list page (`/`), look for a banner at the top
3. **Expected:** "Enable push notifications" banner with Allow/Dismiss buttons
4. Click "Dismiss"
5. **Expected:** Banner disappears
6. Navigate to `/settings`
7. Find Notifications section
8. Toggle push notifications ON
9. **Expected:** Toggle switches, no error
10. Toggle OFF
11. **Expected:** Toggle switches back

**Pass Criteria:**
- [ ] Banner appears for new user
- [ ] Dismiss works
- [ ] Settings toggle works both ways

**Report:** Fill out Stage 5.

---

### Stage 6 — Offline & Resilience
**Goal:** Test the app when the API goes down.

**Steps:**

#### 6.1 Offline fallback page
1. Navigate to `http://localhost:5173` (logged in)
2. Open DevTools → Network tab
3. Set network to "Offline"
4. Refresh page
5. **Expected:** Shows branded offline page with "You are offline" message
6. Set network back to "No throttling"

#### 6.2 Message queue while offline
1. In a chat thread, turn network OFF
2. Type and send a message
3. **Expected:** Message appears in thread (optimistic), may show pending state
4. Turn network back ON
5. Wait 3-5 seconds
6. **Expected:** Message delivers, pending indicator disappears

#### 6.3 Socket reconnect
1. Watch the socket status dot in the top bar
2. Kill the backend API (`Ctrl+C` in Terminal 2)
3. **Expected:** Status dot turns red/yellow, shows "degraded" or "failed"
4. Restart backend: `cd services/api && npm run dev`
5. **Expected:** Status dot turns green, socket reconnects

#### 6.4 Page reload mid-chat
1. In a chat thread with messages loaded
2. Reload page
3. **Expected:** Thread reloads, all messages reappear, socket reconnects

**Pass Criteria:**
- [ ] 6.1 Offline page renders
- [ ] 6.2 Message queues and delivers on reconnect
- [ ] 6.3 Socket status reflects backend state
- [ ] 6.4 Reload preserves chat context

**Report:** Fill out Stage 6.

---

### Stage 7 — Settings & Profile
**Goal:** Test user configuration changes.

**Steps:**
1. Navigate to `/settings` (while logged in)
2. Change display name to something new
3. Save
4. Go back to a chat
5. **Expected:** New display name appears on your messages
6. Return to settings
7. Add a bio
8. Save
9. **Expected:** Success feedback (toast or checkmark)

**Pass Criteria:**
- [ ] Display name updates in real-time
- [ ] Bio saves without error

**Report:** Fill out Stage 7.

---

### Stage 8 — Accessibility Deep Check
**Goal:** Verify keyboard-only and screen-reader usability.

**Steps:**

#### 8.1 Keyboard-only auth flow
1. Navigate to `/auth`
2. Press Tab repeatedly to navigate through the form
3. Use Enter to activate buttons
4. Complete registration without using the mouse
5. **Expected:** Full registration possible via keyboard only

#### 8.2 Keyboard-only chat
1. In a chat thread
2. Tab to message input
3. Type message, press Enter to send
4. **Expected:** Message sends

#### 8.3 ARIA labels
1. Use `browser_run_code_unsafe` to evaluate:
   ```js
   document.querySelectorAll('button[aria-label], [role="button"][aria-label]').length
   ```
2. **Expected:** Non-zero count — icon buttons should have aria-labels

#### 8.4 Focus management
1. Open a message action menu (click "More")
2. Press Escape
3. **Expected:** Focus returns to the trigger button

**Pass Criteria:**
- [ ] 8.1 Keyboard auth works
- [ ] 8.2 Keyboard chat works
- [ ] 8.3 ARIA labels present
- [ ] 8.4 Focus management correct

**Report:** Fill out Stage 8.

---

### Stage 9 — Audio Messages
**Goal:** Verify audio recording UI.

**Steps:**
1. Open any chat thread
2. Look for microphone icon next to send button
3. Click microphone icon
4. **Expected:** Button changes to stop (square), recording indicator appears
5. Click stop
6. **Expected:** Audio message bubble appears with `<audio controls>` player
7. (Optional) Try clicking play on the audio player

**Pass Criteria:**
- [ ] Mic button visible
- [ ] Recording UI appears
- [ ] Audio player renders after stop

**Report:** Fill out Stage 9.

---

## 4. What You CANNOT Test (Skip These)

| Test | Why Skip |
|------|----------|
| Actual push delivery | Needs OS-level notification permission + backgrounding |
| Actual audio recording playback quality | Needs microphone permission, can't verify playback quality |
| Cross-device sync | Needs two physical devices |
| PWA install | Needs mobile device or "Add to Home Screen" UI |
| Performance under load | Needs many concurrent users |
| Voice manual two-browser audio | Deferred until TURN relay implemented |

---

## 5. Known Issues (Don't File Bugs For These)

| Issue | Status | Notes |
|-------|--------|-------|
| `usersMap` empty in read receipts | ⚠️ Expected | Read receipts show "Unknown" for now. Needs participants endpoint. |
| Native `alert()`/`prompt()` for edit/delete | ⚠️ Known | Works but poor PWA UX. Custom modal planned. |
| Virtual scrolling | ⏳ Not built | Will be needed for 1000+ messages. Not critical for MVP scale. |
| Message search | ⏳ Not built | Needs backend `tsvector` + UI. Post-MVP. |
| No TURN relay for voice | ⏳ Deferred | Symmetric NAT users can't connect. Planned for post-MVP. |

---

## 6. E2E Voice Tests Already Complete

The following voice features are covered by automated Playwright tests in `apps/web/e2e/voice.spec.ts`:
- ✅ Join/leave voice room
- ✅ Two-user peer discovery
- ✅ Mute/unmute sync
- ✅ Deafen/undeafen sync
- ✅ Push-to-talk (Spacebar)
- ✅ Disconnect cleanup

No need to manually test these. Focus on Stages 1–9 above.

---

## 7. Test Report Template (Fill This Out)

Create an artifact named `AntiGravity-Test-Report.md` and update it after each stage.

```markdown
# AntiGravity Test Report — The Penthouse v4

## Environment
- Date: [YYYY-MM-DD HH:MM]
- Frontend: http://localhost:5173
- API: http://127.0.0.1:3000 (status: [ok/down])
- Browsers: [Chrome/Firefox versions]

---

## Stage 1 — Visual/Responsive
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 1.1 | Auth redirect | [ ] | [ ] | |
| 1.2 | Mobile layout | [ ] | [ ] | |
| 1.3 | Tablet layout | [ ] | [ ] | |
| 1.4 | Desktop layout | [ ] | [ ] | |
| 1.5 | Settings redirect | [ ] | [ ] | |

**Screenshots:** [attach]

---

## Stage 2 — Auth
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 2.1 | Register new user | [ ] | [ ] | Username used: |
| 2.2 | Session persistence | [ ] | [ ] | |
| 2.3 | Logout | [ ] | [ ] | |
| 2.4 | Login | [ ] | [ ] | |
| 2.5 | Duplicate user | [ ] | [ ] | |
| 2.6 | Weak password | [ ] | [ ] | |
| 2.7 | No CAPTCHA | [ ] | [ ] | |

---

## Stage 3 — Chat & Messaging (CORE)
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 3.1 | General channel visible | [ ] | [ ] | |
| 3.2 | Send message | [ ] | [ ] | |
| 3.3 | Real-time receive | [ ] | [ ] | |
| 3.4 | Reply | [ ] | [ ] | |
| 3.5 | Typing indicator | [ ] | [ ] | |
| 3.6 | Read receipts | [ ] | [ ] | |
| 3.7 | Reactions | [ ] | [ ] | |
| 3.8 | Edit message | [ ] | [ ] | |
| 3.9 | Delete message | [ ] | [ ] | |
| 3.10 | Rapid send (no dupes) | [ ] | [ ] | |
| 3.11 | Scroll behavior | [ ] | [ ] | |

**Screenshots:** [attach both browser views]

---

## Stage 4 — Folders & Channels
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 4.1 | Create folder | [ ] | [ ] | |
| 4.2 | Move chat to folder | [ ] | [ ] | |
| 4.3 | Collapse/expand folder | [ ] | [ ] | |
| 4.4 | Create channel | [ ] | [ ] | |
| 4.5 | Navigate channel | [ ] | [ ] | |
| 4.6 | Channel member inheritance | [ ] | [ ] | |

---

## Stage 5 — Push UI
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 5.1 | Banner appears | [ ] | [ ] | |
| 5.2 | Dismiss works | [ ] | [ ] | |
| 5.3 | Toggle ON | [ ] | [ ] | |
| 5.4 | Toggle OFF | [ ] | [ ] | |

---

## Stage 6 — Offline/Resilience
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 6.1 | Offline page | [ ] | [ ] | |
| 6.2 | Message queue | [ ] | [ ] | |
| 6.3 | Socket reconnect | [ ] | [ ] | |
| 6.4 | Reload mid-chat | [ ] | [ ] | |

---

## Stage 7 — Settings
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 7.1 | Display name | [ ] | [ ] | |
| 7.2 | Bio | [ ] | [ ] | |

---

## Stage 8 — Accessibility
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 8.1 | Keyboard auth | [ ] | [ ] | |
| 8.2 | Keyboard chat | [ ] | [ ] | |
| 8.3 | ARIA labels | [ ] | [ ] | Count: |
| 8.4 | Focus mgmt | [ ] | [ ] | |

---

## Stage 9 — Audio Messages
| # | Test | Pass | Fail | Notes |
|---|------|:----:|:----:|-------|
| 9.1 | Mic button | [ ] | [ ] | |
| 9.2 | Recording UI | [ ] | [ ] | |
| 9.3 | Audio player | [ ] | [ ] | |

---

## Console Errors
[List any JS errors seen during testing]

## Bugs Found
1. [Description] → Severity: [blocker/major/minor] → Repro: [steps]

## Overall Assessment
- [ ] All critical paths functional
- [ ] No console errors during normal use
- [ ] Would recommend for manual QA pass
```

---

## 8. Quick Reference

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| API | `http://127.0.0.1:3000` |
| API Health | `http://127.0.0.1:3000/api/v1/health` |
| Auth | `http://localhost:5173/auth` |
| Settings | `http://localhost:5173/settings` |

**Default invite code:** `PENTHOUSE-ALPHA`
**Default password for tests:** `TestPassword123!`

---

*Start with Stage 1. Report after each stage. Prioritize Stage 3 — that's the core value. Skip Stage 9 (Voice Manual) — already covered by E2E automation.*
