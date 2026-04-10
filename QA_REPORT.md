# QA Report — The Penthouse PWA (Branch: `pwa`)

**Date**: 2026-04-10  
**Tester**: Gemini AI QA Agent  
**Test Suites Run**: `suite-auth`, `suite-chat`, `suite-reactions-replies-pins`, `suite-polls`, `suite-gif`, `suite-users`  
**Infrastructure**: Playwright v1+ · Chromium headless · 1 worker · 1280×720 viewport

---

## Executive Summary

| Suite | Tests | Passed | Failed | Notes |
|---|---|---|---|---|
| `suite-auth` | 10 | 4 | 6 | 3 app bugs + 3 test-code issues |
| `suite-chat` | 10 | 0 | 10 | All blocked by critical socket bug (see below) |
| `suite-reactions-replies-pins` | — | — | — | Not completed (blocked same root cause) |
| `suite-polls` | — | — | — | Not completed |
| `suite-gif` | — | — | — | Not completed |
| `suite-users` | — | — | — | Not completed |

---

## 🔴 Critical App Bug: Socket Never Reconnects After Hard Page Reload

**Severity**: Critical  
**Affects**: All real-time features (chat, reactions, read receipts, presence, GIF delivery)

### Root Cause
`socketStore.connect(accessToken)` is called in exactly **one place**: inside `auth/+page.svelte`'s `handleSubmit()`.

When an authenticated user:
- Refreshes the page (F5 / hard reload)
- Opens the app at `http://localhost:5173/` directly (e.g., from browser history)
- Returns to the app from another tab after a session

…the JS module re-initializes with `socketStore.state = 'idle'`. Nothing calls `socketStore.connect()` again. The user sees the connection dot as `⚪` (idle) and all real-time events are silently dropped.

### Evidence
Every chat E2E test snapshot shows `generic "idle"` for the connection status element, meaning the socket was never connected even though the user is authenticated.

### Fix Required
Add socket reconnect logic in `+layout.svelte`. On mount, if `sessionStore.isAuthenticated` and `socketStore.state === 'idle'`, call `socketStore.connect(sessionStore.accessToken)`.

```svelte
// In +layout.svelte onMount or $effect
$effect(() => {
  if (sessionStore.isAuthenticated && socketStore.state === 'idle') {
    socketStore.connect(sessionStore.accessToken);
  }
});
```

---

## 🔴 Real App Bug: Submit Button Not Disabled on Invalid Password

**Severity**: High  
**Affects**: `suite-auth` tests #3 and #4 (registration form validation)

### Behavior
- Filling password field with < 10 characters: submit button stays **enabled**
- Filling mismatched confirm password: submit button stays **enabled**

The password requirements UI shows green/red indicators correctly, but the submit button is only `disabled={loading}`, not gated on password validity.

### Evidence
```
[chromium] Locator: locator('button[type="submit"]')
Expected: disabled
Received: enabled  (password was 'short' — only 5 chars)
```

### Fix Required
In `auth/+page.svelte`, derive `isSubmitEnabled` from password validation:
```svelte
const canSubmit = $derived(
  mode === 'login' || (
    getPasswordValid() &&
    password === confirmPassword &&
    acceptedAlphaNotice &&
    !!captchaToken
  )
);
```
And bind: `<button type="submit" disabled={loading || !canSubmit}>`

---

## 🟡 Test Suite Bugs (Not App Bugs)

### Test Duplicate Username (suite-auth #2)
After `registerUser` (which navigates to `/`), the test tries to navigate back to `/auth` to re-register. But the `page.goto('/auth')` fails because the previous page context closed. The test also doesn't call `loginUser` to log out first — it tries a CSS selector `button[hasText=/sign out|logout/i]` that doesn't match the actual "Sign out" button in settings.

### Test Login Flows (suite-auth #6, #7)
Tests use `page.getByRole('button', { name: 'Sign in' })` which resolves to **2 elements**: the tab button AND the submit button. Playwright strict mode requires exactly 1 match. Fix: use `page.locator('button[type="submit"]')` or `page.locator('.mode-tabs').getByRole('button', { name: 'Sign in' })` for the tab.

---

## 🟡 Visual / Layout Issues Observed

### 1. Connection Status Dot Label
The brief `GEMINI-TEST-BRIEF.md` says to check `.conn-dot` but the actual element has class `status-dot` (from `+layout.svelte` DOM). Tests using `.conn-dot` will fail.

### 2. Auth Form at Desktop Viewport (1280×720)
The auth card is centered with ~712px max-width. The "Sign in" tab button and "Create account" tab button are visible AND the submit button below shows the same text as the active tab. This creates two buttons named "Sign in" in the accessibility tree, causing Playwright strict mode violations.

**Design observation**: On desktop, the form is visually fine, but the accessibility tree is ambiguous — both the tab and submit button have identical accessible names. Consider adding `aria-label` attributes to distinguish them.

---

## 🟡 Test Infrastructure Issues Found & Fixed

### E2E Registration Utility (`utils.ts`) — Fixed ✅
**Root cause**: `page.goto('/auth', { waitUntil: 'domcontentloaded' })` loaded the page before SvelteKit hydrated Svelte 5 reactive state. Clicking "Create account" tab triggered the `onclick` but the reactive `mode = 'register'` update wasn't visible to Playwright's next interaction.

**Fix applied**: Changed to `waitUntil: 'networkidle'` + `createAccountTab.waitFor({ state: 'visible' })` + `waitForFunction(() => submitBtn.textContent === 'Create account')`. This ensures SvelteKit is fully hydrated before form interaction.

**Result**: Registration tests now complete in ~1.2s instead of timing out at 120s.

---

## Recommended Fixes (Priority Order)

1. **[CRITICAL]** Add socket auto-reconnect in `+layout.svelte` — all real-time tests blocked
2. **[HIGH]** Gate register submit button on password validation state
3. **[LOW]** Add `aria-label` to auth form tab buttons and submit button to avoid accessibility tree ambiguity
4. **[LOW]** Fix `suite-auth.spec.ts` test code: use `button[type="submit"]` for login submit clicks

---
