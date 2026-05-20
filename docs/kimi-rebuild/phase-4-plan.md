# Phase 4 Plan — Voice Chats (Scaffold)

**Date:** 2026-05-09
**Decisions locked:**
1. ✅ Mesh topology (P2P), cap ~8 users per room
2. ✅ Group voice rooms (join/leave), no phone-like calling
3. ✅ Public STUN for now, self-hosted TURN deferred to later phase
4. ✅ Both open-mic and push-to-talk, user-selectable
5. ✅ Volume threshold for voice activity detection
6. ✅ In-memory participant state, DB persistence deferred

**Constraint:** Scaffold only — solid foundation, not a polished product. Chat messaging takes priority.

---

## Architecture

### Mesh Topology
- Each peer creates `RTCPeerConnection` to every other peer in the room
- Server relays signaling (offer/answer/ICE) but does NOT touch media
- Cap enforced server-side: reject `voice.join` if room at capacity

### In-Memory State
```ts
// services/api/src/realtime/voice.ts
type VoiceParticipant = {
  userId: string;
  socketId: string;
  displayName: string;
  avatarUrl: string | null;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  pttActive: boolean;
};

const voiceRooms = new Map<string, Map<string, VoiceParticipant>>();
```
- Key = `chatId`, value = Map of `userId → VoiceParticipant`
- Cleaned up automatically when last participant leaves
- Survives socket reconnect (same userId, new socketId) via `voice.join` re-auth

### Signaling Events (Socket.IO)

**Client → Server:**
- `voice.join` — enter room for `chatId`
- `voice.leave` — exit room
- `voice.offer` — `{ targetUserId, sdp }`
- `voice.answer` — `{ targetUserId, sdp }`
- `voice.ice` — `{ targetUserId, candidate }`
- `voice.mute` — `{ muted: boolean }`
- `voice.ptt` — `{ active: boolean }` (push-to-talk state)

**Server → Client:**
- `voice.state` — full participant snapshot on join
- `voice.participant_joined` — new peer entered
- `voice.participant_left` — peer exited
- `voice.participant_updated` — mute/ptt/speaking changed
- `voice.offer` — relayed `{ fromUserId, sdp }`
- `voice.answer` — relayed `{ fromUserId, sdp }`
- `voice.ice` — relayed `{ fromUserId, candidate }`

---

## Task Breakdown

### Task 1: Contracts — Voice Event Schemas
**Files:** 1
- `packages/contracts/src/events.ts` — append voice event schemas + types

**Schemas to add:**
- `ClientVoiceJoinEventSchema`, `ClientVoiceLeaveEventSchema`
- `ClientVoiceOfferEventSchema`, `ClientVoiceAnswerEventSchema`, `ClientVoiceIceEventSchema`
- `ClientVoiceMuteEventSchema`, `ClientVoicePttEventSchema`
- `ServerVoiceStateEventSchema`, `ServerVoiceParticipantEventSchema`
- `ServerVoiceOfferEventSchema`, `ServerVoiceAnswerEventSchema`, `ServerVoiceIceEventSchema`

### Task 2: Backend — Voice Signaling Module
**Files:** 2
- `services/api/src/realtime/voice.ts` — **new file**
  - In-memory `voiceRooms` Map
  - `handleVoiceJoin`, `handleVoiceLeave`
  - `relayOffer`, `relayAnswer`, `relayIce`
  - `broadcastParticipantUpdate`
  - Capacity enforcement (max 8)
  - Cleanup on socket disconnect
- `services/api/src/realtime/socket.ts` — wire voice handlers into `io.on('connection')`

### Task 3: Frontend — Voice Store + WebRTC Manager
**Files:** 2
- `apps/web/src/lib/stores/voice.svelte.ts` — **new file**
  - `$state` for local participant state (joined, muted, deafened, pttMode)
  - `$state` for remote participants Map
  - `join(chatId)`, `leave()`, `setMuted()`, `setPttMode()`
  - WebRTC peer management: `createPeer(userId)`, `closePeer(userId)`
  - Handle incoming offers/answers/ICE
- `apps/web/src/lib/services/voice.ts` — **new file**
  - Thin wrapper around socket events: `emitJoin`, `emitOffer`, `emitAnswer`, `emitIce`, `emitMute`, `emitPtt`

### Task 4: Frontend — VoiceRoom UI
**Files:** 2
- `apps/web/src/lib/components/VoiceRoom.svelte` — **new file**
  - Participant grid (avatar, name, mute indicator, speaking border)
  - Self controls: mute toggle, deafen toggle, PTT mode switch, leave button
  - PTT keybinding (Space or configurable key)
  - Volume analyzer for self + remote visual indicator
- `apps/web/src/routes/chat/[id]/+page.svelte` — add VoiceRoom toggle button in header

### Task 5: Frontend — Chat Header Voice Button
**Files:** 1
- `apps/web/src/routes/chat/[id]/+page.svelte` — add "Join Voice" / "Leave Voice" button in `<header>`
- Show active participant count when voice room has people

### Task 6: Integration Tests
**Files:** 2 (tests don't count against 3-file rule)
- `services/api/test/integration-voice.test.ts`
  - Join room, verify participant list
  - Leave room, verify removal
  - Capacity limit (9th join rejected)
  - Mute state broadcast

### Task 7: Validation + Handoff
- `npm run validate` green
- Update `HANDOFF.md`

---

## Open Questions (Post-Scaffold)

| Question | When to answer |
|---|---|
| Self-hosted TURN (Coturn)? | When NAT failures reported in prod |
| DB persistence for call history? | When operator requests audit/logs |
| Screen sharing? | Post-MVP, needs video track handling |
| Noise suppression / echo cancellation? | Browser handles basic; advanced = RNNoise WASM |
| Recording? | Server-side recording needs SFU |

---

## Quality Gates

- [ ] `npm run typecheck` green
- [ ] `npm run test:integration` green (including voice tests)
- [ ] 2+ browsers can join same room, audio flows
- [ ] Mute/unmute reflected in participant grid
- [ ] PTT mode works (hold to speak, release to mute)
- [ ] 9th participant rejected with clear error
- [ ] Disconnect/reconnect handled gracefully
