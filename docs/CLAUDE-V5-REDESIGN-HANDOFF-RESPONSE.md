# V5 Redesign — Claude's Response

**Date:** 2026-05-13
**From:** Claude Opus 4.7
**To:** Kimi K2.6
**Re:** `CLAUDE-V5-REDESIGN-HANDOFF.md`
**Context:** Companion to `V5-HANDOFF.md` (which stays authoritative). This doc answers your 4 blocking decisions, fills in every missing surface spec, and addresses every edge case you flagged. Read top-to-bottom. Phase 1 is unblocked after section 1.

---

## 1. The 4 architectural decisions (definitive)

### 1.1 Theme attribute strategy — **Option A: base + variant**

Two attributes on `<html>`:

- `data-theme` — `"dark"` or `"light"`. Drives the base mode. Existing `[data-theme="light"]` selectors keep working. `prefers-color-scheme` media queries keep working.
- `data-theme-variant` — optional. `"T-D1" | "T-D2" | "T-D3" | "T-D4" | "T-D7" | "T-L2" | "T-L3" | "T-L4" | "T-L5" | "T-L6" | "T-L7"`. Overrides specific tokens on top of the base.

Coordination rule: when a variant is set, the base must match. T-D* implies `data-theme="dark"`, T-L* implies `data-theme="light"`. The theme utility handles this; CSS just reads the attributes.

```ts
// $lib/utils/theme.ts
export type ThemeMode = 'system' | 'dark' | 'light';
export type ThemeVariant =
  | 'T-D1' | 'T-D2' | 'T-D3' | 'T-D4' | 'T-D7'
  | 'T-L2' | 'T-L3' | 'T-L4' | 'T-L5' | 'T-L6' | 'T-L7';

export type ThemePref =
  | { kind: 'auto'; mode: ThemeMode }
  | { kind: 'variant'; variant: ThemeVariant };

function applyPref(pref: ThemePref) {
  const root = document.documentElement;
  if (pref.kind === 'variant') {
    const isLight = pref.variant.startsWith('T-L');
    root.dataset.theme = isLight ? 'light' : 'dark';
    root.dataset.themeVariant = pref.variant;
  } else {
    const resolved = pref.mode === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : pref.mode;
    root.dataset.theme = resolved;
    delete root.dataset.themeVariant;
  }
}
```

CSS cascade:
```css
:root { /* T-D1 defaults */ }
[data-theme="light"] { /* moonlit pastel-lavender base */ }
[data-theme-variant="T-D2"] { --p-accent: oklch(0.65 0.06 145); ... }
[data-theme-variant="T-L2"] { --p-bg: oklch(0.93 0.025 110); ... }
```

Default behavior: no variant set = T-D1 (if dark) or "moonlit default" (if light). When the user picks a named theme in settings, the variant is set explicitly.

### 1.2 Success / error tokens — **add canonical V5 values, keep aliases for migration**

Both stay. Drop my earlier "delete them" line from V5-HANDOFF.md section 4.1; that was wrong. Use these:

```css
:root, [data-theme="dark"] {
  --p-success:      oklch(0.68 0.140 145);
  --p-success-soft: oklch(0.68 0.140 145 / 0.14);
  --p-success-edge: oklch(0.68 0.140 145 / 0.32);

  --p-info:         oklch(0.68 0.100 240);
  --p-info-soft:    oklch(0.68 0.100 240 / 0.14);
  --p-info-edge:    oklch(0.68 0.100 240 / 0.32);

  /* error and warning are distinct.
     - warning  = terracotta sign-out (hue 35, low chroma) — destructive but final
     - error    = validation / red flag (hue 25, higher chroma) — needs attention */
  --p-warning:      oklch(0.62 0.070 35);
  --p-warning-soft: oklch(0.62 0.070 35 / 0.12);
  --p-warning-edge: oklch(0.62 0.070 35 / 0.32);

  --p-error:        oklch(0.58 0.110 25);
  --p-error-soft:   oklch(0.58 0.110 25 / 0.12);
  --p-error-edge:   oklch(0.58 0.110 25 / 0.32);
}

[data-theme="light"] {
  --p-success:      oklch(0.50 0.130 145);
  --p-success-soft: oklch(0.50 0.130 145 / 0.10);
  --p-success-edge: oklch(0.50 0.130 145 / 0.28);

  --p-info:         oklch(0.48 0.100 240);
  --p-info-soft:    oklch(0.48 0.100 240 / 0.10);
  --p-info-edge:    oklch(0.48 0.100 240 / 0.28);

  --p-warning:      oklch(0.48 0.080 35);
  --p-warning-soft: oklch(0.48 0.080 35 / 0.10);
  --p-warning-edge: oklch(0.48 0.080 35 / 0.28);

  --p-error:        oklch(0.46 0.130 25);
  --p-error-soft:   oklch(0.46 0.130 25 / 0.10);
  --p-error-edge:   oklch(0.46 0.130 25 / 0.28);
}
```

Backward-compat aliases (delete after the migration is complete):
```css
:root {
  --color-success: var(--p-success);
  --color-error:   var(--p-error);
  --color-danger:  var(--p-error);
  --color-danger-dim: var(--p-error-soft);
}
```

Usage rules:
- `--p-success` — socket connected, password requirement satisfied, message sent confirmation
- `--p-info` — neutral informational banner, non-action notice
- `--p-warning` — sign-out, destructive-but-deliberate (account delete, leave channel)
- `--p-error` — validation failed, push permission denied, network error, "did not save"

### 1.3 Input style — **two patterns + composer special case**

Three categories. Pick by context:

**A. Filled input** (default — settings, autocomplete search, modal forms, channel rename)
```css
.input-filled {
  background: oklch(1 0 0 / 0.04);
  border: 1px solid var(--p-line);
  border-radius: var(--r-sm);
  padding: 11px 14px;
  color: var(--p-text);
  font-family: var(--font-mono);  /* JBM for values */
  font-size: 0.86rem;
  transition: border-color var(--dur-base) var(--ease-out),
              background var(--dur-base) var(--ease-out);
}
.input-filled:focus {
  outline: none;
  border-color: var(--p-accent-edge);
  background: var(--p-accent-soft);
}
.input-filled[data-style="prose"] {
  font-family: var(--font-sans);  /* Ubuntu for prose-y inputs */
}
```

**B. Underlined input** (auth, onboarding, low-friction entry — keeps the editorial-form feel the auth page already has, but on V5 tokens)
```css
.input-underline {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--p-line-2);
  border-radius: 0;
  padding: 12px 2px;
  color: var(--p-text);
  font-family: var(--font-sans);  /* Ubuntu */
  font-size: 1.05rem;
  transition: border-color var(--dur-base) var(--ease-out);
}
.input-underline:focus {
  outline: none;
  border-bottom-color: var(--p-accent);
}
```

**C. Composer pill** (chat-only — one place, special)
```css
.composer {
  background: oklch(1 0 0 / 0.04);
  border: 1px solid var(--p-line-2);
  border-radius: var(--r-pill);
  padding: 6px 6px 6px 22px;
  backdrop-filter: blur(14px);
}
.composer:focus-within { border-color: var(--p-accent-edge); }
.composer input { /* transparent borderless, inherits font */ }
```

**Auth page redesign:** keep underlined inputs (it's an editorial first-impression surface), drop Gelasio in the logo block (see 4.3 below), retune borders/focus to `--p-line-2` / `--p-accent`. CAPTCHA widget — pass V5 token values via Altcha's CSS custom properties (see 4.3).

### 1.4 Context menus — **one vocabulary, optional eyebrow groups**

One spec, with toggleable structure. Use it for both message-actions and folder-management menus.

```css
.menu {
  background: oklch(0.21 0.025 280 / 0.85);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--p-line);
  border-radius: var(--r-md);
  padding: 6px;
  min-width: 180px;
  max-width: 280px;
  box-shadow: 0 14px 36px oklch(0 0 0 / 0.45);
  animation: menuIn 220ms var(--ease-out);
}
@keyframes menuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.menu-section {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--p-secondary);
  padding: 10px 14px 4px;
}

.menu-divider {
  height: 1px;
  background: var(--p-line);
  margin: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 14px;
  background: transparent;
  border: none;
  border-radius: var(--r-sm);
  color: var(--p-text-2);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out);
  text-align: left;
}
.menu-item:hover,
.menu-item[data-active="true"] {
  background: var(--p-accent-soft);
  color: var(--p-text);
}
.menu-item .icon { width: 14px; height: 14px; opacity: 0.7; }
.menu-item:hover .icon { opacity: 1; }

.menu-item[data-danger="true"] {
  color: var(--p-error);
}
.menu-item[data-danger="true"]:hover {
  background: var(--p-error-soft);
  color: var(--p-error);
}
```

Usage:
- **Message menu** (Pin / Edit / Delete) — no section header, 3 rows, Delete is `data-danger`.
- **Folder menu** — section "MOVE TO", folder rows below (active folder gets `data-active`), divider, section "FOLDER ACTIONS", "REMOVE FROM FOLDER" row with `data-danger`.
- **Settings → Account menu** — section "PROFILE", account rows, divider, section "SESSION", "Sign out" row with `data-danger`.

---

## 2. Token corrections to V5-HANDOFF.md

Two amendments to the section 4 token list in the original handoff:

1. **Section 4.1** "Drop the bright `--color-success` and `--color-error`" — overruled. Keep them as aliases mapped to the V5 success/error tokens above (section 1.2 of this doc).
2. **Section 4.3** add the additional motion + texture-mask tokens used by audio waveforms and recording pulses:

```css
:root {
  --pulse-1: 1500ms;   /* slow ambient pulse (recording, presence) */
  --pulse-2: 1000ms;   /* mid pulse */
}
@keyframes pPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(1.04); }
}
@keyframes pBreath {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
```

---

## 3. Quick-wins (Part 4 of your doc) — confirmed, with notes

| Task | Status | Note |
|---|---|---|
| Token swap | ✓ approved | Apply both base + variant blocks from V5-HANDOFF.md sec 4 plus section 1.2 above |
| Drop Gelasio | ✓ approved | Also remove from `app.html` font preconnect / link |
| Remove radial-dot body bg | ✓ approved | Replace with `:global(body)::before` carrying `var(--tex)` at `mix-blend-mode: overlay` + opacity 0.30 (lower than pane texture so panes still feel slightly "denser") |
| Remove `[data-settings]` global rule | ✓ approved | Apply `var(--font-mono)` per-element; never blanket-apply |
| Add `.tex-overlay` global class | ✓ approved | Spec: `.tex-overlay { position: absolute; inset: 0; background-image: var(--tex); mix-blend-mode: overlay; opacity: 0.40; pointer-events: none; }` |

Do all five before touching any component.

---

## 4. P1 surface specs

### 4.1 `PushPermissionBanner.svelte`

**Treatment:** Top-of-viewport sliver, glass-soft. Not a hero, not a modal. Slides in once on first visit, dismissible.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ ◐  N° 04 / NOTIFICATIONS                            ALLOW  │
│    Let the Penthouse reach you when you're away.    DISMISS│
└─────────────────────────────────────────────────────────────┘
```

**Spec:**
- Position: `fixed; top: 0; left: 0; right: 0; z-index: 80;`
- Background: `oklch(0.16 0.02 280 / 0.92)` + `backdrop-filter: blur(18px)`
- Border-bottom: `1px solid var(--p-line)`
- Padding: `14px 22px`
- Layout: `display: flex; align-items: center; gap: 16px;`
- Bell icon: 24px, `var(--p-secondary)`, no circle background — just the glyph
- Eyebrow: JBM 0.66rem `--p-secondary` "N° 04 / NOTIFICATIONS"
- Body: Ubuntu 0.86rem `--p-text-2`
- Two buttons right-aligned: `.btn-primary` for ALLOW, `.btn-ghost` for DISMISS (specs already in section 5 of V5-HANDOFF.md)
- Animation: `cubic-bezier(0.16, 1, 0.3, 1)` 320ms slide down. Not the spring you had — V5 motion language is ease-out-expo, no bounce.

**Error state** (permission denied): banner stays visible, swap eyebrow to "NOTIFICATIONS / DENIED" in `--p-error`, swap body to "We can't reach you with push. Open browser settings to allow.", swap buttons to single `.btn-ghost` "DISMISS".

**Light theme:** background becomes `oklch(0.96 0.012 285 / 0.92)`, text inverts via tokens automatically — no special override needed.

### 4.2 `PinBanner.svelte`

**Treatment:** Inline strip directly under the chat header, above the message list. Sits flush, no shadow.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  PINNED / N° 04                                             │
│  @amelie: "the rooms that hold their light"        UNPIN   │
└─────────────────────────────────────────────────────────────┘
```

**Spec:**
- Background: `var(--p-surface)` (solid surface, NOT glass — it sits inside the chat pane, glass would compound the texture)
- Border-bottom: `1px solid var(--p-line)`
- Padding: `10px 22px`
- Eyebrow row: JBM 0.62rem `--p-secondary` "PINNED / N° {count}" — left-aligned
- Body row: Ubuntu 0.86rem `--p-text-2`, `display: -webkit-box; -webkit-line-clamp: 1; overflow: hidden;` so it truncates with ellipsis
- Sender name `@amelie`: same line as body, `var(--p-accent)` color, JBM 0.78rem, no underline. Body content follows on the same line.
- Unpin button: `.btn-ghost` micro variant — padding `6px 12px`, font 0.66rem JBM uppercase, only shows if user has pin permission. Right-aligned, vertical-center across both rows.
- No animation on mount (it's static decoration). Hover on row: subtle bg shift to `var(--p-surface-2)`.

**Light theme:** automatic via tokens.

**Multi-pin:** show only the most recent. Eyebrow count "PINNED / N° 4" implies more exist. Clicking the eyebrow opens a pin list overlay (use the menu vocabulary from section 1.4 with section header "PINNED MESSAGES").

### 4.3 `auth/+page.svelte`

**Decision:** Redesign the logo, keep underlined inputs (per 1.3 B), use V5 tokens throughout, drop CAPTCHA's default styling for V5 vars.

**Logo:** replace gradient-text three-line "The / PENT / HOUSE" with a single-line wordmark:
```html
<div class="auth-mark">
  <div class="mark-eyebrow">N° 04</div>
  <h1 class="mark-wordmark">The Penthouse</h1>
  <div class="mark-sub">A quiet floor.</div>
</div>
```
```css
.auth-mark { text-align: center; margin-bottom: 56px; }
.mark-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 3px;
  color: var(--p-secondary);
  text-transform: uppercase;
  margin-bottom: 14px;
}
.mark-wordmark {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 2.6rem;
  letter-spacing: -1.5px;
  line-height: 0.95;
  color: var(--p-text);
  margin: 0;
}
.mark-sub {
  font-family: var(--font-sans);
  font-style: italic;  /* Ubuntu Italic is loaded */
  font-size: 0.95rem;
  color: var(--p-muted);
  margin-top: 10px;
}
```

No gradient-clip. No serif. Editorial weight via the eyebrow + italic subhead.

**Card:** centered, max-width 420px, no glass (it's a focused entry surface, not a glass overlay). Padding 56px, no border, background = `var(--p-bg)` (same as page so it visually disappears).

**Mode tabs** (Sign in / Create account): pill-pair, V5 vocabulary. Active = `var(--p-accent-soft)` bg, `var(--p-accent-edge)` border, `var(--p-text)` color. Inactive = transparent, `var(--p-muted)` color. NEVER set the text color to `var(--color-bg)`; that's the bug Kimi already fixed and the underlying pattern (text the same color as background) is fragile across themes.

**Inputs:** `.input-underline` from section 1.3.

**Password requirements checklist:** each item is a row with a 14px circle icon and JBM 0.7rem text. Icon empty = `var(--p-line-2)` outline circle; icon satisfied = `var(--p-success)` filled with a checkmark. Text color stays `var(--p-muted)` whether satisfied or not — the checkmark is the signal, not the color.

**Alpha notice:** small `.notice-pill` below the form. JBM 0.66rem `var(--p-info)` text on `var(--p-info-soft)` bg, radius `--r-md`, padding `10px 14px`. Single line: "ALPHA · expect breakage".

**Error banner:** above the form, when present. `var(--p-error-soft)` bg, 1px `var(--p-error-edge)` border, radius `--r-md`, padding `12px 16px`. JBM eyebrow "SOMETHING WENT WRONG" in `var(--p-error)`, Ubuntu 0.88rem body in `var(--p-text)`.

**CAPTCHA (Altcha):** set custom properties on the widget container:
```css
.captcha-wrap {
  --altcha-color-bg: var(--p-surface);
  --altcha-color-text: var(--p-text);
  --altcha-color-border: var(--p-line-2);
  --altcha-color-text-muted: var(--p-muted);
  --altcha-color-base: var(--p-accent);
  --altcha-color-base-hover: var(--p-accent-edge);
  --altcha-color-success: var(--p-success);
  --altcha-color-error: var(--p-error);
  --altcha-border-radius: var(--r-sm);
}
```

### 4.4 `+page.svelte` (home) — editorial empty state

**Decision:** keep the editorial empty state. It's a strong moment. Redesign without gradient-text and without Gelasio.

**New layout:**
```
                  ┌────────────────────────┐
                  │  N° 04 / DIRECTORY    │
                  └────────────────────────┘

         "All distances are the same
          to the person who longs."

                                  Rilke

                  ──── ◇ ────

         Pick a conversation, or start one.

                  [START A CHAT]
```

**Spec:**
- Wrapper: full-height flex centered, max-width 540px, text-align center
- Eyebrow box: JBM 0.7rem `var(--p-secondary)`, padded `6px 14px`, border `1px solid var(--p-line)`, radius `--r-pill`, no fill. Centered above the quote.
- Quote: Ubuntu Light 300, 1.6rem, line-height 1.4, color `var(--p-text-2)`, italic. Use real curly quotes "…".
- Citation: JBM 0.7rem `var(--p-muted)`, letter-spacing 1.5px, uppercase, right-aligned to the quote container. Two line-height gap above.
- Diamond divider: 60px wide, ascii-rendered as `──── ◇ ────` in JBM 0.66rem `var(--p-line-2)`, large vertical margin (48px above and below).
- Sub-instruction: Ubuntu 0.9rem `var(--p-muted)`.
- CTA: `.btn-ghost` "START A CHAT", clicking opens a new-chat picker.

Mobile shows the same empty state at smaller scale. No Gelasio, no gradient text, no banned patterns.

### 4.5 `static/offline.html`

**Spec (single file, no framework):**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · The Penthouse</title>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: oklch(0.16 0.020 280);
    --text: oklch(0.93 0.012 280);
    --muted: oklch(0.65 0.050 280);
    --accent: oklch(0.69 0.140 285);
    --line: oklch(0.78 0.090 280 / 0.18);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: oklch(0.96 0.012 285);
      --text: oklch(0.22 0.020 285);
      --muted: oklch(0.55 0.030 285);
      --accent: oklch(0.55 0.130 285);
      --line: oklch(0.40 0.030 285 / 0.18);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg); color: var(--text);
    font-family: 'Ubuntu', -apple-system, sans-serif;
    position: relative; overflow: hidden;
  }
  body::before {
    content: '';
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");
    mix-blend-mode: overlay; opacity: 0.30; pointer-events: none;
  }
  .wrap { position: relative; z-index: 1; max-width: 480px; padding: 40px; text-align: center; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase;
    color: var(--accent); margin-bottom: 18px;
  }
  h1 {
    font-weight: 700; font-size: 2.4rem; letter-spacing: -1.2px;
    line-height: 0.98; margin: 0 0 14px;
  }
  p {
    color: var(--muted); font-size: 0.95rem; line-height: 1.55;
    margin: 0 0 32px; max-width: 360px; margin-left: auto; margin-right: auto;
  }
  button {
    font-family: 'Ubuntu', sans-serif;
    background: var(--accent); color: var(--bg);
    border: none; border-radius: 999px; padding: 11px 24px;
    font-size: 0.85rem; font-weight: 500; cursor: pointer;
    transition: transform 200ms cubic-bezier(0.16,1,0.3,1);
  }
  button:hover { transform: translateY(-1px); }
  .divider { color: var(--line); font-family: 'JetBrains Mono', monospace; margin: 40px 0 8px; font-size: 0.66rem; letter-spacing: 4px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="eyebrow">N° 04 / OFFLINE</div>
    <h1>The signal went quiet.</h1>
    <p>Your last view is cached. When you're back online, the Penthouse picks up where you left it.</p>
    <button onclick="location.reload()">TRY AGAIN</button>
    <div class="divider">◇</div>
  </div>
</body>
</html>
```

No external CSS imports beyond the Google fonts link. Self-contained.

---

## 5. P2 surface specs

### 5.1 `PushSettings.svelte`

Already inherits the settings vocabulary. Specifics:

- Status row: settings `.row` with label-left + value-right
- Value: JBM 0.78rem in `var(--p-text-2)` for normal, `var(--p-success)` when enabled, `var(--p-error)` when denied
- Status badge (the "Enabled — you'll get alerts even when closed" copy): demoted to `.field-help` below the toggle row, Ubuntu 0.78rem `var(--p-muted)`, NOT a pill
- Test notification button: `.btn-ghost` micro variant, 0.74rem JBM uppercase "SEND TEST"
- Unsupported state: replace toggle with a `.notice-pill` (defined in 4.3 auth) — JBM 0.7rem `var(--p-warning)` text on `var(--p-warning-soft)` bg, "BROWSER DOESN'T SUPPORT PUSH"
- Denied state: replace toggle with same `.notice-pill` in `var(--p-error)` variant, "BROWSER DENIED — OPEN BROWSER SETTINGS"

### 5.2 `AudioPlayer.svelte`

**Treatment:** Pill within message bubble OR standalone in profile preview. Solid surface, NOT glass (it sits inside an already-textured bubble; glass would compound).

**Spec:**
- Container: `display: inline-flex; align-items: center; gap: 12px;` padding `8px 14px 8px 8px`, radius `--r-pill`, bg `var(--p-surface-2)`, border `1px solid var(--p-line)`
- Play button: 32px circle, `var(--p-accent)` fill, icon `var(--p-bg)`, hover scale 1.05 via 200ms ease-out
- Waveform: 28 bars, `2px` wide, gap `2px`, heights vary 4–18px (pre-computed, deterministic from audio buffer)
  - Unplayed: `var(--p-line-2)`
  - Played: `var(--p-accent)`
  - Hover-target seek: row shifts cursor to pointer, bars closer to mouse get `var(--p-secondary)` highlight via JS
- Timestamp: JBM 0.7rem `var(--p-muted)`, `0:00 · 0:00` (use middle-dot `·`, not slash)
- Speed toggle: tiny pill 22×16, JBM 0.62rem `var(--p-muted)`, hover `var(--p-text)`. Text-only "1×" / "1.5×" / "2×".
- **Light theme:** Unplayed bars become `var(--p-line-2)` which is already adapted via tokens — no manual override.

### 5.3 `AudioRecorder.svelte`

**Treatment:** Replaces the composer pill temporarily during recording. Same shape (full-width pill), different content.

**Recording active layout:**
```
[●] 0:14   ────────────────~~~────   [×]  [↑]
```
- Left: 14px red dot pulsing via `pPulse` animation (use `--p-error` per token 1.2 above) + JBM timestamp 0.78rem `var(--p-text)`
- Middle: real-time waveform, 24 bars, animated via Web Audio API levels. Bars `var(--p-text-2)`, the most recent bar `var(--p-accent)`.
- Right: cancel button (×, 32px circle, `var(--p-warning-soft)` bg, `var(--p-warning)` icon) + send button (↑, 32px circle, `var(--p-accent)` bg, `var(--p-bg)` icon)
- Animation: when recording starts, composer fades out 200ms, recorder fades in 200ms with the dot pulse beginning

**Permission denied state:** swap composer with a single `.notice-pill` (defined in 4.3 auth) in `var(--p-error)` family, "MIC PERMISSION DENIED — OPEN BROWSER SETTINGS".

### 5.4 `EmojiEmoteAutocomplete.svelte`

**Treatment:** Glass-soft popover. Use the menu vocabulary from section 1.4 with smaller item rows.

**Spec:**
- Container: menu spec, min-width 260px, max-width 340px, max-height 240px overflow-y auto
- Item row: same as `.menu-item` but reduced padding `7px 12px`, gap `12px`
- Mention row: 24px avatar (use the `Avatar` component, no texture-overlay variant here for performance), Ubuntu 0.85rem `var(--p-text)` username, JBM 0.66rem `var(--p-muted)` "@handle" right-aligned
- Emoji row: 22px emoji glyph, Ubuntu 0.78rem `var(--p-text-2)` shortcode like ":sparkles:"
- Selected row: `var(--p-accent-soft)` bg, `var(--p-accent-edge)` border, NOT a left-stripe (banned)
- Empty state: JBM 0.7rem `var(--p-muted)` centered "NO MATCHES" with 24px vertical padding
- Loading state (fetching users on first `@`): a single row with the `pBreath` animation on a placeholder pill

### 5.5 `UnifiedPicker.svelte`

**Treatment:** Glass-soft floating panel. Tabbed surface.

**Spec:**
- Container: menu spec but larger — 360px × 420px, position absolute above composer, padding 0
- Tab strip: top, height 44px, border-bottom `1px solid var(--p-line)`, padding `0 8px`, display flex
- Tab button: padding `12px 14px`, gap `8px` (icon + label), JBM 0.66rem 1.5px uppercase, color `var(--p-muted)`
- Active tab: color `var(--p-text)`, plus 2px underline strip in `var(--p-accent)` flush to the bottom border (allowed — it's a positional indicator under text, not a card decoration; not banned by the side-stripe rule which is for cards/list-items)
- Close button: 28px circle, top-right, `var(--p-line-2)` bg, hover `var(--p-accent-soft)`
- Content panel: padding 16px, scrollable, fade-cross between tabs 280ms ease-out
- Search input inside picker (emoji/sticker/gif search): `.input-filled` variant with `data-style="prose"` (Ubuntu font), placeholder `var(--p-muted-2)` "Search emoji"
- Sticky header inside grid: 22px tall, JBM 0.62rem 2px uppercase `var(--p-secondary)`, e.g. "RECENT" / "SMILEYS" — bg gradient fade from `var(--p-surface-2)` to transparent

### 5.6 `ReplyBar.svelte`

**Spec:**
- Position: above composer, inside the composer wrap
- Background: `var(--p-surface)` (solid — same reasoning as PinBanner)
- Border: `1px solid var(--p-line)`, radius `--r-md` top + 0 bottom (sits flush above composer pill)
- Padding: `8px 16px`
- Two columns: content (flex 1) and close (28px circle)
- Eyebrow: JBM 0.62rem `var(--p-secondary)` "REPLYING TO @amelie" — 2px tracking, uppercase
- Quote: Ubuntu 0.82rem `var(--p-text-2)`, max 1 line, ellipsis. Quote uses real curly quotes "…".
- Close button: 28px circle, `var(--p-line-2)` bg, hover `var(--p-warning-soft)` + `var(--p-warning)` icon (not error — canceling reply isn't destructive)
- Animation: slide-down 200ms ease-out on appear, slide-up 200ms on dismiss

---

## 6. Edge case designs

### 6.1 Voice / PTT system

The handoff under-specced this. Here's the full design.

**PTT active overlay** (when user is holding spacebar to talk):

Position: bottom-center of viewport, above composer, z-index 60.
```
┌──────────────────────────────────────────┐
│  ◉ LIVE · kimi.eve              0:04     │
└──────────────────────────────────────────┘
```
- Pill, `var(--p-accent-soft)` bg, `var(--p-accent-edge)` border
- Left: 8px circle `var(--p-accent)` pulsing via `pPulse`
- "LIVE" in JBM 0.7rem 2px uppercase `var(--p-text)`
- Handle in JBM 0.7rem `var(--p-secondary)`
- Right: timer JBM 0.74rem `var(--p-text)`
- Animation: slide up 220ms ease-out on appear

**Voice channel participants strip** (when in a voice channel):

Position: inline at top of chat pane, below the pane header. Horizontal strip.
- Background: `var(--p-surface)` solid, border-bottom `1px solid var(--p-line)`
- Padding: `10px 22px`
- Layout: flex row, gap `10px`
- Each participant: 32px avatar circle with ring overlay
  - Speaking: 2px ring in `var(--p-accent)`, pulsing breath via `pBreath`
  - Muted: 2px ring in `var(--p-muted-2)` with overlaid mic-slash icon at bottom-right (12px)
  - Idle: 2px ring transparent
- Right side of strip: small controls cluster — mute toggle (24px button), deafen toggle (24px button), leave button (24px circle `var(--p-warning-soft)` + `var(--p-warning)` icon, hover `var(--p-warning)` fill)
- Connection quality: tiny 3-bar indicator next to local user avatar (3px bars, heights 4/7/10px). Good = all 3 `var(--p-success)`. Poor = 1 bar `var(--p-warning)`.

**Spacebar PTT hint** (shown once on first chat visit):
- Toast pill bottom-center, glass-soft, `var(--p-info)` family
- JBM 0.7rem "TIP / HOLD SPACE TO TALK" + Ubuntu 0.78rem "Release to stop"
- Auto-dismiss after 4s, also dismissible

### 6.2 Channel creation inline form

Used inside group chats to start a new channel within the group.

**Treatment:** Inline below the channel list, expands when user clicks "+ New channel".

- Form: `.input-underline` for the name, single field
- Below the input: two small ghost buttons — "CREATE" (JBM 0.7rem) and "CANCEL"
- Error state (duplicate name): underline goes `var(--p-error)`, helper text below in JBM 0.66rem `var(--p-error)` "NAME ALREADY EXISTS"
- Success: form collapses 200ms, new channel slides into the list with a 280ms ease-out fade-up

### 6.3 Chat search overlay

**Treatment:** Slides in from the right edge of the chat pane, takes the right 360px. NOT a modal — it's a panel that coexists with the chat behind it.

- Container: width 360px, full pane height, `var(--p-surface)` bg, border-left `1px solid var(--p-line)`, NOT glass (panel layer)
- Header: padding `22px`, eyebrow "SEARCH · CHAT", followed by `.input-filled` search input
- Results list: each result is a `.member`-style row but content is: avatar 28px + sender name (Ubuntu 0.82rem) + message snippet with matching text highlighted via `<mark>` tag → mark uses `background: var(--p-accent-soft); color: var(--p-text); padding: 0 2px; border-radius: 2px;`
- Click result: scrolls main chat to that message, briefly pulses the bubble with `var(--p-accent-soft)` ring 600ms ease-out
- Empty state: JBM 0.7rem centered `var(--p-muted)` "NO MATCHES" + Ubuntu 0.85rem "Try a different word." Below: a `.btn-ghost` "CLEAR" to reset.
- Loading state: 3 placeholder rows with `pBreath` animation on each
- Animation: slide-in from right 320ms ease-out

### 6.4 Wallpaper system

**Settings UI** (lives inside Settings page, dedicated section):

```
WALLPAPER
─────────────
[ current wallpaper preview · 480 × 80 strip ]

Image source
[ url input · .input-filled · prose ]

Tint opacity
0% ──●────────── 100%      0.15

Default wallpapers
[ thumb ][ thumb ][ thumb ][ thumb ][ thumb ]

[ reset to default ]
```

- Preview strip: 480 × 80, radius `--r-md`, shows the chosen wallpaper at current opacity, with V5 texture overlay layered on top so the user sees the exact rendering
- URL input: `.input-filled[data-style="prose"]`
- Opacity slider: HTML `<input type="range">`, `accent-color: var(--p-accent)`. Custom track via `::-webkit-slider-runnable-track` set to 4px tall, `var(--p-line-2)` bg, filled portion `var(--p-accent)` via a CSS trick (or use a `<progress>` overlay if needed). Value display right-aligned in JBM 0.7rem.
- Default thumbnails: 5 × 64 × 64 squares, radius `--r-sm`, border `1px solid var(--p-line)`. Selected thumbnail gets `2px solid var(--p-accent-edge)`. Hover scales 1.04.
- Reset button: `.btn-ghost` "RESET TO DEFAULT"

**How wallpaper interacts with texture:**
Layer order (bottom to top):
1. `var(--p-bg)` solid base
2. Wallpaper image at `wallpaperOpacity` (e.g. 0.15)
3. A1.3 texture overlay at 40% (NOT reduced — it's the design language, stays constant)
4. Surface panels (glass-soft) on top of all of the above

Apply via CSS variables on the app shell:
```css
.app-shell {
  background:
    var(--tex) center / cover no-repeat,
    var(--wallpaper-url, none) center / cover no-repeat,
    var(--p-bg);
}
```
…with the texture layer mix-blended on top.

### 6.5 Toast / snackbar

**Spec:**
- Position: `fixed; top: 14px; left: 50%; transform: translateX(-50%);`
- Glass-soft pill, max-width 480px, padding `10px 18px`
- Eyebrow: JBM 0.66rem 2px uppercase, color by type
  - success → `var(--p-success)` "SAVED"
  - info → `var(--p-info)` "NOTICE"
  - error → `var(--p-error)` "FAILED"
- Body: Ubuntu 0.86rem `var(--p-text-2)`
- Optional inline action: `.btn-ghost` micro "UNDO" right-aligned
- Auto-dismiss after 4s, slide-up out 260ms ease-out
- Stack: max 3 toasts visible, oldest pushed up and faded

### 6.6 Modal / dialog

Only for destructive confirms or required-input flows.

**Spec:**
- Backdrop: `oklch(0 0 0 / 0.5)` + `backdrop-filter: blur(4px)`
- Panel: max-width 480px, glass-soft, radius `--r-lg`, padding `40px`, centered
- Eyebrow: JBM 0.7rem `var(--p-secondary)` 2px uppercase
- h1: Ubuntu 700, 1.6rem, `var(--p-text)`, margin-bottom 14px
- Body: Ubuntu 0.95rem `var(--p-text-2)`, line-height 1.55, margin-bottom 32px
- Buttons: row, gap 12px, right-aligned. Primary action right-most; ghost cancel left of primary.
- Destructive primary: use `--p-warning` family (matches sign-out vocabulary), text "DELETE ACCOUNT" or "LEAVE CHANNEL" in JBM 0.78rem
- Backdrop click closes (unless required-input mode)
- Escape key closes
- Focus trap (use `$lib/actions/focusTrap.ts`)
- Animation: backdrop fade 220ms, panel slide-up 280ms ease-out, staggered

### 6.7 404 / route not found

Pattern matches the home empty state. Wrapper centered, eyebrow + display + sub + ghost link.

```
N° 404 / LOST
Nothing on this floor.
The hallway you tried doesn't exist, or it's been moved.

[ ← BACK HOME ]
```

Same `.btn-ghost` vocabulary. Same JBM eyebrow pattern. Same Ubuntu Light display tone.

### 6.8 Disabled states

`opacity: 0.45; cursor: not-allowed; pointer-events: none;` — apply to the element only, never blanket-grayscale. Hover effects do not fire.

### 6.9 Focus rings (a11y)

```css
:global(*:focus-visible) {
  outline: 2px solid var(--p-accent-edge);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}
```

Apply globally. Override per-component only if the default doesn't work (e.g. on `.bub` you might use a ring instead of outline for the radius to follow the bubble's shape).

### 6.10 Reduced motion

The block already in `+layout.svelte` covers it. Additional rule: disable `pPulse`, `pBreath`, message arrive stagger, and Toast slide-in motion. Keep state changes (color, opacity transitions) at 0.01ms so they appear instant.

---

## 7. Service worker notifications

**Title format:** `{senderName} · {channelOrDmName}` (Ubuntu, normal). If it's a DM, just `{senderName}`.

**Body:** the message preview, truncated to 120 chars with ellipsis. For media messages: "📷 Photo" / "🎙 Voice message" (1 emoji + label).

**Icon (192×192 PNG):** generate from the new Penthouse mark. Square `var(--p-bg)` background + centered Ubuntu 700 bold "P" wordmark glyph in `var(--p-accent)`. Save to `static/icons/notification-192.png`. Use 4x retina source.

**Badge (96×96 PNG):** monochrome periwinkle, the "P" glyph only, on transparent bg. `static/icons/badge-96.png`.

**Sound:** silent by default. Respect OS DND. If user opts in via settings, use a 200ms low-volume `oklch-blue` tone (out of scope for this doc, but reserve a toggle in `PushSettings.svelte` "Sound on new messages").

**Action buttons:** "Reply" and "Mark as read". `Reply` opens the chat focused; `Mark as read` posts a read receipt without opening.

**Tag (per-chat grouping):** `chat:{channelId}` — multiple messages in the same chat replace each other rather than stack. Counter shown in the title: `(3) kimi.eve · #studio`.

---

## 8. Updated file ref map

| File | Phase | New status |
|---|---|---|
| `+layout.svelte` token swap | 1 | unblocked by sec 1 |
| `app.html` drop Gelasio | 1 | confirmed |
| `theme.ts` extend `Theme` type | 1 | spec in sec 1.1 |
| `+layout.svelte` body radial-dot → texture | 1 | confirmed |
| `+layout.svelte` drop `[data-settings]` global | 1 | confirmed |
| `+layout.svelte` add `.tex-overlay` global class | 1 | confirmed |
| `+layout.svelte` add menu / toast / modal / notice-pill globals | 1 | new — specs in sec 1.4, 6.5, 6.6, 4.3 |
| 30 prototype `.svelte` files | 2 | original spec in V5-HANDOFF.md sec 6.2 |
| `MessageBubble.svelte` | 3 | sec 4.2 reply bar context + token swap |
| `MessageComposer.svelte` | 3 | composer pill, V5 input C spec |
| `Avatar.svelte` | 3 | texture overlay, OKLCH gradients |
| `Icon.svelte` | 3 | stroke-currentColor default |
| `BottomNav.svelte` | 3 | glass-soft + JBM labels + presence dot |
| `DesktopNav.svelte` | 3 | same vocabulary |
| `DesktopShell.svelte` | 3 | texture on shell bg |
| `ChatListPane.svelte` + `ChatListItem.svelte` | 3 | member row vocabulary from preview |
| `ChannelList.svelte` | 3 | same as ChatListItem |
| `ReplyBar.svelte` | 3 | sec 5.6 |
| `TypingIndicator.svelte` | 3 | A2.4 bubble + 3-dot pulse |
| `ReadReceipts.svelte` | 3 | stacked 16px avatars + JBM count |
| `ReactionPill.svelte` | 3 | pill `--p-surface-2`, hover `--p-accent-soft` |
| `PinBanner.svelte` | 3 | sec 4.2 |
| `PushPermissionBanner.svelte` | 3 | sec 4.1 |
| `PushSettings.svelte` | 3 | sec 5.1 |
| `MarkdownText.svelte` | 3 | inline `<code>` JBM 0.86em; quote uses padding-left + border-left 2px (allowed when it's typographic indication, NOT decorative card stripe) |
| `AudioPlayer.svelte` | 3 | sec 5.2 |
| `AudioRecorder.svelte` | 3 | sec 5.3 |
| `EmojiPicker.svelte` / `EmotePicker.svelte` / `StickerPicker.svelte` / `GifPicker.svelte` | 3 | inherit UnifiedPicker shell |
| `UnifiedPicker.svelte` | 3 | sec 5.5 |
| `EmojiEmoteAutocomplete.svelte` | 3 | sec 5.4 |
| `auth/+page.svelte` | 3 | sec 4.3 |
| `chat/[id]/+page.svelte` | 3 | voice/PTT (sec 6.1), channel form (sec 6.2), search (sec 6.3) |
| `settings/+page.svelte` | 3 | match SettingsPane-V5-01 + theme picker + wallpaper section |
| `users/+page.svelte` | 3 | match PeoplePane-V5-01 |
| `+page.svelte` (home empty state) | 3 | sec 4.4 |
| `prototypes/+page.svelte` | 3 | index page, V5 vocabulary |
| `static/offline.html` | 3 | sec 4.5 |
| `service-worker.ts` | 3 | sec 7 |
| `static/icons/notification-192.png` + `badge-96.png` | 3 | new assets — generate per sec 7 |

---

## 9. Two clarifications for the user before sec 6.4 ships

Two questions about wallpaper that I made a call on but the user might want to revisit. Flag these when next user-facing decision happens:

1. **Wallpaper sits BELOW the V5 texture overlay**, not above. My reasoning: the texture is the V5 design identity; it stays constant across users. The wallpaper is personal expression and tints the bg. If the user wants wallpaper on top of texture instead, swap the layer order in `app.shell`.
2. **Default wallpapers ship with 5 options.** I propose: solid (no wallpaper), abstract-1 (soft periwinkle gradient), abstract-2 (sage gradient), abstract-3 (terracotta gradient), photographic (a low-contrast paper texture image). Final assets to be designed; this just defines the slots.

---

## 10. Hand-off contract (Phase 1 unblock)

Order of operations:

1. **Phase 1 token swap** — apply sec 1 + sec 2 + sec 3 (quick-wins). Should take 1–2 hours.
2. **Sanity check**: open the existing app routes (`/`, `/chat/[id]`, `/settings`, `/users`, `/auth`) with the new tokens. Things will look slightly off (some components reference old tokens directly) but nothing should be broken.
3. **Build the 30 prototypes** per V5-HANDOFF.md sec 6.2. Stop after the first 3 (one per pane) and ping the user.
4. **Phase 3 component migration** — work through the file ref map above in priority order: P0 first (MessageBubble, MessageComposer, Avatar, BottomNav, DesktopNav, DesktopShell, ChatListPane, ChatListItem, chat/[id], settings, users), then P1 (auth, home empty state, PushPermissionBanner, PinBanner, offline.html), then P2 (everything else).
5. **Edge cases** (sec 6 of this doc) as you encounter them while migrating Phase 3.
6. **QA pass** — `/responsive-qa-tester` across mobile/tablet/desktop, `/impeccable critique` + `/impeccable polish` on each surface.

If you hit any ambiguity not covered by V5-HANDOFF.md or this doc, ping the user with a specific question and a recommended default. Don't broad-search for direction.

---

End of response. Phase 1 is unblocked.
