# AGENT-HANDOFF-KIMI-AUTH-SCREEN

**Status:** design finalized, prototype shipped, ready to wire into `/auth`
**Author:** Claude (Opus 4.7)
**Date:** 2026-05-19
**Recipient:** Kimi K2.6

## Decision

The new `/auth` screen ships the design and motion of `AuthScreen-V7-07-Ripple.svelte` integrated against the existing real-auth wiring in `apps/web/src/routes/auth/+page.svelte`.

Visual lineage: Aurora Drift card style (article on the left, frosted glass form column on the right), periwinkle aurora background, cool palette only. Wordmark is the sacred `The` italic / `PENT` / `HOUSE` stacked Gelasio.

Six signature interactions, all required:

1. **Drop cap pulse** — italic Didone "T" on the lead paragraph, pulses periwinkle on a 2.4s cycle.
2. **Caret bloom** — focused input shows a soft periwinkle halo behind it, breathes on a 2.4s cycle.
3. **Floating labels** — labels live inside the input by default, lift to top-left and shrink + tint periwinkle on focus or fill.
4. **Sweep underline** — a 2px periwinkle line grows from the input's horizontal center on focus.
5. **Key turn** — circular submit (72px) with a properly-scaled key SVG (38px, bow + shank + two teeth, ~53% fill), rotates 180° on press.
6. **Keystroke ripples** — each keystroke spawns a small periwinkle dot near the caret position that scales out and fades over ~640ms.

These are the only motions on the screen. Tabs use a fly transition on mode change. No other decorative motion.

## Source-of-truth prototype

| File | Purpose |
|---|---|
| `apps/web/src/lib/prototypes/auth-screen/AuthScreen-V7-07-Ripple.svelte` | The full visual + motion spec. Mocked submit. |
| `apps/web/src/lib/prototypes/auth-screen/_shared/Wordmark.svelte` | Sacred wordmark. Reuse as-is. |
| `apps/web/src/lib/prototypes/auth-screen/_shared/AuthInput.svelte` | Input composite (floating label + caret bloom + sweep underline + `ripple` prop). Reuse as-is. |
| `apps/web/src/lib/prototypes/auth-screen/_shared/KeyButton.svelte` | Circular submit with key SVG and 180° rotation. Reuse as-is. |
| `apps/web/src/lib/prototypes/auth-screen/_shared/motion.ts` | `typeReveal`, `stagger`, `tabSwitchIn`, `tabSwitchOut`, `keystrokeRipples`. Reuse as-is. |
| `apps/web/src/lib/prototypes/auth-screen/_shared/authForm.svelte.ts` | **Do not import this from production.** It mocks submit. Production keeps the real-auth state in `+page.svelte`. |

`/prototypes/auth-screen` (the V7 showcase) and all sibling `_shared/` files **stay in the repo** as the design reference. Do not delete them.

## What must be preserved from the current `/auth` route

`apps/web/src/routes/auth/+page.svelte` already contains the real auth logic. **Keep every behavior listed here intact** — the new screen is a re-skin, not a re-implementation:

- **State.** `$state<AuthMode>('login')`, plus `username`, `displayName`, `inviteCode`, `password`, `confirmPassword`, `captchaToken`, `acceptedAlphaNotice`, `error`, `loading`, and the four `altcha*` fields.
- **Password rules.** `PASSWORD_MIN = 10`, `PASSWORD_MAX = 128`. The `strength` derived store and its three flags (`minMet`, `maxOk`, `noSpace`). Show requirements in register mode.
- **canSubmit.** Identical logic: login is permissive on canSubmit (only the submit handler enforces username/password length); register requires strength + invite code + password match + acceptedAlphaNotice + (skipCaptcha or captchaToken).
- **Altcha CAPTCHA.** The dynamic `import('altcha')` in `onMount`, the `customElements.get('altcha-widget')` check, the `secureContext` guard, the `statechange` listener `$effect`, the `<altcha-widget>` element bound via `altchaRef`. Skip captcha when `dev` or `env.PUBLIC_SKIP_CAPTCHA === 'true'`. Use `env.PUBLIC_ALTCHA_API_URL` (falling back to `${env.PUBLIC_API_URL}/api/v1/auth/challenge`).
- **handleSubmit.** Exact same shape: validate strength + match + acceptedAlphaNotice + captcha in register mode (with the same error strings); call `auth.login({ username, password })` or `auth.register({ username, displayName?, password, inviteCode: trim().toUpperCase(), captchaToken: skipCaptcha ? 'dev' : token, acceptTestNotice: true, testNoticeVersion: 'alpha-v1' })`; on success `sessionStore.set(session)` then `goto('/', { replaceState: true })`. On failure, set `error`.
- **resetForm.** Called when switching tabs; clears register-only fields and altcha state.
- **TEST_NOTICE_VERSION = 'alpha-v1'.** Send as-is in register payload.

If anything in the prototype conflicts with this list, the production logic wins.

## What changes

### Files to modify

#### `apps/web/src/routes/auth/+page.svelte`

Replace the markup and styles. Keep the `<script>` block intact except for the additions listed in **Script changes** below. Concretely:

- Import the four production-reusable pieces from the prototype:
  ```ts
  import Wordmark from '$lib/prototypes/auth-screen/_shared/Wordmark.svelte';
  import AuthInput from '$lib/prototypes/auth-screen/_shared/AuthInput.svelte';
  import KeyButton from '$lib/prototypes/auth-screen/_shared/KeyButton.svelte';
  import { typeReveal, stagger, tabSwitchIn, tabSwitchOut } from '$lib/prototypes/auth-screen/_shared/motion';
  import { fly } from 'svelte/transition';
  ```
- Replace the template with the V7-07 Ripple layout (article on the left, glass card on the right, with the Altcha widget added into the register branch — see **Altcha placement** below).
- Replace the style block wholesale with V7-07's CSS, plus the additions in **Style additions** below.

#### `apps/web/src/lib/prototypes/auth-screen/_shared/AuthInput.svelte`

No change required for production use, but be aware: the component accepts `value`, `label`, `type` (`text` | `password`), `autocomplete`, `autocapitalize`, `spellcheck`, `disabled`, `optional`, `upper`, `extra`, `ripple` (bool). For the real route, pass `ripple` on every field.

### Script changes

The existing script in `+page.svelte` needs three small additions:

1. **Helpers for the strength UI.** Keep the existing `strength` derived value but also derive a single boolean for use as a class hook:
   ```ts
   const showStrength = $derived(mode === 'register' && password.length > 0);
   ```
2. **handleSubmit reroute.** `KeyButton` exposes an `onpress` callback rather than a native submit click. Wire it to call `handleSubmit(new Event('submit'))` so the existing handler runs unchanged. Alternatively, keep `<form onsubmit={handleSubmit}>` wrapping the inputs and let the implicit submit on Enter still work — `KeyButton` already has `type="submit"`, so a `<form>` wrap works. Use the form-wrapping approach; it's simpler and preserves Enter-to-submit.
3. **Wordmark + ripple imports** as listed above.

No removals. Do not touch the auth contract.

### Style additions

V7-07's styles cover the bulk. Add three small things to support the real-auth UI:

- **Password requirements box** (register mode only, shown below the confirm password field):
  ```css
  .reqs { padding: 10px 14px; background: oklch(0.69 0.140 285 / 0.06); border: 1px solid oklch(0.69 0.140 285 / 0.12); border-radius: 10px; font-family: var(--font-display); font-size: 0.85rem; color: oklch(0.93 0.012 280 / 0.78); display: flex; flex-direction: column; gap: 4px; }
  .req { display: flex; align-items: center; gap: 8px; transition: color 220ms cubic-bezier(0.22, 1, 0.36, 1); }
  .req::before { content: '○'; font-size: 0.7rem; color: var(--p-muted); }
  .req.met { color: var(--p-success); }
  .req.met::before { content: '●'; color: var(--p-success); }
  ```
- **Altcha host** (wraps the `<altcha-widget>`):
  ```css
  .altcha { padding: 14px; background: oklch(0 0 0 / 0.18); border: 1px solid var(--p-line); border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 96px; }
  .altcha.failed { border-color: color-mix(in oklch, var(--p-error) 35%, var(--p-line)); background: color-mix(in oklch, var(--p-error) 8%, oklch(0 0 0 / 0.18)); }
  .altcha-hint { font-family: var(--font-display); font-style: italic; font-size: 0.85rem; color: var(--p-muted); }
  .altcha-hint.verified { color: var(--p-success); }
  .altcha-hint.err { color: var(--p-error); }
  :global(altcha-widget) {
    --altcha-border-radius: 12px;
    --altcha-border-color: oklch(1 0 0 / 0.10);
    --altcha-color-base: var(--p-surface);
    --altcha-color-base-text: var(--p-text);
    width: 100%;
  }
  ```
- **Alpha notice check** matches the existing prototype `.check` style; you can reuse the prototype's CSS verbatim.

### Markup layout

Inside the existing `<form onsubmit={handleSubmit}>` (you'll wrap the whole right-side glass card body in the form so Enter still submits):

```svelte
<form onsubmit={handleSubmit} class="form">
  <AuthInput
    label="Username"
    bind:value={username}
    autocomplete="username"
    autocapitalize="none"
    disabled={loading}
    ripple
  />
  <AuthInput
    label="Password"
    type="password"
    bind:value={password}
    autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
    disabled={loading}
    ripple
  />

  {#if mode === 'register'}
    <AuthInput
      label="Confirm password"
      type="password"
      bind:value={confirmPassword}
      autocomplete="new-password"
      disabled={loading}
      ripple
    />

    <div class="reqs" aria-live="polite">
      <span class="req" class:met={strength.minMet}>{PASSWORD_MIN}–{PASSWORD_MAX} characters ({password.length})</span>
      <span class="req" class:met={strength.noSpace}>No leading or trailing spaces</span>
    </div>

    <AuthInput
      label="Display name"
      bind:value={displayName}
      autocomplete="name"
      disabled={loading}
      optional
      ripple
    />

    <AuthInput
      label="Invite code"
      bind:value={inviteCode}
      autocapitalize="characters"
      spellcheck={false}
      disabled={loading}
      upper
      ripple
    />

    {#if !skipCaptcha}
      <div class="altcha" class:failed={altchaFailed}>
        {#if altchaFailed}
          <p class="altcha-hint err">CAPTCHA failed. Reload and try again.</p>
        {:else if altchaReady}
          <altcha-widget
            bind:this={altchaRef}
            challengeurl={ALTCHA_URL}
            hidelogo
            auto="off"
          ></altcha-widget>
          <span class="altcha-hint"
            class:verified={altchaStatus === 'verified'}>
            {#if altchaStatus === 'verifying'}Verifying…
            {:else if altchaStatus === 'verified'}<em>Verified.</em>
            {:else}Solve the puzzle.{/if}
          </span>
        {:else}
          <span class="altcha-hint">Loading verification…</span>
        {/if}
      </div>
    {/if}

    <label class="check">
      <input type="checkbox" bind:checked={acceptedAlphaNotice} disabled={loading} />
      <span><em>An alpha.</em> Data may be wiped without warning.</span>
    </label>
  {/if}

  {#if error}<p class="error">{error}</p>{/if}

  <KeyButton
    loading={loading}
    disabled={loading || (mode === 'register' && !canSubmit)}
    label={mode === 'login' ? 'Turn the key' : 'Open the door'}
  />
</form>
```

Wrap the form with the `{#key mode}` block + `in:fly={tabSwitchIn} out:fly={tabSwitchOut}` from V7-07 so the tab-switch motion fires. The tabs themselves and the article/header markup come straight from V7-07 — just remove the `createAuthForm()` plumbing and use the real `mode`, `username`, `password`, etc. directly.

### Altcha placement

Altcha lives inside the `{#if mode === 'register'}` block, between the invite code field and the alpha-notice checkbox. Its host `.altcha` div carries the dark inner panel; the existing `:global(altcha-widget)` CSS overrides set its border/background to match the glass aesthetic.

The widget is only rendered when `!skipCaptcha`. When `skipCaptcha` is true (dev / `PUBLIC_SKIP_CAPTCHA=true`), the alpha-notice check follows immediately after invite code.

### KeyButton disabled vs canSubmit

In login mode, `canSubmit` is permissive — `KeyButton` should still be pressable unless `loading`. Use:

```svelte
disabled={loading || (mode === 'register' && !canSubmit)}
```

The existing `handleSubmit` does its own username/password presence validation by calling `auth.login` which will throw if credentials are empty or invalid. The visual disabled-state in login is reserved for the loading spinner.

## Verification

Run from `apps/web`:

1. `npm run dev` → open `http://localhost:5173/auth`. Confirm the redesign renders.
2. **Login flow (dev, no captcha).**
   - Try empty username + password: button is pressable, real `auth.login` throws; error appears in the periwinkle pill.
   - Type a real dev username + password; click the key. Button rotates, dot pulses on key center while loading, redirect to `/` on success.
3. **Register flow (dev).** Set `PUBLIC_SKIP_CAPTCHA=true` (or run with `dev`) so Altcha is bypassed.
   - Type a password that's 5 characters: requirements row shows `5` in red dot for char count.
   - Type a password that's 12 characters: row shows green.
   - Add a leading space: `noSpace` requirement turns red.
   - Fill all fields, check the alpha-notice box: button enables; press it; account creates; redirect to `/`.
4. **Register flow (CAPTCHA on).** Set `PUBLIC_SKIP_CAPTCHA=false` and `PUBLIC_ALTCHA_API_URL` to a working challenge URL.
   - Confirm the widget mounts inside the glass aesthetic.
   - Confirm the `statechange` listener still updates `captchaToken` correctly.
   - Solve the puzzle; submit succeeds.
5. **Motion check.**
   - Focus an input — confirm the floating label lifts, the bloom halo appears and breathes, the sweep underline grows from center.
   - Type a character — confirm a small periwinkle dot ripples out near the caret.
   - Scroll-reload — confirm wordmark + headline + lead + card fade in with stagger.
   - Press the key — confirm the SVG rotates 180° once and the dot pulses while `loading`.
6. **Reduced motion.** In DevTools simulate `prefers-reduced-motion: reduce`. Confirm bloom + sweep + ripple all become instant or disappear; key still rotates instantly; drop cap holds steady.
7. **Mobile.** Resize to 375×812. Confirm the article collapses above the glass card, all inputs are tappable, key button stays at 72px, ripples still spawn on touch typing.
8. **Typecheck.** `npm run typecheck` should report `0 ERRORS`.

## Out of scope

- Don't change the `auth.login` or `auth.register` HTTP contracts.
- Don't touch the Altcha module choice or the dynamic import.
- Don't ship light-theme support yet — auth stays periwinkle-dark.
- Don't remove the prototype showcase at `/prototypes/auth-screen` — it remains as design reference.
- OAuth, magic link, passwordless: still out of scope.

## One-liner

Re-skin `/auth` with V7-07 Ripple's three components (`Wordmark`, `AuthInput`, `KeyButton`) and motion, keeping every line of existing auth logic — state, Altcha, validation, redirect — intact. The six interactions on the spec are the contract; nothing else animates.
