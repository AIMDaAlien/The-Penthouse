# Handoff: Playwright E2E Test Hardening → Codex

**Date:** 2026-05-20  
**From:** Kimi (ambient presence implementation)  
**To:** Codex (Playwright test execution + gap filling)  
**Branch:** main (uncommitted changes — see Files Changed below)

---

## Context

Just shipped **ambient presence** (Phase 1–4) to make the app feel more like a "place" where people are around. Features added:

- **PresenceAvatar** component with color-coded status dots (green=available, yellow=afk, red=busy/dnd, gray=offline)
- **Presence in chat list** — DMs show counterpart's live presence dot + custom status note
- **Presence in member list** — sorted by presence (online first), with state labels
- **Voice activity in chat list** — real-time voice participant count + speaking pulse indicator

All typechecks pass. All unit/integration tests pass (189 backend, 21 frontend). Now we need **real user readiness validation** via Playwright.

---

## Files Changed This Session

```
M  apps/web/src/lib/components/ChatListItem.svelte       # presence dot + note + voice pill
M  apps/web/src/lib/components/ChatMembersModal.svelte   # presence avatars + sorted by state
M  apps/web/src/routes/+layout.svelte                    # init presenceStore + voiceRoomsStore
M  apps/web/src/routes/users/+page.svelte                # PresenceAvatar in roster
M  packages/contracts/src/events.ts                      # ServerVoiceRoomSummaryEventSchema
M  services/api/src/realtime/socket.ts                   # broadcastVoiceRoomSummary on join/leave/speaking
A  apps/web/src/lib/components/PresenceAvatar.svelte     # new: avatar + status dot wrapper
A  apps/web/src/lib/stores/presence.svelte.ts            # new: global presence store from socket events
A  apps/web/src/lib/stores/voiceRooms.svelte.ts          # new: voice room summary store
```

---

## Prerequisites

```bash
# 1. Postgres must be running
docker compose -f infra/docker-compose.yml up -d

# 2. Run migrations (dev DB at :5434)
cd services/api && npx tsx src/db/migrate.ts

# 3. Start backend
cd services/api && DISABLE_RATE_LIMIT=true npm run dev

# 4. Start frontend (separate terminal)
cd apps/web && npm run dev
```

---

## Phase 1: Run Existing E2E Suite

Execute all existing specs and document failures. Do not fix app bugs unless trivial — flag them.

```bash
cd apps/web
npx playwright test --workers=1 --reporter=list
```

### Expected Specs (15 files)

| Spec File | Focus | Notes |
|-----------|-------|-------|
| `auth-flow.spec.ts` | Register, login, logout | QA report showed socket reconnect bug — **should now be fixed** via `+layout.svelte` |
| `suite-auth.spec.ts` | Auth edge cases | 10 tests, had 6 failures in April QA (3 app bugs + 3 test-code issues) |
| `suite-chat.spec.ts` | DM send/receive, read receipts | Was completely blocked by socket reconnect bug — re-test |
| `suite-reactions-replies-pins.spec.ts` | Reactions, replies, pins | Blocked by same socket bug — re-test |
| `suite-polls.spec.ts` | Poll creation/voting | Blocked by same socket bug — re-test |
| `suite-gif.spec.ts` | GIF picker, search, send | Blocked by same socket bug — re-test |
| `suite-users.spec.ts` | Directory, search, settings | May need updates for PresenceAvatar |
| `presence.spec.ts` | 8 presence scenarios | **Existing tests** — verify they still pass after our changes |
| `voice.spec.ts` | Join/leave/mute/deafen/PTT | **Existing tests** — verify still pass |
| `audio-messages.spec.ts` | Record, send, play audio | May fail on headless mic access |
| `folders-channels.spec.ts` | Folder DND, channel creation | Previous handoff noted ChatListPane DOM churn — may be fixed by recent reactivity cleanup |
| `local-sync.spec.ts` | IndexedDB, local-first sync | Should be stable |
| `advanced-qa.spec.ts` | a11y axe-core, slow 3G | Should be stable |
| `wave-a-6-mute.spec.ts` | Chat row context menu, mute | Should be stable |
| `wave-a-7-gif-picker.spec.ts` | GIF picker a11y, slow 3G | Should be stable |

### What to Report Back

For each failing test, capture:
1. Error message / stack trace
2. Screenshot path (`test-results/`)
3. Is it an app bug or test-code issue?
4. Severity (blocking user vs. test fragility)

---

## Phase 2: Close Critical Testing Gaps

These features have **zero automated coverage** but are in the INTERNAL_TESTING.md "first stable slice" checklist. Priority order:

### Gap 1: Typing Indicator (Medium)
- Feature exists, socket events flow, UI renders
- No e2e coverage
- **Test**: User A types in chat → User B sees "... is typing" → User A stops → indicator hides after 3s

### Gap 2: Message Edit & Delete (Medium)
- Common operations, real-time sync to other users
- No e2e coverage
- **Test**: Send message → edit → verify updated text → delete → verify removed for both users

### Gap 3: Group Chat Creation & Member Management (Medium)
- E2E only covers DMs and channels
- No test for creating groups, adding/removing members
- **Test**: Create group → add member → send message → open members modal → remove member

### Gap 4: Media Upload — Image/Video (High)
- Audio has e2e, but image/video have nothing
- INTERNAL_TESTING.md calls this required
- **Test**: Upload image → verify inline render → click for fullscreen → close viewer
- **Challenge**: File upload in Playwright requires `page.setInputFiles()` + mock or real image

### Gap 5: Offline Queue / Retry (High)
- Critical for mobile users on spotty connections
- Outbox store exists but no e2e
- **Test**: 
  1. User goes offline (block API with `page.route()` or throttle)
  2. Send message → verify "pending" state
  3. Restore connection
  4. Verify message delivers automatically

### Gap 6: Presence Features (New — Needs New Tests)
Our ambient presence changes need dedicated e2e coverage:

```typescript
// Suggested new spec: e2e/ambient-presence.spec.ts

test('DM chat list shows presence dot when counterpart is online', async () => {
  // Register user A and B
  // Both log in (separate browser contexts)
  // User A opens chat list
  // Expect green dot on DM with User B
});

test('Member list sorts by presence and shows state labels', async () => {
  // Open General chat → open Members modal
  // Expect online users first, then afk, then offline
  // Expect "AVAILABLE" / "AFK" labels visible
});

test('Presence note appears as chat list subtitle', async () => {
  // User B sets presence note to "In a meeting"
  // User A sees "In a meeting" as subtitle on DM
});

test('Voice activity pill appears when user joins voice', async () => {
  // User B joins voice in General chat
  // User A sees 🔊 pill with "1" on General chat item
});

test('Voice pill pulses when someone speaks', async () => {
  // User B joins voice and speaks (mock or real mic)
  // User A sees pulsing indicator
});
```

---

## Known Issues from Previous QA (April 10)

Review `QA_REPORT.md` — two critical bugs were identified. Verify they are fixed:

### ✅ Socket Reconnect After Hard Reload
- **Status**: FIXED — `+layout.svelte` now has `$effect` that calls `socketStore.connect(token)` whenever `sessionStore.accessToken` exists
- **Verify**: Refresh page while authenticated → connection dot turns green

### ✅ Auth Submit Button Not Disabled on Invalid Password
- **Status**: FIXED — `auth/+page.svelte` now has `canSubmit` derived state gating the button: `disabled={loading || !canSubmit}`
- **Verify**: Enter short password → submit button is disabled

### ⚠️ Test Infrastructure Issues
- `suite-auth` uses `getByRole('button', { name: 'Sign in' })` which matches **both** the tab and submit button (accessibility tree ambiguity)
- **Fix**: Use `page.locator('button[type="submit"]')` for submit clicks

---

## Phase 3: CI Integration (Stretch)

The GitHub Actions workflow (`.github/workflows/ci.yml`) does **not** run Playwright. It runs:
- `npm run typecheck`
- `npm run test` (unit tests)
- `npm run scenario:test` (antigravity)

**Stretch goal**: Add a `playwright` job to CI that runs the e2e suite against a ephemeral Postgres service. This is optional for this handoff — focus on local execution first.

---

## Success Criteria

Codex is done when:

1. [ ] All 15 existing spec files have been executed
2. [ ] Failures are documented with error messages + screenshots
3. [ ] App bugs are filed (don't fix unless trivial — hand back to Kimi)
4. [ ] Test-code issues are fixed (selectors, timeouts, flakiness)
5. [ ] At least **2 of the 6 critical gaps** have new e2e tests written
6. [ ] New ambient presence spec exists with ≥3 scenarios
7. [ ] `npm run validate` still passes

---

## Quick Reference: Running Individual Specs

```bash
# Single spec
cd apps/web && npx playwright test e2e/suite-chat.spec.ts --workers=1

# With UI mode for debugging
cd apps/web && npx playwright test e2e/suite-chat.spec.ts --ui

# Specific project (Chromium only)
cd apps/web && npx playwright test e2e/suite-chat.spec.ts --project=chromium

# With trace on failure
cd apps/web && npx playwright test --trace=on
# Then: npx playwright show-trace test-results/.../trace.zip

# Debug mode (step through)
cd apps/web && npx playwright test e2e/suite-chat.spec.ts --debug
```

---

## Relevant Files

| File | Why It Matters |
|------|----------------|
| `apps/web/playwright.config.ts` | Test config: 3 browsers, workers=1, retries=2 in CI |
| `apps/web/e2e/utils.ts` | `registerUser()`, `loginUser()` helpers — may need updates |
| `QA_REPORT.md` | Previous QA findings — verify fixes |
| `docs/INTERNAL_TESTING.md` | Manual checklist — source of truth for "first stable slice" |
| `apps/web/src/lib/stores/presence.svelte.ts` | New global presence store |
| `apps/web/src/lib/stores/voiceRooms.svelte.ts` | New voice room summary store |
