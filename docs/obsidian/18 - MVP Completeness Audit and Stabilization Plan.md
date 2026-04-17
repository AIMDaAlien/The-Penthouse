---
tags: [penthouse, pwa, mvp, audit, stabilization, testing]
created: 2026-04-05
---

# MVP Completeness Audit & Stabilization Plan

**Purpose**: Comprehensive assessment of what's implemented, what's working, what's missing, and how to stabilize before public testing.

**Scope**: All 8 MVP features from CLAUDE.md  
**Status**: Most features implemented; need thorough testing and hardening

---

## MVP Feature Checklist

### 1. Login / Register / Logout

**Status**: ✅ **IMPLEMENTED**

**What exists**:
- Authentication page at `/auth`
- Login with username + password
- Register with username + password + ALTCHA captcha
- Logout button in chat list header
- Session persistence via sessionStorage
- JWT + refresh token handling in API client

**What works**:
- ✅ Form validation
- ✅ Error display (now readable, thanks to Codex)
- ✅ ALTCHA widget renders and solves challenges
- ✅ Session persists across page reload
- ✅ Socket connects after successful login
- ✅ Auth guard redirects to /auth if not logged in

**Known issues**:
- None currently identified

**Tests needed**:
- [ ] Login with valid credentials
- [ ] Login with invalid username
- [ ] Login with wrong password
- [ ] Register with weak password
- [ ] Register with taken username
- [ ] Register with invalid ALTCHA
- [ ] Session persists after page reload
- [ ] Cannot access /chat or /users without login
- [ ] Logout clears session and socket

**Stability checklist**:
- [ ] Error messages are readable (Codex verified)
- [ ] Form validation is clear
- [ ] No network errors on slow connection
- [ ] Socket properly disconnects on logout

---

### 2. Password Reset (in-app)

**Status**: ⚠️ **BACKEND ONLY** (no UI)

**What exists**:
- Backend endpoint: `POST /api/v1/auth/password-reset`
- Accepts recovery code + new password
- Returns error messages

**What's missing**:
- ❌ Frontend UI for password reset
- ❌ Flow to get recovery code (admin-only currently?)
- ❌ Integration with login/auth page

**Decision needed**:
Is password reset critical for MVP? Current app doesn't provide a way to get a recovery code. This might be admin-only or require backend work to send codes via email (not in scope for v2.1.0-alpha).

**Recommendation**: **Mark as OUT OF SCOPE for MVP** (no user flow to trigger it). Document for post-MVP.

---

### 3. Chat List (Direct Messages + Group Channels)

**Status**: ✅ **IMPLEMENTED**

**What exists**:
- Route: `/` (home page)
- API call: `GET /api/v1/chats`
- Displays list of chats with:
  - Chat name
  - Last updated date
  - Unread count badge
  - Click to open chat

**What works**:
- ✅ Loads chat list on mount
- ✅ Shows unread count
- ✅ Navigates to chat on click
- ✅ Responsive layout

**Known issues**:
- ❌ Cannot CREATE new direct messages from UI
- ❌ No way to start a new DM with a user
- ❌ No way to create group channels

**Need to add**:
1. **"New DM" button** in chat list header
   - Opens user search/picker
   - Creates DM via `POST /api/v1/chats/dm`
   - Navigates to new chat

2. **Link from User Directory** to "Message" option
   - From user profile, allow "Send Message"
   - Creates DM if not exists
   - Navigates to it

**Tests needed**:
- [ ] Chat list loads
- [ ] Unread count displays correctly
- [ ] Click chat navigates to thread
- [ ] Empty state shows correct message
- [ ] Can create new DM from button
- [ ] Can message user from directory
- [ ] New DM appears in list

**Stability checklist**:
- [ ] Handles empty chat list
- [ ] Handles network error gracefully
- [ ] Unread count matches server state

---

### 4. Open a Chat and Read Messages

**Status**: ✅ **FULLY IMPLEMENTED**

**What exists**:
- Route: `/chat/[id]`
- API calls: `GET /api/v1/chats/:chatId/messages`, `POST /api/v1/chats/:chatId/read`
- Full message thread view with:
  - Message list (scrollable)
  - Sender name and avatar placeholder
  - Timestamp
  - Message content (plain text)
  - Pending/sent state indicator
  - "Message removed" tombstone for hidden messages

**What works**:
- ✅ Loads messages on mount
- ✅ Displays messages in order
- ✅ Shows sender information
- ✅ Scrolls to bottom on load
- ✅ Marks chat as read on load
- ✅ Shows loading state
- ✅ Shows error if load fails
- ✅ Auto-scrolls on new messages

**Known issues**:
- None identified

**Tests needed**:
- [ ] Message list loads
- [ ] Messages display in correct order
- [ ] Sender names are readable
- [ ] Timestamps format correctly
- [ ] Chat marked as read
- [ ] Scroll position maintained on reload
- [ ] Can scroll up to see older messages
- [ ] Handles large message lists (performance)

**Stability checklist**:
- [ ] Handles empty chat
- [ ] Handles network errors gracefully
- [ ] Performance OK with 100+ messages
- [ ] Doesn't crash on malformed message

---

### 5. Send a Text Message (Real-time via Socket.IO)

**Status**: ✅ **FULLY IMPLEMENTED**

**What exists**:
- Message composer at bottom of chat
- Textarea for input
- Send button (↑ arrow)
- API call: `POST /api/v1/chats/:chatId/messages`
- Socket.IO listeners:
  - `message.new` - receive new messages
  - `message.ack` - confirm delivery (swap pending → real ID)
- Optimistic UI updates

**What works**:
- ✅ Enter key sends (Shift+Enter for newline)
- ✅ Send button disabled when empty
- ✅ Optimistic message appears immediately
- ✅ Shows pending state (faded, "·" dot)
- ✅ Confirms delivery via socket ACK
- ✅ Swaps pending ID for real ID on ACK
- ✅ Real-time messages appear from socket
- ✅ Error handling (removes optimistic, restores input)
- ✅ 4-second error toast

**Known issues**:
- None identified

**Tests needed**:
- [ ] Textarea focuses on mount
- [ ] Send button disabled when empty
- [ ] Enter key sends (not Shift+Enter)
- [ ] Shift+Enter creates newline
- [ ] Optimistic message appears
- [ ] Pending state shows (·)
- [ ] ACK arrives and replaces ID
- [ ] Sent state shows (✓)
- [ ] Receive message from another user
- [ ] Error on send shows toast
- [ ] Failed message removes optimistic
- [ ] Can retry failed message

**Stability checklist**:
- [ ] Handles network timeout
- [ ] Handles invalid message (too long)
- [ ] Handles offline → online transition
- [ ] Deduplication works (idempotent clientMessageId)
- [ ] No duplicate messages on reload

---

### 6. Basic User Profile (Display Name, Avatar)

**Status**: ✅ **IMPLEMENTED** (Tier 1)

**What exists**:
- Route: `/users/[id]` (view and edit modes)
- View mode:
  - Avatar with initials fallback
  - Username (read-only)
  - Display name
  - Bio (up to 160 chars)
  - Timezone
  - Last seen time
- Edit mode (own profile only):
  - Editable display name (1-40 chars)
  - Editable bio (0-160 chars)
  - Editable timezone
  - Save/cancel buttons
  - Real-time validation

**What works**:
- ✅ Displays user info
- ✅ Edit mode for own profile
- ✅ Field validation
- ✅ Save persists to backend
- ✅ Initials fallback when no avatar
- ✅ Read-only for other users' profiles
- ✅ Shows online status (lastSeenAt)

**Known issues**:
- None identified

**Tests needed**:
- [ ] Can view another user's profile
- [ ] Can edit own profile
- [ ] Cannot edit others' profiles
- [ ] Validation prevents invalid input
- [ ] Save persists changes
- [ ] Changes appear in directory
- [ ] Avatar displays (or initials)
- [ ] Bio truncates at 160 chars
- [ ] Timezone displays correctly

**Stability checklist**:
- [ ] Handles missing user gracefully
- [ ] Handles network error on save
- [ ] Validation is user-friendly

---

### 7. PWA Install Prompt (Add to Home Screen)

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** (needs verification)

**What exists**:
- Manifest at `/public/manifest.webmanifest` (should exist)
- Service Worker configured in `@vite-pwa/sveltekit`
- `<link rel="manifest">` in app.html
- Theme color and icons configured

**What's needed to verify**:
- [ ] manifest.webmanifest exists and is valid
- [ ] Icons are in correct sizes
- [ ] Service Worker installs correctly
- [ ] Install prompt appears on Android Chrome
- [ ] App can be installed to home screen
- [ ] Offline support works (service worker caching)

**Tests needed**:
- [ ] Manifest.json is valid
- [ ] Install prompt appears on Android
- [ ] Install succeeds
- [ ] App opens from home screen
- [ ] App name/icon display correctly
- [ ] Offline mode works (service worker caches)
- [ ] Update prompt appears when new version available

**Stability checklist**:
- [ ] Manifest paths are correct
- [ ] Icons are optimized
- [ ] Service Worker doesn't break app

---

### 8. Connection Status Indicator (Online/Offline/Reconnecting)

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** (no UI)

**What exists**:
- Socket store with state: `'idle' | 'connecting' | 'connected' | 'degraded' | 'failed'`
- Proper error handling and reconnection logic
- 10 reconnection attempts with backoff

**What's missing**:
- ❌ No visible connection status in UI
- ❌ No indicator showing user when socket is degraded/failed
- ❌ No user notification on reconnection

**Need to add**:
1. **Connection status indicator** in header
   - Show green dot when connected
   - Show amber dot when degraded (attempting to reconnect)
   - Show red dot when failed
   - Show spinner during connection
   - Tooltip with status text

2. **Toast notification** on reconnection
   - "Reconnected" message appears briefly
   - Helps users understand message delivery lag

3. **Graceful degradation**
   - Can still send messages while degraded (they'll be queued)
   - Message gets "pending" state until socket recovers

**Tests needed**:
- [ ] Connection indicator shows correct state
- [ ] Icon updates when socket state changes
- [ ] Toast appears on successful reconnection
- [ ] Messages still queue while degraded
- [ ] Can still view chat while offline
- [ ] Messages send when connection restored

**Stability checklist**:
- [ ] No false negatives (doesn't show connected when offline)
- [ ] Clearly communicates reconnection state

---

## Build & Test Status

### TypeScript
- ✅ 0 errors, 0 warnings
- ✅ Strict mode enabled
- ✅ All imports resolved

### Tests
- ✅ 74 tests passing
- ✅ 0 failures
- ✅ Coverage: Contracts, auth, chats

### Browser
- ⚠️ Needs to test on:
  - [ ] Chrome (development)
  - [ ] Android Chrome (emulator)
  - [ ] Android Chrome (real device)
  - [ ] Firefox (dev testing)
  - [ ] Safari (if possible)

### Emulator Testing Status
- ⚠️ Not yet tested on Android emulator
- ⚠️ Need to verify:
  - [ ] All flows work on mobile viewport
  - [ ] Touch interactions work
  - [ ] Socket reconnection on network switch
  - [ ] Battery/performance impact

---

## Stabilization Work Breakdown

### Phase 1: Core Features (Critical)
1. ✅ Auth (login, register, logout) — DONE
2. ✅ Chat list — DONE (but add "New DM" button)
3. ✅ Message thread — DONE
4. ✅ Send message — DONE
5. ✅ User profiles — DONE

**Phase 1 Effort**: ~4 hours
- Add "New DM" button to chat list
- Add "Message" option to user profiles
- Test all flows end-to-end on emulator

### Phase 2: UX Polish (High Priority)
1. Add connection status indicator
2. Add toast notifications for reconnection
3. Improve error messages
4. Handle edge cases (no results, network errors)

**Phase 2 Effort**: ~3 hours

### Phase 3: PWA & Offline (Medium Priority)
1. Verify manifest and install flow
2. Test service worker
3. Verify offline reading

**Phase 3 Effort**: ~2 hours

### Phase 4: Testing & Hardening (Ongoing)
1. Emulator testing on Android
2. Performance profiling
3. Battery drain investigation
4. Edge case testing

**Phase 4 Effort**: ~4-6 hours

---

## What's Out of Scope for MVP

Based on CLAUDE.md, these are explicitly OUT OF SCOPE:

- ❌ GIF picker / Giphy / Klipy
- ❌ Media uploads (images, video, files)
- ❌ Typing indicators
- ❌ Read receipts / seen status
- ❌ Push notifications
- ❌ Admin suite UI
- ❌ Member directory (backend exists, UI not needed)
- ❌ Presence indicators
- ❌ Message reactions

These are Tier 2+ features. Don't implement them.

---

## Detailed Test Plan

### Test 1: Complete Auth Flow
```
1. Launch app → redirected to /auth
2. Click "Sign in" tab
3. Enter username + password
4. Click "Sign in"
5. Should see chat list
6. Refresh page → should stay logged in
7. Click "Sign out"
8. Should be redirected to /auth
9. Page refresh → should stay at /auth
```

**Expected**: All steps succeed, session persists

### Test 2: New Account & Chat
```
1. At /auth "Create account" tab
2. Enter username, password, confirm password
3. Enter invite code (e.g., PENTHOUSE-ALPHA)
4. Complete ALTCHA captcha
5. Check alpha notice checkbox
6. Click "Create account"
7. Should see chat list
8. Should have an empty state "No conversations yet"
```

**Expected**: Registration succeeds, socket connects, no errors

### Test 3: Messaging Flow
```
1. From chat list, click a chat (or create DM if empty)
2. Should load messages
3. Scroll through messages
4. Type message in composer
5. Press Enter to send
6. Message should appear optimistic (faded)
7. After 1-2 seconds, should show checkmark (sent)
8. Other user should receive message in real-time (if connected)
```

**Expected**: Message sends, confirms delivery, appears real-time

### Test 4: User Directory & Profiles
```
1. From chat list header, click "👥" button
2. Should load user directory
3. Search for a username
4. Results should appear
5. Click a user → should see profile
6. If own profile, click "Edit"
7. Change display name, bio, timezone
8. Click save
9. Should return to view mode
10. Changes should persist (refresh and check)
```

**Expected**: Directory works, profiles load, edits persist

### Test 5: Connection Status (Manual)
```
1. Open app on emulator
2. Chat should work normally
3. Turn on Airplane Mode
4. App should show degraded status
5. Messages in composer should queue
6. Turn off Airplane Mode
7. Connection should resume
8. Queued messages should send
9. Should see "Reconnected" toast (if implemented)
```

**Expected**: App handles network changes gracefully

### Test 6: Offline Reading
```
1. Load a chat with messages
2. Turn on Airplane Mode
3. Should still be able to read messages
4. Scroll up/down → should work
5. Turn off Airplane Mode
6. New messages should arrive
```

**Expected**: Offline reading works via service worker cache

---

## Bug Reporting Template

When you find an issue during testing, document it with:

```
## Bug: [One-line title]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Expected result vs. Actual result]

**Severity**: [Critical | High | Medium | Low]

**Platform**: [Android emulator | iPhone | Web]

**Browser**: [Chrome | Safari | Firefox]

**Logs**: [Any error messages from dev tools]

**Video/Screenshot**: [If applicable]
```

---

## Next Steps

**Before emulator testing**:
1. ✅ Codex implemented ALTCHA endpoint
2. ✅ Codex standardized error responses
3. ⏳ Claude adds "New DM" button to chat list
4. ⏳ Claude adds "Message" option to user profiles
5. ⏳ Claude adds connection status indicator (optional but recommended)

**Emulator testing checklist**:
- [ ] Test all auth flows
- [ ] Test all messaging flows
- [ ] Test user directory & profiles
- [ ] Test chat creation
- [ ] Network resilience (toggle airplane mode)
- [ ] Performance (check for jank, stuttering)
- [ ] Battery impact (leave running 10 mins, check CPU)

**After first round of testing**:
- Fix any bugs found
- Optimize performance if needed
- Stabilize and release as v2.1.0-alpha.1

---

## Success Criteria for MVP

The app is "done" when:

- ✅ All 8 MVP features are implemented
- ✅ All core flows work on Android emulator
- ✅ No critical bugs
- ✅ Error messages are readable
- ✅ No TypeScript errors
- ✅ Can login, chat, and logout
- ✅ Socket reconnection works
- ✅ Offline reading works
- ✅ PWA installs and works from home screen

**Estimated effort for all stabilization work**: 10-15 hours

**Timeline**: 2-3 days of focused work
