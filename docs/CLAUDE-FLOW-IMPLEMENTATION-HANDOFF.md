# Claude → Kimi K2.6 Handoff — App Implementation

**Date:** 2026-05-14
**From:** Claude (V5 design + flow integration prototype)
**To:** Kimi K2.6 (implementation into the real app)
**Context:** Supersedes the parts of `V5-HANDOFF.md` and `CLAUDE-V5-REDESIGN-HANDOFF-RESPONSE.md` that conflict with the changes below. Everything not contradicted here still stands.

The flow prototype at `/prototypes/flow` is the visual contract. This doc tells you how to land it without anything funky.

---

## 0 · TL;DR for Kimi

1. **Theme system is now two axes**, not 11 themes. `theme` ∈ {periwinkle, sage, slate, plum, charcoal} crossed with `mode` ∈ {dark, light}. Default: periwinkle + dark.
2. **Wallpaper is gone.** Delete the wallpaper store, schema column, settings section, and chat wallpaper layer. Themes cover the visual job wallpapers used to do.
3. **Profile style is new** and per-user. `profile_style` ∈ {editorial, vogue, wallpaper}. Default editorial. It's how *other users* see your card in `/users`. Add to user record.
4. **Light mode contrast rule (CRITICAL):** surfaces must be DARKER than bg. Do not use alpha-on-text patterns for light-mode surfaces — they vanish.
5. **`_state.svelte.ts` is the prototype-only state.** Production lives in `$stores/`. Lift the contract, not the file.

---

## 1 · What changed since V5-HANDOFF

| V5 said | Now says |
|---|---|
| 11 themes (T-D1..T-D7, T-L2..T-L7) with single `data-theme-variant` attribute | 5 themes × 2 modes. Two attributes: `data-theme` (id) + `data-mode` (dark\|light). Each theme defines both palettes hand-tuned. |
| `--p-bg` etc. defined under `[data-theme-variant="T-D1"]` style blocks in `+layout.svelte` | Tokens emitted as a single inline-style block at app shell root. The shell reads from a store and binds every `--p-*` variable in one place. |
| Wallpaper system (`wallpapersStore`, 5 default slots, chat backdrop layer) | Removed. No wallpaper state, no UI, no DB column. Themes do the work. |
| Themes shipped via `themes.ts` source-of-truth | Same idea, but contract is now `{ id, label, dark: PaletteVars, light: PaletteVars }` — see §3. |
| No profile style concept | New per-user `profile_style` field. Drives how the user's card renders in the directory. Settings has a picker. |
| Settings sections numbered N°01..N°05 incl. wallpaper | N°01 Identity, N°02 Presence, N°03 Appearance (theme+mode), N°04 Profile style. No N°05. |
| Chat bubbles had time inside, reactions in same flex column as bubble | Time is absolutely positioned below the avatar of the **last message in a same-sender cluster**. Reactions live in a sibling row outside the bubble flex — they don't push the pfp. |

The chat clustering + time-below-pfp + reactions-out-of-flex pattern is in the prototype as `.msg` > `.row(avatar-col + bub)` + optional sibling `.reactions-row`. Copy that DOM shape.

---

## 2 · Files to read first

1. `apps/web/src/lib/prototypes/_state.svelte.ts` — the contract you'll mirror in production stores
2. `apps/web/src/routes/prototypes/flow/+page.svelte` — visual reference for all 6 screens at mobile + desktop
3. `apps/web/src/lib/prototypes/chat-pane/ChatPane-V5-01-Periwinkle.svelte` — canonical chat layout
4. `apps/web/src/lib/prototypes/people-pane/PeoplePane-V5-{01,02,03}-*.svelte` — the three profile-style layouts to port
5. `apps/web/src/lib/prototypes/settings-pane/SettingsPane-V5-02-FloatingPreviewLed.svelte` — closest match to the production settings layout

---

## 3 · Theme contract (the source of truth)

```ts
// apps/web/src/lib/themes.ts  ← create this in production
export interface PaletteVars {
  accent: string;       // oklch() literal
  accentSoft: string;   // accent / 0.18 for dark, / 0.14 for light
  accentEdge: string;   // accent / 0.38 for dark, / 0.32 for light
  bg: string;
  surface: string;      // dark: lighter than bg; LIGHT: DARKER than bg
  surface2: string;     // one more step in the same direction
  text: string;
  text2: string;
  muted: string;
  secondary: string;
  line: string;         // alpha border, OK to be subtle
  line2: string;        // alpha border, more visible
  success: string;
  warning: string;
}

export interface ThemeDef {
  id: 'periwinkle' | 'sage' | 'slate' | 'plum' | 'charcoal';
  label: string;
  dark: PaletteVars;
  light: PaletteVars;
}

export type ThemeMode = 'dark' | 'light';

export const themes: ThemeDef[] = [
  /* see _state.svelte.ts for the exact OKLCH values — copy verbatim */
];

export function tokensFor(theme: ThemeDef, mode: ThemeMode): PaletteVars {
  return theme[mode];
}
```

**Rules:**
- OKLCH literals only. No hex, no rgba in new code.
- Each theme is hand-tuned per mode — DO NOT derive light from dark via OKLCH math. Pastel palettes are aesthetic, not algorithmic.
- Adding a theme later = one entry. Don't break this property.

### Light mode surface rule (the empty-look fix)

This was the bug in the image the user flagged. Burn it into your CSS reviews:

❌ **Wrong:**
```css
.card { background: color-mix(in oklch, var(--p-text) 4%, transparent); }
```
On a 0.96-light bg, 4% black ink ≈ 0.92 = nearly invisible.

✅ **Right:**
```css
.card { background: var(--p-surface); }
/* where --p-surface for light themes = oklch(0.91 ... <bgHue>) — explicitly darker than bg */
```

The transparent-overlay trick **only works on dark backgrounds**. For light mode, use explicit `--p-surface` / `--p-surface-2` tokens that step DARKER than bg by ~5% and ~10% lightness.

---

## 4 · State / store migration

### What's in the prototype (`_state.svelte.ts`)
```ts
class FlowState {
  themeId    = $state('periwinkle');
  mode       = $state<ThemeMode>('dark');
  profileStyle = $state<'editorial' | 'vogue' | 'wallpaper'>('editorial');
  presence   = $state<'online' | 'away' | 'offline'>('online');
  displayName = $state(...);
  // ...
  theme  = $derived(themes.find(t => t.id === this.themeId)!);
  tokens = $derived(this.theme[this.mode]);
}
```

### Production target

**Three concerns, three stores:**

1. `appearanceStore.svelte.ts` — `themeId` + `mode`. Persisted to `localStorage` AND user preferences endpoint.
2. `userStore.svelte.ts` (existing `sessionStore` or a new one) — `profile_style`, `display_name`, `presence`, `bio`, etc. Synced to server.
3. `themesStore.svelte.ts` — read-only catalog of `themes` array. Re-export from `themes.ts`.

```ts
// apps/web/src/lib/stores/appearance.svelte.ts
import { themes, type ThemeMode } from '$lib/themes';

const STORAGE_KEY = 'penthouse-appearance';

function load() {
  if (typeof localStorage === 'undefined') return { themeId: 'periwinkle', mode: 'dark' as ThemeMode };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { themeId: 'periwinkle', mode: 'dark' as ThemeMode };
}

class AppearanceStore {
  themeId = $state(load().themeId);
  mode    = $state<ThemeMode>(load().mode);

  theme  = $derived(themes.find(t => t.id === this.themeId) ?? themes[0]);
  tokens = $derived(this.theme[this.mode]);

  setTheme(id: string) { this.themeId = id; this.#persist(); }
  setMode(m: ThemeMode) { this.mode = m; this.#persist(); }

  #persist() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId: this.themeId, mode: this.mode }));
    }
    // also sync to server preferences endpoint (debounced)
  }
}

export const appearanceStore = new AppearanceStore();
```

### Apply tokens at app shell (`+layout.svelte`)

Replace the existing V5 token block with a single style binding:

```svelte
<script>
  import { appearanceStore } from '$stores/appearance.svelte';
  const k = $derived(appearanceStore.tokens);
</script>

<div
  class="app-shell"
  data-theme={appearanceStore.themeId}
  data-mode={appearanceStore.mode}
  style:--p-accent={k.accent}
  style:--p-accent-soft={k.accentSoft}
  style:--p-accent-edge={k.accentEdge}
  style:--p-bg={k.bg}
  style:--p-surface={k.surface}
  style:--p-surface-2={k.surface2}
  style:--p-text={k.text}
  style:--p-text-2={k.text2}
  style:--p-muted={k.muted}
  style:--p-secondary={k.secondary}
  style:--p-line={k.line}
  style:--p-line-2={k.line2}
  style:--p-success={k.success}
  style:--p-warning={k.warning}
>
  ...
</div>
```

**Why `style:` and not nested `[data-theme="..."]` CSS blocks:**
- 10 palettes × ~14 vars each = 140 lines of generated CSS, all loaded up-front
- Hard to add a theme later (touches CSS, not data)
- Inline style binding is reactive, smaller, and the source-of-truth lives in TS

Keep `data-theme` and `data-mode` attributes too — they're useful escape hatches for component-level overrides and for testing.

### FOUC prevention

Replace the existing inline FOUC script in `app.html` with:

```html
<script>
  try {
    const stored = JSON.parse(localStorage.getItem('penthouse-appearance') || '{}');
    if (stored.mode) document.documentElement.setAttribute('data-mode', stored.mode);
    if (stored.themeId) document.documentElement.setAttribute('data-theme', stored.themeId);
  } catch (e) {}
</script>
```

This sets the attributes before paint; the JS reactive shell then writes the inline vars when it mounts.

### Update `apps/web/src/lib/utils/theme.ts`

Rewrite from `Theme = 'dark' | 'light' | 'system'` to the new two-axis model:

```ts
import { themes, type ThemeMode } from '$lib/themes';

export type ThemeId = (typeof themes)[number]['id'];
export interface AppearancePref { themeId: ThemeId; mode: ThemeMode | 'system'; }

const STORAGE_KEY = 'penthouse-appearance';
// ...getResolvedMode(), setAppearance(), initAppearance() that listens to prefers-color-scheme when mode='system'
```

Keep `'system'` as a valid mode value at the store level — collapse it to dark/light at the derive step.

---

## 5 · Profile style (the new per-user feature)

### Contract

```ts
// apps/web/src/lib/types/user.ts (or wherever User lives)
export interface User {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  presence: 'online' | 'away' | 'offline';
  profile_style: 'editorial' | 'vogue' | 'wallpaper';   // ← NEW
  // ... existing fields
}
```

### Server (Codex's job, mentioned here for completeness)

- Migration: add `profile_style VARCHAR(16) NOT NULL DEFAULT 'editorial'` to users table
- API: `GET /users/:id` returns `profile_style`
- API: `PATCH /users/me` accepts `profile_style` field, validates enum
- Realtime: emit `user.profile_style_changed` event so other users' open `/users/:id` views re-render

### Client

- `userStore.svelte.ts` exposes `currentUser.profile_style`
- Settings page has a picker that calls `userStore.update({ profile_style: 'vogue' })`
- `/users/:id` page reads the *target* user's `profile_style` (not the viewer's) and renders the matching card variant

### Component: `ProfileCard.svelte`

Build this as ONE component that switches layout based on a prop:

```svelte
<script lang="ts">
  interface Props {
    person: User;
    style: 'editorial' | 'vogue' | 'wallpaper';
  }
  let { person, style }: Props = $props();
</script>

{#if style === 'editorial'}
  <!-- banner above + roster+focus layout (PeoplePane V5-01) -->
{:else if style === 'vogue'}
  <!-- display-name hero overlay (PeoplePane V5-02) -->
{:else}
  <!-- wallpaper bg + floating midheight card (PeoplePane V5-03) -->
{/if}
```

DOM and CSS for each variant are in the corresponding prototype file — port them as `:global(.pc-*)`-scoped rules inside `ProfileCard.svelte`.

**Important:** the Wallpaper variant has hard-coded `oklch(0.16 0.020 280 / 0.78)` in the floating card backdrop. Replace this with `color-mix(in oklch, var(--p-bg) 78%, transparent)` so it follows the active theme.

---

## 6 · File-by-file migration map

### Critical path (P0)

| File | Action |
|---|---|
| `apps/web/src/lib/themes.ts` | **Create.** Copy `themes` array from `_state.svelte.ts` verbatim. |
| `apps/web/src/lib/stores/appearance.svelte.ts` | **Create.** Per §4. |
| `apps/web/src/routes/+layout.svelte` | Replace V5 token block with inline `style:` binding from `appearanceStore.tokens`. Drop all `:global([data-theme-variant="T-D..."])` blocks. Keep utility classes (`.menu`, `.input-filled`, etc.) but verify they use the same token names. |
| `apps/web/src/lib/utils/theme.ts` | Rewrite for two-axis (themeId + mode). |
| `apps/web/src/app.html` | Update FOUC script per §4. Drop Gelasio (already done in V5). |

### Component migration (P0 — these are visible everywhere)

| File | Action |
|---|---|
| `apps/web/src/lib/components/MessageBubble.svelte` | Rewrite to match `.msg > .row(avatar-col + bub) + sibling .reactions-row` pattern. Cluster logic lives in `chat/[id]/+page.svelte` (sender id check between adjacent messages); MessageBubble accepts `showAvatar: boolean` and `firstInCluster: boolean` as props. Time goes in `.avatar-col` with `position: absolute; top: 100%`. |
| `apps/web/src/lib/components/MessageComposer.svelte` | Pill capsule per V5. `.composer` class is already in `+layout.svelte` global utilities. |
| `apps/web/src/lib/components/Avatar.svelte` | Status dot uses `var(--p-success/warning/muted)`. Texture overlay at 0.45 opacity (or 0.30 in light mode — see §7). |
| `apps/web/src/lib/components/ChatListItem.svelte` | Replace any hex colors with `var(--p-*)`. Unread pill uses `var(--p-accent)` bg, `oklch(1 0 0 / 0.95)` text. |
| `apps/web/src/lib/components/ChatListPane.svelte` | Roster list pattern from flow prototype. `width: 300px` on desktop, full-width on mobile. |
| `apps/web/src/lib/components/BottomNav.svelte` | Token swap. Active item uses `--p-accent-soft` bg + `--p-accent` color. Adjust to match the flow prototype `.bottom-nav` styling. |
| `apps/web/src/lib/components/DesktopNav.svelte` | Token swap. Tab pattern from flow's screen-tabs. |
| `apps/web/src/lib/components/DesktopShell.svelte` | Container is already correct. Just verify no hard-coded colors. |

### Pages (P1)

| File | Action |
|---|---|
| `apps/web/src/routes/auth/+page.svelte` | Wordmark (`The` JBM + `Penthouse` Ubuntu 3rem bold), underline inputs (`.input-underline`), single primary button. |
| `apps/web/src/routes/+page.svelte` | Home empty state with Rilke quote (italic Ubuntu 1.2rem, max-width 460px) + "Open recent" CTA. The split-pane on desktop is handled by DesktopShell + chat list. |
| `apps/web/src/routes/chat/[id]/+page.svelte` | Wire clustering (`isLastInCluster`, `isFirstInCluster` helpers). The visible padding/widths from the prototype apply. |
| `apps/web/src/routes/users/+page.svelte` | Directory using `ProfileCard` component, reading target user's `profile_style`. |
| `apps/web/src/routes/users/[id]/+page.svelte` | Single-user view. Same `ProfileCard`. |
| `apps/web/src/routes/settings/+page.svelte` | New section structure: N°01 Identity, N°02 Presence, N°03 Appearance (theme+mode), N°04 Profile Style. Drop wallpaper section, drop separate "N°05 Theme" — Appearance handles both axes. |

### Components to build (P1)

| File | What it does |
|---|---|
| `apps/web/src/lib/components/AppearanceSettings.svelte` | The card from settings: theme grid (5 swatches) + mode toggle (Dark/Light cards) side-by-side at ≥600px container width, stacked below. Side-by-side uses CSS `@container` not `@media`. |
| `apps/web/src/lib/components/ProfileStyleSettings.svelte` | 3-row picker: Editorial / Vogue / Wallpaper with `psb-label` + `psb-desc`. |
| `apps/web/src/lib/components/ProfileCard.svelte` | Per §5. The single switchable card. |
| `apps/web/src/lib/components/PresencePicker.svelte` | 3-button row (online/away/offline) — already prototyped, lift as-is. |
| `apps/web/src/lib/components/ThemePicker.svelte` | 5 theme cells with swatch + label. Each swatch uses `t[mode].accent` so the preview reflects the current mode. |

### What to delete

| File / construct | Why |
|---|---|
| `apps/web/src/lib/stores/wallpapers.svelte.ts` | Wallpaper concept removed |
| `apps/web/src/lib/components/WallpaperPicker.svelte` (if exists) | Same |
| `wallpapers` table / `wallpaper_id` user column | DB cleanup — coordinate with Codex |
| Any `wallpaper-layer` divs in existing pages | Same |
| `T-L1` references anywhere | The user explicitly excluded T-L1 — never resurface |
| `T-D5`, `T-D6` references | Never selected — also never resurface |

---

## 7 · Discipline rules (avoid the funky)

These are the patterns I watched the user correct twice. Bake them into review:

### Color discipline
- **OKLCH literals only** in new code. No hex, no rgba. Migration tolerates them in legacy files but flag with TODOs.
- **Light mode surfaces darker than bg.** See §3 surface rule.
- **No `color-mix(... var(--p-text) X%, transparent)` for surface fills in light mode.** Use explicit tokens.
- **No `--p-text` alpha-on-bg patterns at all in light mode** — they wash out. Borders OK, fills not.

### Layout discipline
- **No shadow on light-mode cards.** Use 1px border + surface contrast.
- **No glass (`backdrop-filter`) as default.** Only where it earns space — chat composer, top control bar in flow, Wallpaper-style profile card. Not on every card.
- **Spacing scale only:** 4, 8, 14, 22, 40, 64. CSS variables `--sp-1` through `--sp-6`. Don't invent in-between values like 12, 18, 30.
- **Radii scale only:** 4, 8, 14, 22, 999. Variables `--r-xs` through `--r-pill`. Don't invent.
- **Single accent per screen.** Don't mix two accent treatments on the same view.
- **No em dashes.** Use ` — ` (with spaces) in user-visible copy if needed, but prefer simpler punctuation.
- **No "hero metric" stat-card template.** Cards earn their visual weight from content, not big numbers.
- **No side-stripe borders** (left/right accent bars). Killed in impeccable review.

### Chat layout invariants
- Sender pfp leftmost; user pfp rightmost (mirrored).
- Consecutive same-sender messages collapse pfp to the **last** message only.
- Time absolutely positioned **below** the pfp on that last message.
- Reactions live in a **sibling row**, not inside `.bub-col`. Reactions must NEVER push the pfp position.
- Bubble max-width: 70% desktop, 80% mobile.
- Cluster gap (between sender changes): 14px. Within-cluster gap: 4px.

### Settings layout
- Identity hero at top (pfp + name + handle), not a banner.
- Sections are `<section class="card">` with `.card-eyebrow` (JBM uppercase N° tag) + content.
- Two-column responsive via `@container (min-width: 700px)` on the pane root, NOT viewport media queries.
- Sign out is the only `.btn-warning` styled control. Don't use warning style for anything else.
- The `[data-settings]` global mono-font selector in old `+layout.svelte` is **dropped**. Each settings component applies font choices locally.

### Profile card invariants
- Wallpaper style: floating card at `top: 50%; transform: translateY(-50%);` — NOT bottom-anchored.
- Editorial style: pfp 96px (was 112px in older drafts — settle on 96).
- Vogue style: display-name text uppercase, 3rem on desktop, scales down on mobile via container query.
- Banner aspect: always 16:9 on desktop, 4:3 on mobile.
- Status dot border-color always matches the surface it's drawn on, NOT the bg.

### Typography
- Ubuntu (sans) + JetBrains Mono (mono) only. No Gelasio, no Cormorant, no display serifs.
- Italic = light editorial moments only (auth lede, magazine settings titles). Never italicize JBM.
- N° tags always in JBM, 0.6-0.7rem, 2px letter-spacing, uppercase, `--p-secondary` color.
- Display headers: Ubuntu 700, letter-spacing -1.5px at 2.2rem (desktop), -0.8px at 1.5rem (mobile).
- Body: Ubuntu 400, line-height 1.55.

### Motion
- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` for all transitions.
- Durations: 180ms (hover), 280ms (state change), 420ms (page transitions).
- Respect `prefers-reduced-motion` globally. The existing rule in `+layout.svelte` covers it.
- No bounce/spring on toggles in V5. The legacy spec mentioned it; the production should not implement it.

---

## 8 · Mobile + responsive

### Breakpoint strategy

- Mobile-first CSS.
- Tablet breakpoint (single → two-column): **`@container (min-width: 640px)`** on the relevant pane root.
- Desktop split-pane breakpoint: **`@container (min-width: 1024px)`** OR `@media (hover: hover) and (pointer: fine)` for the overall app shell.
- Don't use viewport-only media queries for pane internals. The split shell may live in a smaller column and shouldn't override its children's responsive logic.

### Mobile navigation

- `BottomNav.svelte` is the entry point. Items: Chat, People, Settings. (Profile preview is accessed from Settings.)
- Active item: `--p-accent` color + `--p-accent-soft` bg.
- Height: 56px + safe-area-inset-bottom.
- Position: `fixed; bottom: 0;` on mobile; `display: none` on desktop where DesktopNav takes over.

### Mobile chat back-button

- Chat header on mobile gets a 30px circular back button (border 1px `--p-line-2`, transparent bg) on the left of the avatar.
- Tap → `goto('/')` (home / chat list).

### Mobile-specific bubble width

- Mobile bubble max-width: 80% (not 70%). Otherwise the bubbles look cramped on narrow screens.

---

## 9 · Texture (A1.3 Perlin)

Unchanged from V5. Body has texture at 30% opacity. Panes that should have texture get a `.tex-overlay` at 40% opacity. Avatars get texture at 45% opacity on dark / 30% on light (light avatars look muddy at 45%).

```css
.tex-overlay {
  position: absolute; inset: 0;
  background-image: var(--tex);
  mix-blend-mode: overlay;
  opacity: 0.40;
  pointer-events: none;
}

[data-mode="light"] .avatar-tex { opacity: 0.30; }
```

---

## 10 · Known funky risks to watch for

1. **Mode toggle flips, content jitters.** Cause: bg transition without text transition. Fix: transition both at the same `--dur-base` (280ms) on the app shell.
2. **PFP appears to jump when reactions arrive.** Cause: reactions inside `.bub-col` flex column with `align-items: flex-end` on `.row`. Fix: keep reactions as `.msg > .reactions-row` (sibling), not `.bub-col > .reactions`.
3. **Light theme cards "disappear" on certain themes.** Cause: surface token using `color-mix(in oklch, var(--p-text) ...%, transparent)` instead of explicit token. See §7.
4. **Theme picker doesn't show the right accent in light mode.** Cause: hard-coding `t.accent` on the swatch instead of `t[mode].accent`. Always read mode-aware accent.
5. **`prefers-color-scheme: light` overrides user choice.** Cause: leaving the old `:global([data-theme="light"])` selector in `+layout.svelte`. Delete those blocks — appearance is fully store-driven now.
6. **Status dot border looks wrong on top of bubble.** Cause: dot border-color set to `--p-bg` but dot sits on a card surface. Fix: parent passes the surface color via inline `border-color`, or use `--p-surface` when dot is on a surface element.
7. **Tooltip / menu pops at wrong z-index above the bottom nav.** Cause: bottom nav at z-index 50, menus at 100, but the new control bar in flow uses z-50 too. In production, decide: bottom nav z-30, sticky control bar z-40, modal z-100, toast z-200. Pin it once.
8. **Mobile keyboard shows up, bottom nav floats above input.** Cause: `position: fixed` on bottom nav. Fix: hide bottom nav when composer is focused (`:has(.composer:focus-within)` on the shell, or JS focus listener that adds a class).
9. **iOS safe area not respected.** Add `padding-bottom: env(safe-area-inset-bottom)` to bottom nav. Already in the prototype but easy to lose in port.
10. **Wallpaper code lingers after deletion.** Grep for `wallpaper`, `wallpapers`, `wallpaperId` across `apps/web/src/` AND `services/api/` AND `packages/contracts/` and `infra/` before declaring the migration done.

---

## 11 · Acceptance criteria

Before declaring the V5 implementation done, all of these must pass:

- [ ] `cd apps/web && npx svelte-check` → 0 errors
- [ ] No `Gelasio` references anywhere except in dropped-fonts comments
- [ ] No `wallpaper` references in production source (excluding `_state.svelte.ts` and prototype files)
- [ ] No `T-L1`, `T-D5`, `T-D6` references
- [ ] Switch theme in settings → entire app updates (chat, people, home, all) without page reload
- [ ] Switch mode (dark ↔ light) → entire app updates, no FOUC on next reload
- [ ] Pick profile style in settings → `/users/:my-id` shows the new card style. Open in second browser as another user → same.
- [ ] Light mode visual audit: every card has visible borders or surface contrast against bg. No "missing card" effect.
- [ ] Chat: send 3 in a row as me → only the last shows pfp + time. Receive 2 from them, then I send 1, then 1 more from them: pfp appears on each sender's last-in-cluster message.
- [ ] Chat: react to a message → pfp of that message does NOT shift up.
- [ ] Mobile (390px viewport): chat composer focused → keyboard appears → bottom nav hides → composer stays above keyboard.
- [ ] Mobile: navigate home → tap chat in list → land in chat detail with back button. Tap back → return to list.
- [ ] Tablet (≥640px): settings appearance card splits into two columns (theme grid | mode toggle).
- [ ] Reduced-motion: turn on → no slide-in / scale-up. Color transitions still happen (instant is fine).
- [ ] User-visible copy: no em dashes (`—`). Only ` — ` (with spaces) where editorial voice calls for it.
- [ ] All status dots have visible border color matching their parent surface.

---

## 12 · What's not in scope

To prevent scope creep, the following are NOT this handoff:

- Voice / PTT UI (still in `CLAUDE-V5-REDESIGN-HANDOFF-RESPONSE.md` §6)
- Audio recorder / player styling (same)
- Push notification rendering (same)
- Emoji / sticker / GIF picker theming (touch only enough to swap tokens — full redesign is later)
- E2E encryption indicators (existing)
- Federation status badges (existing)
- Custom emoji upload (existing)
- WebRTC voice channels (Codex)

If you bump into one of these and the theme tokens are obviously wrong, do a token swap and move on. Full redesign waits.

---

## 13 · Sequencing — recommended order

To minimize "everything's broken" middle states:

1. **Foundation (one PR):** create `themes.ts` + `appearance.svelte.ts` + rewrite `+layout.svelte` token block + rewrite `theme.ts` util. App should boot in periwinkle dark identically to before. No visual change for end users yet.
2. **Component tokens (one PR):** swap every hard-coded color in `MessageBubble`, `Avatar`, `ChatListItem`, `ChatListPane`, `BottomNav`, `DesktopNav`, `DesktopShell` to `var(--p-*)`. Still no visual change at periwinkle dark.
3. **Light mode pass (one PR):** add `data-mode` switching to settings, fix every surface that uses `color-mix(... text ...%, transparent)`. Light mode should now look right.
4. **Theme picker (one PR):** add `ThemePicker` + `AppearanceSettings` components, wire to store. All 5 themes selectable. Visual diff: themes work.
5. **Profile style (one PR):** add `ProfileCard` + `ProfileStyleSettings` + server migration coordination with Codex. `/users` renders per-user style.
6. **Chat layout pass (one PR):** rewrite `MessageBubble` with the new clustering + time-below-pfp + sibling reactions pattern. Visual diff: chat looks new.
7. **Page polish (one PR per page):** auth, home empty-state, settings, people, chat detail — apply the layout details from the flow prototype.
8. **Wallpaper purge (one PR):** delete every wallpaper file, store, table column, contract. Coordinate with Codex on DB migration.
9. **Acceptance audit (one PR):** run through §11 checklist, fix anything that fails.

Each PR is independently shippable. None should leave the app worse than the previous PR.

---

## 14 · Where to ask questions

- Design intent unclear → check the flow prototype `/prototypes/flow` at the relevant theme + mode + screen combo.
- Token name unclear → `_state.svelte.ts` is the contract.
- Component DOM unclear → corresponding `V5-XX` prototype file.
- Migration scope unclear → ping me or Aim.
- Server-side change (DB, API) → coordinate with Codex; this doc only tells you what shape the client needs.

---

## 15 · Sign-off checklist for Claude (before handing over)

- [x] Flow prototype demonstrates all 6 screens at mobile + desktop in 5 themes × 2 modes
- [x] `_state.svelte.ts` exports a stable contract Kimi can mirror
- [x] Wallpaper removed from all 5 settings panes + flow page
- [x] Chat clustering + time-below-pfp + sibling reactions verified on V5-01 through V5-05
- [x] Light mode contrast fixed in flow (surfaces darker than bg)
- [x] `svelte-check` passes with 0 errors
- [x] This doc written, file paths verified, code blocks valid TypeScript

---

*End of handoff. Kimi: start with §13 step 1. The flow prototype is your visual oracle — when in doubt, render the same screen there and match it.*
