---
tags: [penthouse, pwa, mvp, tasks, implementation, stabilization]
created: 2026-04-05
---

# MVP Stabilization Implementation Tasks

**Goal**: Complete the missing pieces to make MVP chat experience complete and testable.

**Scope**: 2 critical tasks to unblock full chat workflows  
**Estimated effort**: 4-6 hours total

---

## Task 1: Add "New Direct Message" Button to Chat List

**Priority**: CRITICAL (blocks starting new conversations)  
**Impact**: Users can now initiate conversations without backend help  
**Complexity**: Medium (involves search, user selection, DM creation)  
**Est. time**: 2-3 hours

### What needs to happen

1. **Add "New DM" button in chat list header**
   - Location: `apps/web/src/routes/+page.svelte` header
   - Button text: "New message" or "➕" icon
   - Opens a modal/overlay to select user

2. **User picker modal**
   - Search bar to find users (reuse user directory search)
   - Click user to initiate DM
   - Already have `api.users.search()` from Tier 1

3. **Create DM via backend**
   - API: `POST /api/v1/chats/dm { memberId: "..." }`
   - Backend returns: chat ID
   - Frontend navigates to new chat

4. **Handle edge cases**
   - DM already exists → navigate to existing chat (don't create duplicate)
   - Network error → show toast
   - User selects themselves → show error "Can't message yourself"

### Files to modify

- `apps/web/src/routes/+page.svelte` — Add button, modal trigger
- `apps/web/src/lib/services/api.ts` — Add `chats.createDm(memberId)` method
- Create new modal component (or inline in +page.svelte)

### Implementation outline

```typescript
// In api.ts, add:
export const chats = {
  // ... existing methods
  createDm: (memberId: string) =>
    request<{ id: string }>('/api/v1/chats/dm', {
      method: 'POST',
      body: JSON.stringify({ memberId })
    })
};

// In +page.svelte, add:
// 1. Modal state (open/closed, selected user)
// 2. Search input for users
// 3. User list from api.users.search()
// 4. On user click: chats.createDm() → navigate to chat
```

### Testing checklist

- [ ] Button appears in header
- [ ] Modal opens on click
- [ ] Can search for users
- [ ] Results appear
- [ ] Clicking user creates DM
- [ ] Navigates to new chat
- [ ] DM appears in chat list
- [ ] DM already exists → navigate to existing (no duplicate)
- [ ] Network error shows toast
- [ ] Can't DM yourself → error message

---

## Task 2: Add "Message" Option to User Profile

**Priority**: HIGH (improves UX for finding and messaging users)  
**Impact**: Natural flow: directory → profile → message  
**Complexity**: Low (reuse DM creation from Task 1)  
**Est. time**: 1-2 hours

### What needs to happen

1. **Add "Message" button on user profile page**
   - Location: `apps/web/src/routes/users/[id]/+page.svelte`
   - Show button for OTHER users only (not your own profile)
   - Button text: "Send message" or "Message"
   - Position: Next to "Back" button or below profile info

2. **On click**:
   - Call `chats.createDm(userId)`
   - Navigate to `/chat/{chatId}`
   - Same logic as Task 1 "New DM"

3. **Handle edge cases**:
   - DM already exists → navigate to existing chat (don't create duplicate)
   - Network error → show toast
   - Viewing own profile → don't show button

### Files to modify

- `apps/web/src/routes/users/[id]/+page.svelte` — Add button, DM logic

### Implementation outline

```typescript
// In users/[id]/+page.svelte

// Add to script:
async function handleMessage() {
  try {
    const response = await chats.createDm(userId);
    goto(`/chat/${response.id}`);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to create chat';
  }
}

// In template (add button):
{#if userId !== currentUserId}
  <button onclick={handleMessage} disabled={loading}>
    💬 Message
  </button>
{/if}
```

### Testing checklist

- [ ] Button appears on other users' profiles
- [ ] Button doesn't appear on own profile
- [ ] Click navigates to chat
- [ ] Works if DM already exists (navigates to existing)
- [ ] Network error shows toast
- [ ] Button disabled during request

---

## Task 3: Add Connection Status Indicator (NICE TO HAVE)

**Priority**: MEDIUM (improves user understanding of app state)  
**Impact**: Users understand if socket is connected, degraded, or failed  
**Complexity**: Low (UI + use socketStore.state)  
**Est. time**: 1-2 hours

### What needs to happen

1. **Add status indicator in header**
   - Location: `apps/web/src/routes/+page.svelte` header (right side)
   - Show colored dot:
     - 🟢 Green = connected (`state === 'connected'`)
     - 🟡 Amber = degraded/reconnecting (`state === 'degraded'`)
     - 🔴 Red = failed (`state === 'failed'`)
     - ⚫ Gray = idle/not connected (`state === 'idle'` or no socket)

2. **Add tooltip**
   - Hover shows: "Connected", "Reconnecting...", "Connection lost", etc.

3. **Optional: Toast on reconnection**
   - When socket goes from degraded → connected
   - Show: "Reconnected" toast for 3 seconds

4. **Optional: In chat detail**
   - Show connection status in header
   - Helps users know if messages are being sent in real-time

### Files to modify

- `apps/web/src/routes/+page.svelte` — Add indicator in header
- Optionally: `apps/web/src/routes/chat/[id]/+page.svelte` — Add indicator

### Implementation outline

```typescript
// In +page.svelte

import { socketStore } from '$stores/socket.svelte';

// Template:
<div class="status-indicator" class:connected={socketStore.state === 'connected'} 
                               class:degraded={socketStore.state === 'degraded'}
                               class:failed={socketStore.state === 'failed'}
     title={getStatusText(socketStore.state)}>
</div>

// CSS:
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
}

.status-indicator.connected { background: #34d399; }
.status-indicator.degraded { background: #fbbf24; animation: pulse 1s infinite; }
.status-indicator.failed { background: #ff8ca6; }
```

### Testing checklist

- [ ] Indicator shows correct color
- [ ] Color changes when socket state changes
- [ ] Tooltip shows correct text
- [ ] Pulse animation on degraded
- [ ] Toast appears on reconnection (optional)

---

## Summary of Changes

### New files:
- None (all changes to existing files)

### Modified files:
- `apps/web/src/routes/+page.svelte` (add New DM button + indicator)
- `apps/web/src/routes/users/[id]/+page.svelte` (add Message button)
- `apps/web/src/lib/services/api.ts` (add createDm method)

### Backend changes:
- None (endpoints already exist)

### Testing:
- Local dev server: Test all flows
- Android emulator: Full end-to-end testing
- Multiple browsers: Verify cross-browser compatibility

---

## Recommended Order of Implementation

1. **Task 1: New DM button** (2-3 hours)
   - Most critical for unblocking conversations
   - Enables full messaging flow

2. **Task 2: Message button on profile** (1-2 hours)
   - Reuses logic from Task 1
   - Quick win for UX

3. **Task 3: Connection indicator** (1-2 hours, optional)
   - Nice to have, not blocking
   - Can do during emulator testing

---

## Git workflow

For each task:
```bash
# Create feature branch
git checkout -b feat/mvp-new-dm

# Make changes
# Test locally

# Commit
git commit -m "feat: Add new DM button to chat list

- Add user picker modal
- Integrate with chats.createDm() endpoint
- Navigate to new/existing DM chat"

# After testing complete:
git push origin feat/mvp-new-dm

# Create PR for review
```

---

## Definition of Done (per task)

Each task is done when:
- ✅ Code is implemented and tested locally
- ✅ TypeScript compiles without errors: `npm run typecheck`
- ✅ Tests pass: `npm run test`
- ✅ Works on Android emulator
- ✅ No console errors or warnings
- ✅ Responsive design verified (mobile viewport)
- ✅ Error handling works (network errors show toasts)

---

## Known Risks & Mitigations

### Risk 1: DM creation endpoint not idempotent
**Problem**: Creating DM twice creates two chats  
**Mitigation**: Backend should check if DM exists, return existing ID  
**Owner**: Codex should verify this behavior  

### Risk 2: Socket not connected when creating DM
**Problem**: New message doesn't appear in real-time  
**Mitigation**: Navigate to chat and load messages via REST API first  
**Covered by**: Message thread already loads via REST on mount  

### Risk 3: User selecting themselves
**Problem**: Confusing UX  
**Mitigation**: Disable own user in picker, show error if they try  

### Risk 4: Race condition (user picked twice quickly)
**Problem**: Two DM create requests fire  
**Mitigation**: Disable button during request, debounce if needed  

---

## Timeline Estimate

| Task | Effort | Time estimate |
|------|--------|---|
| Task 1: New DM | 2-3 hrs | Today |
| Task 2: Message button | 1-2 hrs | Today or tomorrow |
| Task 3: Connection indicator | 1-2 hrs | Tomorrow (optional) |
| Emulator testing | 4-6 hrs | Tomorrow/next day |
| Bug fixes | 2-4 hrs | As needed |
| **Total** | **10-17 hrs** | **2-3 days** |

---

## Next: Android Emulator Testing

Once all stabilization tasks are done:

1. **Set up Android emulator** (if not already running)
2. **Run full test plan** (see doc 18)
3. **Document any bugs** found
4. **Fix bugs** in priority order
5. **Re-test** on emulator
6. **Release as v2.1.0-alpha.1**

---

## Success Looks Like

After these tasks:
- ✅ User can start a new DM from chat list
- ✅ User can message someone from their profile
- ✅ User can see connection status
- ✅ Full end-to-end chat flow works
- ✅ App is stable and responsive
- ✅ All MVP features are implemented and working

**Ready for v2.1.0-alpha release** 🚀
