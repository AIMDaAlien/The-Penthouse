# Handoff: E2E Test Hardening → Codex

## Context
Antigravity attempted to harden and validate the Playwright E2E suite. Stabilized auth-flow selectors, discovered a severe DOM churn bug in ChatListPane, and exhausted workarounds. Passing to Codex to either fix the root cause in the Svelte components or find a viable test strategy.

## Current State

**Branch:** `main` (uncommitted changes staged — see commit below)
**Backend:** Running on `:3000` with `DISABLE_RATE_LIMIT=true`
**Frontend:** Running on `:5173`

### Test Results (24 tests, 3 spec files)

| Spec | Passing | Failing |
|------|---------|---------|
| `auth-flow.spec.ts` | 9/12 | `duplicate username` on firefox + webkit |
| `folders-channels.spec.ts` | 0/9 | All fail on DOM churn / click not navigating |
| `audio-messages.spec.ts` | 0/3 | Mic click doesn't transition; General chat click fails |

### Passing Tests
- `register, login, logout, session persistence` ✅ (all browsers)
- `weak password rejected` ✅ (all browsers)
- `no CAPTCHA in dev mode` ✅ (all browsers)

## Files Changed in This Session

```
M  apps/web/playwright.config.ts          # workers: 1, fullyParallel: false
M  apps/web/e2e/auth-flow.spec.ts          # ID selectors, "Sign out" modal, force clicks
M  apps/web/e2e/folders-channels.spec.ts   # :visible selectors, force clicks, "# random"
M  apps/web/e2e/audio-messages.spec.ts     # force clicks, .audio-player check
M  services/api/src/config/env.ts          # DISABLE_RATE_LIMIT env var
M  services/api/src/middleware/rateLimit.ts # Skip when DISABLE_RATE_LIMIT=true
```

## Critical Finding: ChatListPane Infinite Re-Render

**Symptom:** After navigating `/auth` → `/`, the visible `ChatListPane` header mutates continuously (~1,000 remounts/sec). The "New folder" button is removed and re-added to the DOM every 1–2ms.

**Impact:**
- Playwright actionability checks fail (element never "stable")
- Even `click({ force: true })` often doesn't trigger the Svelte `onclick` handler
- Clicks on chat items (`Open chat General`) don't trigger `goto('/chat/...')`

**Verified via MutationObserver:**
```
ADDED button parent=header hidden=false
ADDED button parent=header hidden=false
... (repeats hundreds of times per second)
```

## Hypotheses for Root Cause

1. **Svelte 5 `$effect` feedback loop**
   - `DesktopShell` has `$effect` watching `chatsStore.chats.length` / `loading`
   - Home page (`+page.svelte`) has separate `$effect` calling `chatsStore.load()`
   - Both fire on mount; store updates may be re-triggering one or both effects

2. **Prop reference churn**
   - Home page passes arrow-function callbacks (`onSelectChat`, `onCreateFolder`, `onMoveToFolder`) to `ChatListPane`
   - Parent re-renders → new function references → Svelte 5 treats props as changed → child re-renders → parent re-renders...

3. **View Transitions API interference**
   - Root layout `onNavigate` wraps every navigation in `document.startViewTransition()`
   - Pseudo-elements may persist longer than expected and intercept events

## What Was Already Tried (and didn't fully work)

| Approach | Result |
|----------|--------|
| `click({ force: true })` | Click fires but Svelte handler often doesn't execute |
| `:visible` pseudo-selector | Correctly targets visible instance (not hidden sidebar) |
| `page.evaluate()` JS click | Same result — DOM mutates, state doesn't update |
| `page.waitForTimeout(2000)` | DOM still churning after 2s |
| Disable `document.startViewTransition` | No change |
| Serial workers (`workers: 1`) | Fixes parallel hydration race, not the churn |

## Known Selector Fixes Already Applied

- Logout button text: **"Sign out"** (not "Log out") + confirmation modal
- Channel button accessible name: **"# random"** (not "random")
- Auth page uses ID selectors: `#username`, `#display-name`, `#password`, `#confirm-password`
- Alpha notice checkbox: `getByLabel(/I understand/i)`

## Suggested Next Steps

1. **Fix the infinite re-render first.** Add `console.count('ChatListPane render')` or use Svelte DevTools to confirm the loop. Check if memoizing callback props with `$derived` or stable references breaks the cycle.

2. **If fixing the component is complex**, consider adding a `data-testid` or `e2e-stable` class to the ChatListPane header and using Playwright's `locator(...).first()` with a short retry loop.

3. **For the auth tab switch failure on firefox/webkit**, try `page.getByRole('tab', { name: 'Create account' }).click()` instead of the `.filter()` chain.

4. **For audio messages**, the `MediaRecorder` may not start in headless browsers even with fake media flags. Consider mocking `navigator.mediaDevices.getUserMedia` in a `page.addInitScript()`.

## How to Run

```bash
# Terminal 1 — backend
cd services/api && DISABLE_RATE_LIMIT=true npm run dev

# Terminal 2 — frontend
cd apps/web && npm run dev

# Terminal 3 — tests
cd apps/web && npx playwright test --workers=1 --reporter=list
```

## Commit Ready

All changes are staged. Run `git commit` with message:
```
test(e2e): selector hardening, serial workers, DISABLE_RATE_LIMIT

- playwright.config: workers=1, fullyParallel=false
- auth-flow: "Sign out" modal, ID selectors, force clicks
- folders-channels: :visible pseudo-selectors, "# random" channel names
- audio-messages: force clicks, .audio-player check
- api: DISABLE_RATE_LIMIT env var + middleware skip

Known issues: ChatListPane infinite DOM churn blocks
folders-channels and audio-messages post-auth flows.
Handing off to Codex for root-cause fix.
```
