# Agent Handoff: Codex — Auth Screen V7-07 Wiring & Backend Review

**Date:** 2026-05-19
**Author:** Kimi K2.6
**Recipient:** Codex
**Scope:** Post-implementation review of `/auth` V7-07 Ripple re-skin

## What Changed

Single file: `apps/web/src/routes/auth/+page.svelte` (460 insertions, 219 deletions).

The auth screen was re-skinned from a mobile-first single-column card to the V7-07 Ripple design: two-column desktop layout (editorial article left, frosted-glass form right), aurora background, periwinkle palette, with six signature motion interactions.

### Preserved (unchanged logic)

All existing auth behavior is intact:

- State variables: `mode`, `username`, `displayName`, `inviteCode`, `password`, `confirmPassword`, `captchaToken`, `acceptedAlphaNotice`, `error`, `loading`
- Altcha state: `altchaRef`, `altchaReady`, `altchaFailed`, `altchaStatus`
- Constants: `PASSWORD_MIN = 10`, `PASSWORD_MAX = 128`, `TEST_NOTICE_VERSION = 'alpha-v1'`
- `skipCaptcha` logic (`dev || env.PUBLIC_SKIP_CAPTCHA === 'true'`)
- `ALTCHA_URL` resolution (env → fallback)
- `strength` derived value (`minMet`, `maxOk`, `noSpace`)
- `canSubmit` derived value (unchanged logic)
- `resetForm()` (clears register-only fields + altcha state)
- `onMount` dynamic `import('altcha')` with `customElements.get` guard and `secureContext` check
- `statechange` listener `$effect` that updates `captchaToken`
- `handleSubmit` — identical shape, same validation order, same error strings, same `auth.login`/`auth.register` calls with identical payloads (including `acceptTestNotice: true`, `testNoticeVersion: 'alpha-v1'`)
- `sessionStore.set(session)` + `goto('/', { replaceState: true })` on success

### Added (wiring)

- `showStrength` derived: `$derived(mode === 'register' && password.length > 0)`
- `formEl` bind: `let formEl = $state<HTMLFormElement | undefined>()`
- Prototype imports:
  - `Wordmark` (sacred Gelasio wordmark component)
  - `AuthInput` (composite with floating label + caret bloom + sweep underline + keystroke ripples)
  - `KeyButton` (circular submit with key SVG, 180° rotation on press)
  - `typeReveal`, `stagger`, `tabSwitchIn`, `tabSwitchOut` from `motion.ts`
- `fly` transition from `svelte/transition`
- Form wrapping: `<form bind:this={formEl} onsubmit={handleSubmit}>`
- KeyButton submit: `onpress={() => formEl?.requestSubmit()}`

### Layout changes

- **Desktop (>1000px):** CSS grid `1fr 460px`, article on left, glass card on right
- **Mobile (≤1000px):** Single column, article above card
- **Field order in register mode:** Username → Password → Confirm password → Requirements → Display name → Invite code → Altcha → Alpha notice checkbox
- **Tabs:** "Returning" / "First arrival" pill-style segmented control
- **Article copy:** "Every letter leaves a wake." / "A name typed, a ripple kept." / Drop-cap lead paragraph

## What Codex Should Verify

### 1. Auth contract integrity

Confirm that `handleSubmit` still calls `auth.login` and `auth.register` with the exact same payloads as before:

```ts
// login
auth.login({ username, password })

// register
auth.register({
  username,
  ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
  password,
  inviteCode: inviteCode.trim().toUpperCase(),
  captchaToken: skipCaptcha ? 'dev' : captchaToken,
  acceptTestNotice: true,
  testNoticeVersion: TEST_NOTICE_VERSION
})
```

Verify no extra fields were added and no fields were dropped.

### 2. Altcha wiring

- The `<altcha-widget>` element is still bound via `bind:this={altchaRef}`
- It still receives `challengeurl={ALTCHA_URL}`, `hidelogo`, `auto="off"`
- The `statechange` listener still extracts `detail.state` and `detail.payload`
- `captchaToken` still updates from the listener
- `altchaRef?.reset?.()` is still called in `resetForm()`
- Skip-captcha bypass still works in dev mode

### 3. Form submission paths

Two paths to submit:

1. **Enter key** inside any input → native form submit → `handleSubmit(e)`
2. **KeyButton click** → `onpress` → `formEl?.requestSubmit()` → triggers form's `onsubmit` → `handleSubmit(e)`

Verify both paths work and that `e.preventDefault()` is still called at the top of `handleSubmit`.

### 4. Validation flow

- Login mode: `canSubmit` is permissive (always true), `KeyButton` is only disabled when `loading`
- Register mode: `KeyButton` is disabled when `loading || !canSubmit`
- `handleSubmit` still re-validates strength, password match, alpha notice, and captcha in register mode
- Error strings are unchanged

### 5. Tab switch behavior

- Clicking "Returning" sets `mode = 'login'` and calls `resetForm()`
- Clicking "First arrival" sets `mode = 'register'` and calls `resetForm()`
- The `{#key mode}` block wraps the form and triggers `fly` transition
- Verify `resetForm()` clears all register-only state and resets Altcha

### 6. CAPTCHA render

In a real browser with `PUBLIC_SKIP_CAPTCHA=false` and a working `PUBLIC_ALTCHA_API_URL`:

- Confirm the Altcha widget mounts inside the `.altcha` host div
- Confirm solving the puzzle updates the hint text to "Verified."
- Confirm the widget's CSS custom properties override its appearance to match the glass aesthetic

### 7. Error display

- Trigger an invalid login → confirm error appears in the `.error` pill below the form fields
- Trigger a register with mismatched passwords → confirm "Passwords do not match." appears

### 8. SSR / hydration

The auth page uses client-side Svelte actions (`typeReveal`, `keystrokeRipples`). Verify there are no hydration mismatches:

- `typeReveal` sets `opacity: 0` via inline styles in the action — check this doesn't conflict with SSR output
- `AuthInput` uses `placeholder=" "` for the floating label CSS trick — verify this doesn't cause a11y warnings in the build

### 9. Accessibility

- All inputs still have proper `autocomplete` attributes
- The alpha notice checkbox has a `<label>` wrapping it
- `aria-live="polite"` is on the requirements box
- `aria-hidden="true"` is on decorative elements (bloom, sweep, dropcap duplicate)
- KeyButton has `aria-label`

### 10. Mobile

- At 375×812, confirm the article collapses above the glass card
- Confirm all inputs are tappable
- Confirm the keyboard doesn't obscure the submit button

## Files to Inspect

- `apps/web/src/routes/auth/+page.svelte` (the only changed file)
- `apps/web/src/lib/prototypes/auth-screen/_shared/AuthInput.svelte`
- `apps/web/src/lib/prototypes/auth-screen/_shared/KeyButton.svelte`
- `apps/web/src/lib/prototypes/auth-screen/_shared/Wordmark.svelte`
- `apps/web/src/lib/prototypes/auth-screen/_shared/motion.ts`

## Verification Commands

```bash
cd /Users/aim/Documents/The\ Penthouse
npm --workspace @penthouse/web run typecheck
npm --workspace @penthouse/web run build
npm run validate
```

Expected: 0 errors, all tests pass.

## Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| `formEl?.requestSubmit()` not supported in older browsers | Low | Enter key still works via native form submit; KeyButton click degrades gracefully |
| `typeReveal` SSR/hydration mismatch | Low | Action runs after mount; no SSR-rendered state depends on it |
| Altcha widget CSS custom properties not applied | Low | `:global(altcha-widget)` override is unchanged from prior working version |
| Field order change confuses users | Low | UX improvement — confirm password now follows password immediately |

## One-liner for Codex

Review the wiring in `apps/web/src/routes/auth/+page.svelte` to confirm all auth contracts, Altcha integration, validation logic, and submit paths remain intact after the V7-07 visual re-skin. Run the verification commands and do a live browser check of both login and register flows.
