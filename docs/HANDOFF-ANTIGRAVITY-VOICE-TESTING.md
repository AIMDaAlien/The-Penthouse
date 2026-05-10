# Handoff — Antigravity Voice Testing (Comprehensive)

**Date:** 2026-05-08
**Scope:** Phase 4 Voice Chat — end-to-end validation
**Tester:** Antigravity
**Built by:** Kimi

---

## What Was Built

A **mesh P2P voice chat** with full UX polish. Users in the same chat can join a voice room and speak to each other in real-time.

### Features Ready to Test

| Feature | Status | Notes |
|---------|--------|-------|
| Join/leave voice room | ✅ Ready | Per-chat voice rooms |
| Mute/unmute | ✅ Ready | Mic toggle |
| Deafen/undeafen | ✅ Ready | Stop hearing others while staying in room |
| Push-to-talk (PTT) | ✅ Ready | Spacebar to talk, release to mute |
| Speaking indicator | ✅ Ready | Green pulse on talking participant |
| Participant list | ✅ Ready | Pills showing who's in the room |
| Mute/deafen sync | ✅ Ready | All participants see each other's state |
| Auto-cleanup on disconnect | ✅ Ready | Tab close removes user from room |
| Capacity enforcement | ✅ Ready | Hard cap at 8 participants |
| Multiple simultaneous rooms | ✅ Ready | Different chats = different voice rooms |

### Not Built Yet (Out of Scope)

| Feature | Why Deferred |
|---------|-------------|
| TURN relay | Needs infrastructure (Coturn or provider). Symmetric NAT users will fail for now. |
| Volume slider / per-user gain | Requires Web Audio gain nodes per peer. Complex for MVP. |
| Noise suppression / echo cancellation | Browser defaults only. No custom DSP. |
| Call history / recording | No DB persistence for voice. |
| Screen sharing | Separate feature, needs video track handling. |

---

## Pre-Test Setup

### 1. Start the dev stack
```bash
cd /Users/aim/Documents/The-Penthouse-Kimi
npm run validate   # should be green
```

Run the API and web dev servers in separate terminals:
```bash
# Terminal 1
cd services/api && npm run dev

# Terminal 2
cd apps/web && npm run dev
```

### 2. Ensure database is migrated
```bash
cd services/api && npx tsx src/db/migrate.ts
```

### 3. Browser requirements
- **Chrome or Firefox** (WebRTC works best here)
- **Mic permission** — browser will ask on first "Join Voice"
- **Two browser contexts** — you need at least two distinct users to test audio flow

---

## Test Matrix

### Test 1: Basic Join / Leave
**Setup:** Open `http://localhost:5173` in Chrome. Log in as User A. Open any chat.

**Steps:**
1. Click **"Voice"** button in the top-right of the chat header.
2. Browser asks for mic permission → **Allow**.
3. Button changes to a row of control buttons (mute, deafen, PTT, leave).
4. A pill appears: **"You"**.

**Expected:**
- [ ] "You" pill shows in the participant bar below the header.
- [ ] Speak into mic → pill gets **green pulsing border**.
- [ ] Click **mute icon** → pill dims, green pulse stops even if you talk.
- [ ] Click **mute icon again** → pill returns to normal.
- [ ] Click **leave (X) icon** → voice UI disappears.
- [ ] Click **"Voice"** again → rejoins successfully.

**Screenshots:** Save `test1-join-leave.png` showing the participant bar.

---

### Test 2: Two-User Audio Flow (The Money Test)
**Setup:** Two distinct browser contexts.

**Option A — Two browsers:**
- Chrome: log in as User A
- Firefox: log in as User B
- Both navigate to the **same chat** (e.g., General)

**Option B — Incognito + regular:**
- Regular Chrome: log in as User A
- Incognito Chrome: log in as User B
- Both navigate to the **same chat**

**Steps:**
1. User A clicks **"Voice"** → joins room.
2. User B clicks **"Voice"** → joins room.
3. On User A's screen: a pill appears for **User B**.
4. On User B's screen: a pill appears for **User A**.

**Expected:**
- [ ] User A talks into mic → **User B hears audio**.
- [ ] User A's "You" pill pulses green.
- [ ] User B's screen shows User A's pill pulsing green.
- [ ] User B talks → **User A hears audio**.
- [ ] User B's "You" pill pulses green.
- [ ] User A's screen shows User B's pill pulsing green.

**If audio doesn't flow:**
- Check browser console for WebRTC errors.
- Check that both users are in the **same chat**.
- Check that mic permissions were granted.
- Try refreshing both pages and rejoining.
- Check `chrome://webrtc-internals/` (Chrome) for connection state.

**Screenshots:** Save `test2-two-user-a.png` and `test2-two-user-b.png` from both browsers.

---

### Test 3: Mute Sync
**Setup:** Both users in voice room (from Test 2).

**Steps:**
1. User A clicks **mute icon**.
2. User B observes User A's pill.

**Expected:**
- [ ] User A's "You" pill shows **"(muted)"**.
- [ ] User B sees User A's pill dim to gray and show **"(muted)"**.
- [ ] User A talks → **User B should NOT hear audio**.
- [ ] User A unmutes → pill returns to normal, audio resumes.

---

### Test 4: Deafen
**Setup:** Both users in voice room, unmuted.

**Steps:**
1. User A clicks **deafen icon** (headphones).
2. User B talks.
3. User A talks.

**Expected:**
- [ ] User A's "You" pill shows **"(deafened)"** and is dimmed/strikethrough.
- [ ] User B sees User A's pill shows **"(deafened)"**.
- [ ] User B talks → **User A should NOT hear audio**.
- [ ] User A talks → **User B SHOULD still hear audio** (deafen only affects incoming).
- [ ] User A undeafens → audio resumes both ways.

---

### Test 5: Push-to-Talk (PTT)
**Setup:** User A in voice room. Ensure mic is unmuted.

**Steps:**
1. Click **PTT icon** to enable PTT mode.
2. "You" pill should show **"(PTT)"**.
3. Press and hold **Spacebar** → talk.
4. Release **Spacebar**.

**Expected:**
- [ ] While Spacebar is held: "You" pill shows active state (accent border).
- [ ] While Spacebar is held: mic is unmuted, others can hear you.
- [ ] When Spacebar released: mic mutes automatically.
- [ ] Others only hear audio while Spacebar is held.
- [ ] Click **PTT icon again** to disable PTT → returns to open-mic mode.

**Edge case:** PTT + typing in message input:
- [ ] Click message input box.
- [ ] Press Spacebar while typing → should type a space, NOT trigger PTT.
- [ ] PTT should only work when focus is NOT in an input/textarea.

---

### Test 6: Speaking Indicator Accuracy
**Setup:** Both users in voice room, unmuted.

**Steps:**
1. User A talks loudly.
2. User A stops talking.
3. User A whispers.

**Expected:**
- [ ] Loud talking → strong green pulse on User A's pill on both screens.
- [ ] Silent → pulse stops within ~200ms.
- [ ] Whispering → weak or no pulse (threshold is ~5% volume).

---

### Test 7: Disconnect Cleanup
**Setup:** Both users in voice room.

**Steps:**
1. User A closes their browser tab (or refreshes).

**Expected:**
- [ ] On User B's screen: User A's pill **disappears** within ~5 seconds.
- [ ] User B remains in voice room alone.
- [ ] User B's "You" pill still shows.

---

### Test 8: Multiple Chat Rooms
**Setup:** User A in Chat 1, User B in Chat 1. User C in Chat 2.

**Steps:**
1. User A joins voice in Chat 1.
2. User B joins voice in Chat 1.
3. User C joins voice in Chat 2.

**Expected:**
- [ ] User A and B can hear each other.
- [ ] User C is in a **separate** voice room, cannot hear A or B.
- [ ] No cross-chat audio leakage.

---

### Test 9: Capacity Enforcement
**Setup:** Need to simulate 8 users in the same chat room. Since manual testing with 8 browsers is hard, use this workaround:

**Workaround — Socket.IO test via console:**
1. Open the chat in Chrome.
2. Open DevTools → Console.
3. Run this script 8 times with different usernames (or use the integration test approach).

**Alternative — just verify the code path:**
- Check `services/api/src/realtime/socket.ts` line ~378: `if (room && room.size >= MAX_VOICE_PARTICIPANTS)` rejects with `VOICE_ROOM_FULL`.
- The integration test approach is more reliable.

**Expected:**
- [ ] 9th user attempting to join gets an error toast or console error with code `VOICE_ROOM_FULL`.

---

### Test 10: Rejoin After Disconnect
**Setup:** User A and B in voice room.

**Steps:**
1. User A refreshes page.
2. User A logs back in.
3. User A navigates to same chat.
4. User A clicks **"Voice"**.

**Expected:**
- [ ] User A rejoins successfully.
- [ ] User B sees User A's pill reappear.
- [ ] Audio flows both ways again.

---

### Test 11: PTT + Mute Interaction
**Setup:** User A in voice room, PTT mode enabled.

**Steps:**
1. User A clicks **mute** while in PTT mode.
2. User A holds Spacebar.

**Expected:**
- [ ] Mic stays muted even when Spacebar is held (mute overrides PTT).
- [ ] User A unmutes.
- [ ] Spacebar now works for PTT again.

---

## Known Failure Modes

| Symptom | Likely Cause | Workaround |
|---|---|---|
| "Join Voice" does nothing | Mic permission denied | Check browser permission settings, reload page |
| Pills show but no audio | Symmetric NAT / corporate firewall | Test on same WiFi network first; TURN not yet implemented |
| Echo / feedback | Both users in same physical room | Use headphones, or mute one side |
| Audio choppy | Mesh with 3+ peers on slow connection | Mesh bandwidth scales O(N²); expected for now |
| Speaking indicator not working | AnalyserNode blocked | Check console for AudioContext errors |
| Can't join — "room full" | 8 users already in room | Wait for someone to leave |
| PTT triggers while typing | Focus not detected correctly | Click outside input before using PTT |

---

## Debug Procedures

### Check WebRTC Connection State (Chrome)
1. Open `chrome://webrtc-internals/`
2. Find the connection for your peer
3. Look for:
   - `iceConnectionState` → should be `connected` or `completed`
   - `connectionState` → should be `connected`
   - `signalingState` → should be `stable`

### Check Socket Events
1. Open DevTools → Console
2. Filter by `[socket]` to see voice events
3. Expected events: `voice.user_joined`, `voice.state`, `voice.signal`, `voice.mute`, `voice.speaking`

### Export WebRTC Dump
1. `chrome://webrtc-internals/`
2. Click **"Create dump"**
3. Include **PeerConnection updates** and **Stats**
4. Attach to bug report

---

## Architecture Notes

- **Mesh topology:** Each peer sends audio directly to every other peer. No server media processing.
- **STUN only:** Uses `stun:stun.l.google.com:19302`. No TURN relay yet.
- **Signaling:** Socket.IO events `voice.join/leave/signal/mute/deafen/ptt/speaking`.
- **State:** In-memory only. Server restart clears all voice rooms.
- **Capacity:** Hard cap at 8 participants. 9th join rejected with `VOICE_ROOM_FULL`.
- **PTT:** Spacebar keydown/up events control mic state. Only works when focus is outside input fields.
- **Deafen:** Client-side only — stops playing remote audio tracks. Does not affect mic or signaling.

---

## Event Reference

### Client → Server
| Event | Payload | When Sent |
|-------|---------|-----------|
| `voice.join` | `{ chatId }` | Click "Join Voice" |
| `voice.leave` | `{ chatId }` | Click "Leave Voice" or disconnect |
| `voice.signal` | `{ targetUserId, data }` | WebRTC offer/answer/ICE |
| `voice.mute` | `{ muted }` | Click mute toggle |
| `voice.deafen` | `{ deafened }` | Click deafen toggle |
| `voice.ptt` | `{ active }` | Spacebar press/release (PTT mode) |
| `voice.speaking` | `{ speaking }` | Volume threshold crossed |

### Server → Client
| Event | Payload | When Received |
|-------|---------|---------------|
| `voice.state` | `{ participants[] }` | On join — full room snapshot |
| `voice.user_joined` | `{ userId, displayName, muted, deafened }` | Another user joined |
| `voice.user_left` | `{ userId }` | Another user left |
| `voice.mute` | `{ userId, muted }` | Someone toggled mute |
| `voice.deafen` | `{ userId, deafened }` | Someone toggled deafen |
| `voice.ptt` | `{ userId, active }` | Someone pressed/released PTT |
| `voice.speaking` | `{ userId, speaking }` | Someone's speaking state changed |
| `voice.signal` | `{ fromUserId, data }` | WebRTC offer/answer/ICE relay |

---

## How to Report Issues

File bugs in `docs/kimi-rebuild/bugs/voice-YYYYMMDD.md` with:
1. **Browser + version**
2. **Network setup** (same WiFi? VPN? corporate network?)
3. **Steps to reproduce**
4. **Browser console logs** (F12 → Console → export)
5. **WebRTC internals** (Chrome: `chrome://webrtc-internals/` → download dump)

---

## Test Report Template

After completing tests, fill this out and share:

```markdown
# Voice Test Report — [Date]

## Environment
- Browsers tested: [Chrome/Firefox/Safari versions]
- Network: [same WiFi / different networks / VPN / corporate]
- OS: [macOS/Windows/Linux versions]

## Results

| Test | Pass | Fail | Notes |
|------|:----:|:----:|-------|
| 1. Basic join/leave | [ ] | [ ] | |
| 2. Two-user audio | [ ] | [ ] | |
| 3. Mute sync | [ ] | [ ] | |
| 4. Deafen | [ ] | [ ] | |
| 5. Push-to-talk | [ ] | [ ] | |
| 6. Speaking indicator | [ ] | [ ] | |
| 7. Disconnect cleanup | [ ] | [ ] | |
| 8. Multiple rooms | [ ] | [ ] | |
| 9. Capacity enforcement | [ ] | [ ] | |
| 10. Rejoin | [ ] | [ ] | |
| 11. PTT + mute | [ ] | [ ] | |

## Console Errors
[List any JS errors]

## Bugs Found
1. [Description] → Severity: [blocker/major/minor] → Repro: [steps]

## Overall Assessment
- [ ] All critical audio paths functional
- [ ] No console errors during normal use
- [ ] Would recommend for manual QA pass
```

---

*Start with Test 1, then Test 2 (the money test). If Test 2 passes, everything else is polish. Prioritize Tests 2, 3, 4, 5, 7.*
