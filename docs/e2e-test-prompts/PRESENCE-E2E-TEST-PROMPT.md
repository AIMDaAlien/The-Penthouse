# Wave A E2E Test Prompt: Boolean Presence Indicators

**For: Gemini + Playwright**  
**Feature**: Boolean online/offline presence tracking with avatar indicator dots  
**Date**: 2026-04-06  
**Test Environment**: Local dev server (SvelteKit + Socket.IO backend)

---

## Context: The Penthouse App

### What is it?
A privacy-focused, invite-only social messaging PWA for small communities (20–200 users). Self-hosted on a personal server. Currently in v2.1.0-alpha development (SvelteKit frontend migration from Vue + Capacitor).

### Tech Stack
- **Frontend**: SvelteKit 5 with Svelte runes ($state, $derived, $effect)
- **Backend**: Fastify + PostgreSQL + Socket.IO for real-time events
- **Real-time**: Socket.IO websocket connection for presence sync
- **Auth**: JWT access tokens + opaque refresh tokens
- **Shared types**: Zod schemas in @penthouse/contracts package

### App URLs (Local Dev)
- Frontend: `http://localhost:5173` (SvelteKit dev server)
- Backend: `http://localhost:3000` (Fastify API)
- WebSocket: Connected via Socket.IO through authenticated socket

---

## Feature: Boolean Presence Tracking

### What Was Built
1. **Presence Store** (`apps/web/src/lib/stores/presence.svelte.ts`)
   - Global Svelte store that tracks:
     - Current user's online/offline state (60-second inactivity timer)
     - All users' presence status (Map<userId, isOnline: boolean>)
   - Auto-marks user offline if no activity (mousemove, keydown, touchstart) for 60 seconds
   - Emits `presence.update` socket event to server on state change
   - Listens to `presence.sync` event (full user map on connect) and `presence.update` (live changes)

2. **Avatar Component** (`apps/web/src/lib/components/Avatar.svelte`)
   - Reusable component that displays:
     - User avatar (image URL or initials from displayName)
     - Green presence indicator dot (bottom-right of avatar) if user is online
   - Sizes: sm (32px), md (48px), lg (64px)
   - Reads online status from global `presenceStore.userPresenceMap`
   - Props:
     - `userId: string` — key to look up in presence map
     - `displayName: string` — shown as tooltip and used for initials
     - `avatarUrl?: string | null` — optional image URL
     - `size?: 'sm' | 'md' | 'lg'` — avatar size (default: md)
     - `showPresence?: boolean` — toggle indicator visibility (default: true)

3. **Chat List Integration** (`apps/web/src/routes/+page.svelte`)
   - Each DM row displays Avatar component before chat name
   - Avatar shows counterpart's presence status
   - DM search modal also displays Avatar for each search result
   - Data source: `chat.counterpartMemberId` and `chat.counterpartAvatarUrl` from ChatSummary

4. **Chat Header Integration** (`apps/web/src/routes/chat/[id]/+page.svelte`)
   - Chat header shows Avatar of the counterpart (DMs only)
   - Fetches `counterpartMemberId` and `counterpartAvatarUrl` from chat summary on load
   - Shows presence indicator with online/offline status

5. **Global Socket Listener Setup** (`apps/web/src/routes/+layout.svelte`)
   - Root layout initializes presence socket listeners when socket connects
   - Listeners are set up once and available to entire app
   - Updates `presenceStore.userPresenceMap` reactively

### Backend (Already Verified)
- `services/api/src/realtime/socket.ts`: Emits `presence.update` and `presence.sync` events
  - `presence.sync` payload: `{ [userId]: boolean }` map sent on new connection
  - `presence.update` payload: `{ userId, online, timestamp }` broadcast on changes
- `services/api/src/utils/presence.ts`: Tracks presence state per user
- `services/api/src/routes/presence.ts`: Optional GET /api/v1/presence endpoint returns presence map
- Auto-offline: Server marks users offline after 10s of socket inactivity

---

## Test Scenarios

### Scenario 1: Single User Presence (Self)
**Objective**: Verify that current user's presence indicator appears and disappears correctly.

**Setup**:
1. Start dev server: `npm run dev` (both frontend and backend running)
2. Have backend ready: should already be running on port 3000
3. Open one browser tab (call it Tab A)

**Test Steps**:
1. Navigate to `http://localhost:5173/auth`
2. Register a new account: username=`user_a`, password=`Test@1234`, displayName=`User A`
3. Login successfully — redirected to chat list (`/`)
4. Open DevTools → Network → filter for Socket.IO or WebSocket
5. Verify socket connects (should see "connected" status indicator in header)
6. Open the user directory (`/users`) or go to DM search
7. **Assert**: Avatar for User A shows green presence dot (online)
8. Wait 65 seconds without any mouse/keyboard activity
9. **Assert**: Avatar for User A's green dot disappears (offline after 60s inactivity)
10. Move mouse — **Assert**: Green dot reappears immediately (back online)

**Expected Behavior**:
- Initial: User A avatar with green dot (online)
- After 60s idle: Green dot gone (offline)
- On activity: Green dot returns immediately
- Presence change broadcasts to other users

---

### Scenario 2: Two Users Presence Sync
**Objective**: Verify that presence state syncs between two connected users in real-time.

**Setup**:
1. Open two browser tabs:
   - Tab A: Login as `user_a`
   - Tab B: Login as `user_b`
2. Both tabs should show "connected" status indicator
3. Both should be able to see each other's avatars

**Test Steps**:

#### Part A: Initial Sync (presence.sync on connect)
1. Tab A: Navigate to DM search (click ✏️ button in header)
2. Tab A: Search for "user_b" in the modal
3. **Assert**: Avatar for User B shows a green dot (User B is online)
4. Tab B: Navigate to DM search
5. Tab B: Search for "user_a"
6. **Assert**: Avatar for User A shows a green dot

#### Part B: Live Presence Update (presence.update on state change)
7. Tab A: Go back to chat list
8. Tab B: Wait 65 seconds without any activity (go idle)
9. Tab A: Look at avatar for User B in DM search or in chat list
10. **Assert**: After ~65s, User B's green dot disappears (offline)
11. Tab B: Move mouse/type (any activity)
12. Tab A: Watch User B's avatar
13. **Assert**: Green dot reappears within 1-2 seconds (real-time update via socket)

#### Part C: Bidirectional Updates
14. Tab A: Stay active
15. Tab B: Idle for 65 seconds
16. Tab A: Verify User B's presence indicator disappears
17. Tab A: Idle for 65 seconds
18. Tab B: Verify User A's presence indicator disappears
19. Tab B: Become active (move mouse)
20. Tab A: Verify User B's indicator reappears quickly

**Expected Behavior**:
- Both users see each other's correct status
- Status updates are broadcast in real-time (<500ms)
- 60-second inactivity timer works on both clients
- Initial sync on page load shows correct state

---

### Scenario 3: Chat List Avatar Presence
**Objective**: Verify avatars in chat list show correct presence status.

**Setup**:
1. Tab A and Tab B both logged in
2. Create a DM between User A and User B:
   - Tab A: Click ✏️, search for user_b, click to create DM
   - Redirected to `/chat/{chatId}`
3. Both tabs now have a DM conversation open

**Test Steps**:
1. Tab A: Go back to chat list (`/`)
2. **Assert**: Chat row for User B shows Avatar with User B's presence
3. Tab B: Go back to chat list
4. **Assert**: Chat row for User A shows Avatar with User A's presence
5. Tab A: Idle for 65 seconds
6. Tab B: Watch the chat list (don't refresh)
7. **Assert**: User A's avatar dot disappears after ~65s
8. Tab A: Type something or move mouse
9. Tab B: Watch User A's avatar in chat list
10. **Assert**: Green dot reappears quickly (<1s)

**Expected Behavior**:
- Each chat row displays the counterpart's avatar
- Avatar shows correct live presence status
- No page refresh needed for status updates
- Status changes are smooth and reactive

---

### Scenario 4: Chat Header Avatar Presence
**Objective**: Verify avatar in chat header shows correct presence.

**Setup**:
1. Both users have open DM conversation: Tab A and Tab B
2. Both are in `/chat/{same-chatId}`

**Test Steps**:
1. Tab A: Look at chat header (left side, after back button)
2. **Assert**: Counterpart avatar (User B) displayed with green dot
3. Tab B: Look at chat header
4. **Assert**: Counterpart avatar (User A) displayed with green dot
5. Tab A: Idle for 65 seconds (keep page open, no activity)
6. Tab B: Watch User A's avatar in header
7. **Assert**: Green dot disappears after ~65s (still same page, reactive update)
8. Tab A: Move mouse
9. Tab B: Watch avatar in header
10. **Assert**: Green dot reappears within 1s

**Expected Behavior**:
- Chat header shows correct counterpart avatar
- Presence indicator matches their real-time status
- Updates happen reactively without page reload

---

### Scenario 5: Presence Across Tab Closes (Socket Disconnect)
**Objective**: Verify that when a user closes a tab, other users see them go offline.

**Setup**:
1. Two users logged in, both in chat list view
2. Tab A (User A) and Tab B (User B)

**Test Steps**:
1. Tab B: Open DM search, search for "user_a"
2. **Assert**: User A avatar shows green dot
3. Tab A: Close the entire tab (simulates disconnect)
4. Tab B: Watch User A's avatar in search results
5. **Assert**: Within 10-15 seconds, User A's green dot disappears
   - (Server detects socket disconnect and broadcasts presence.update with online=false)
6. Tab B: Go back to chat list
7. **Assert**: If there's a DM with User A, avatar shows no dot (offline)

**Expected Behavior**:
- Socket disconnect is detected by backend
- Backend broadcasts presence.update for that user (online=false)
- All other connected users see the status change
- Indicator disappears quickly (backend 10s timeout)

---

### Scenario 6: Page Reload and Presence Restoration
**Objective**: Verify presence state is restored after page reload.

**Setup**:
1. Tab A and Tab B both logged in and active

**Test Steps**:
1. Tab A: In DM search, verify User B shows green dot (online)
2. Tab A: Refresh the page (F5 or Cmd+R)
3. **Assert**: Page loads, socket connects (🟢 status indicator)
4. **Assert**: On presence.sync, User B's avatar shows green dot again
5. Tab B: Watch User A's avatar in DM search
6. **Assert**: User A briefly goes offline during page refresh, then comes back online when socket reconnects
7. Tab B: Verify the transition happens smoothly

**Expected Behavior**:
- Presence is re-synced on page reload via `presence.sync` event
- User briefly appears offline during disconnect, comes back online when reconnected
- Socket reconnection restores state automatically

---

### Scenario 7: Multiple Users Presence (Group Awareness)
**Objective**: Verify presence tracking works with multiple users simultaneously.

**Setup**:
1. Have 3 test accounts ready:
   - User A (logged in Tab A)
   - User B (logged in Tab B)
   - User C (logged in Tab C, or create new tab)
2. All three tabs logged in and active

**Test Steps**:
1. Tab A: Open DM search
2. Tab A: Search for "user_b" — **Assert**: green dot shows
3. Tab A: Search for "user_c" — **Assert**: green dot shows
4. Tab B: Idle for 65 seconds
5. Tab A: Watch User B's avatar in search
6. **Assert**: Green dot disappears
7. Tab C: Idle for 65 seconds (while Tab B already idle)
8. Tab A: Watch both User B and User C avatars
9. **Assert**: Both dots are gone (both offline)
10. Tab B: Become active (move mouse)
11. Tab A: Watch User B's avatar
12. **Assert**: Green dot reappears quickly
13. **Assert**: User C still shows no dot (still idle)

**Expected Behavior**:
- App can track presence for multiple users simultaneously
- Each user's status is independent
- All statuses update correctly via broadcast events

---

### Scenario 8: Avatar Component Variants (sm, md, lg)
**Objective**: Verify Avatar component renders correctly at all sizes.

**Setup**:
1. Tab A logged in
2. Open DM search modal

**Test Steps**:
1. **In DM search modal (Avatar size="sm", 32px)**:
   - Avatar for each search result should be small
   - **Assert**: Presence indicator is proportionally sized
   - **Assert**: Indicator is visible at bottom-right of avatar
   - Text is still readable next to avatar

2. **In chat list (Avatar size="md", 48px)**:
   - Go back to chat list
   - **Assert**: Chat row avatars are medium-sized (48px)
   - **Assert**: Presence dot is clearly visible
   - Chat name is readable

3. **In chat header (Avatar size="sm", 32px)**:
   - Open a DM conversation
   - **Assert**: Header avatar is compact
   - **Assert**: Presence dot is visible
   - Header layout is not crowded

**Expected Behavior**:
- Avatar scales properly at all sizes
- Presence indicator scales with avatar
- Indicator remains visible and clear at all sizes
- Component is flexible for reuse

---

## Test Coverage Checklist

- [ ] Single user inactivity timer (60s → offline)
- [ ] Single user activity reset (any activity → online)
- [ ] Two users presence sync on initial connection
- [ ] Two users live presence updates (real-time broadcast)
- [ ] Chat list shows correct presence for each contact
- [ ] Chat header shows correct presence for counterpart
- [ ] Socket disconnect marks user offline server-side
- [ ] Presence state persists across page reloads
- [ ] Multiple users' statuses tracked independently
- [ ] Avatar component renders at all sizes
- [ ] Presence indicator visibility/clarity at all sizes
- [ ] No console errors during presence updates
- [ ] No lag or delays in presence updates (<1s)
- [ ] Socket reconnection restores presence correctly

---

## Technical Details for Test Implementation

### Socket Events (From Backend)
```typescript
// On new socket connection:
socket.emit('presence.sync', { [userId]: boolean, [userId2]: boolean, ... })

// When any user's presence changes:
socket.broadcast.emit('presence.update', { userId: string, online: boolean, timestamp: string })
```

### Presence Store API
```typescript
// In any component:
import { presenceStore } from '$stores/presence.svelte';

// Check if a user is online
const isOnline = presenceStore.userPresenceMap.get(userId);

// Get full map
const allUsers = presenceStore.userPresenceMap;
```

### Avatar Component Usage
```svelte
<Avatar
  userId={user.id}
  displayName={user.displayName}
  avatarUrl={user.avatarUrl}
  size="md"
  showPresence={true}
/>
```

### Key State in Chat List (`apps/web/src/routes/+page.svelte`)
```typescript
// Retrieved on mount
const chatList: ChatSummary[] = await chats.list();
// Each chat has: counterpartMemberId, counterpartAvatarUrl (for DMs)
```

### Key State in Chat Page (`apps/web/src/routes/chat/[id]/+page.svelte`)
```typescript
let counterpartMemberId = $state<string | null>(null);
let counterpartAvatarUrl = $state<string | null>(null);
// Set on mount from chat summary
```

---

## Running the Tests with Playwright

### Prerequisites
1. Install Playwright: `npm install -D @playwright/test`
2. Have the dev server running: `npm run dev` (from monorepo root)
3. Have backend running on port 3000
4. Create test utility for auth/user management

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Presence Indicators', () => {
  test('User appears online initially', async ({ browser }) => {
    // Create context for User A
    // Login and navigate
    // Assert green dot visible
  });

  test('User goes offline after 60s inactivity', async ({ browser }) => {
    // Login
    // Wait 65s
    // Assert dot gone
  });

  // ... more tests
});
```

### Useful Selectors
```typescript
// Avatar component container
'[class*="avatar-container"]'

// Presence indicator dot
'[class*="presence-indicator"]'

// Chat list rows
'.chat-row'

// Chat name in header
'.thread-name'

// Status indicator in top header
'.status-dot'

// Connection status
'.connection-status'
```

---

## Notes for Test Implementation

1. **Timing**: Be generous with timeouts. Socket.IO reconnection and broadcasts may take 1-2 seconds. Use `expect(...).toBeVisible({ timeout: 5000 })`.

2. **Multiple Contexts**: Use Playwright's `browser.newContext()` to create independent browser sessions for different users. This allows testing multi-user scenarios.

3. **Database State**: Backend uses PostgreSQL. Tests should ideally:
   - Create fresh test accounts for each test run
   - Clean up after tests (optional for CI, useful for local dev)
   - Or use fixtures to reset state between tests

4. **Socket Debugging**: If tests fail:
   - Check Network tab in DevTools for Socket.IO frames
   - Verify `presence.sync` and `presence.update` events are firing
   - Check browser console for any errors
   - Verify backend is running: `curl http://localhost:3000/health`

5. **Flakiness Prevention**:
   - Always wait for socket connection before checking presence
   - Use `waitForURL()` and `waitForSelector()` instead of fixed sleeps
   - Allow 2-3s for presence updates to propagate
   - Test in isolation (don't depend on previous test state)

6. **Inactivity Timer Testing**:
   - Set a shorter timeout in test (modify presenceStore for test env)
   - Or use `page.evaluate()` to simulate activity or skip the timer
   - Default 60s will slow down tests significantly

---

## Success Criteria

All tests pass when:
1. ✅ Single-user inactivity timer works (60s → offline)
2. ✅ Presence syncs correctly on initial connection
3. ✅ Live presence updates broadcast to all connected users
4. ✅ Chat list avatars show correct status
5. ✅ Chat header avatars show correct status
6. ✅ Socket disconnect marks user offline
7. ✅ Page reload restores presence correctly
8. ✅ Multiple users can be tracked simultaneously
9. ✅ No console errors during any test
10. ✅ Avatar component renders at all sizes with visible indicators

---

**Test Authorship**: This prompt was generated to enable comprehensive E2E testing of Wave A presence indicators. It should provide Gemini + Playwright with all necessary context to write reliable, maintainable tests.
