# V5 Design Implementation Handoff

**Audience:** Kimi K2.6 (implementation)
**Author:** Claude Opus 4.7 (design + decisions)
**Date:** 2026-05-13
**Project:** The Penthouse — `/Users/aim/Documents/The-Penthouse-Kimi`
**Stack:** SvelteKit 2, Svelte 5 ($state/$props/$derived), Vite 6, TypeScript

---

## 1. Read these first

In this order:

1. `/Users/aim/Documents/The-Penthouse-Kimi/_v5-coherence-preview.html` — the canonical reference. Open in a browser. This shows the unified design language for chat / settings / people at the actual 860×760 pane size, with the cheat-sheet of shared tokens at the bottom.
2. `/Users/aim/Documents/The-Penthouse-Kimi/_design-chooser.html` and `_design-chooser-2.html` — record of the design conversation and rejected options.
3. `/Users/aim/Documents/The-Penthouse-Kimi/apps/web/src/routes/+layout.svelte` — current Nocturne v3 design tokens that V5 supersedes.

Do not synthesize requirements from prompts alone. The preview file IS the spec.

---

## 2. Recommended skills

Use these as you work. Names are the literal slash-command names.

| Skill | When to use |
|---|---|
| **frontend-design** | Default for any new component or pane build. Loaded automatically when you see a `.svelte` file create/modify request. |
| **impeccable** | After a screen is built, run `/impeccable critique` then `/impeccable polish` on it. Pays attention to OKLCH discipline, spacing rhythm, and the absolute-bans list (no side-stripe borders, no gradient text, no glassmorphism-as-default, no em dashes). |
| **astro-component-architect** | Auto-invoked on `.svelte` work in this project per its agent definition. Trust its prop-validation and composition advice. |
| **m3-style-designer** | For tuning CSS architecture and responsive behavior. The 860×760 panes are desktop-fixed; mobile collapses to single-column. |
| **responsive-qa-tester** | After each pane is implemented, run it to validate mobile/tablet/desktop and a11y (axe). |
| **state-store-engineer** | If you touch the Svelte stores at `$lib/stores/*.svelte.ts` (theme, session, wallpapers) to wire the new tokens. |
| **claude-code-guide** | For Svelte 5 runes / SvelteKit 2 idioms specifically. |

Do not invoke `simplify` or `distill` on the prototype files. They're meant to vary; that's the point.

---

## 3. Locked design decisions (do not relitigate)

These were settled across three rounds of chooser + preview with the user. Treat them as constraints.

### 3.1 Chat pane

| Decision | Value | Source |
|---|---|---|
| Background texture | **A1.3 Coarse Perlin** | round 1 |
| Texture opacity | **40%** soft-light overlay | round 2 |
| Bubble shape | **A2.4** mixed: short = 999px pill, long = 22px rounded rect with 4px directional tail | round 1 |
| Bubble opacity | **70%** own bubble fill, 7–10% received | round 2 |
| Avatar shape | Circle, 32 / 38 / 84 / 96 / 128 sizes | round 1 |
| Dark themes | T-D1 Periwinkle, T-D2 Sage moss, T-D3 Slate blue, T-D4 Plum mauve, T-D7 Charcoal rust | round 2 |
| Light themes | T-L2 Sage cream, T-L3 Sky pastel, T-L4 Blush pastel, T-L5 Lavender (modified: lighter pastel bubble + dark text), T-L6 Mint cream, T-L7 Oat & stone | round 2 |
| Excluded themes | T-D5 Dusty teal, T-D6 Olive midnight, T-L1 Cream + periwinkle ink | round 2 |
| Light-theme bubbles | Lighter pastel fill + dark ink text. Do not use saturated solid fills with white text. | round 3 |
| Periwinkle | Stays `#8585F1` for dark themes; preserve as ink/accent option | round 3 |

### 3.2 Settings pane

| Decision | Value | Source |
|---|---|---|
| Palette | Lunar Mist (periwinkle on `#15151D` dark) | round 1 |
| Surface treatment | **Soft glass**, desaturated. Borders ≤ 22% alpha. No neon. | round 3 |
| Variation axis | Surface treatment + hierarchy emphasis (typography-led default; **preview-led** when a screen displays a profile/avatar/banner) | round 3 |
| Sign-out red | **B3.3 Terracotta** `oklch(0.62 0.07 35)` — soft `12%` bg, `32%` edge | round 1 |
| Font rule | Ubuntu for headers + body + buttons; JetBrains Mono **only** for settings values, inputs, eyebrows, ID badges, code-like meta. **No serifs.** | round 1, 3 |
| Moonlit (light) variant | Background `oklch(0.96 0.012 285)` — lavender-tinted pastel, not neutral white. White is too harsh. | round 3 |
| h1 weight | Mix B5.1 / B5.2 / B5.3 across the 10 prototypes for variety | judgment |

### 3.3 People pane

| Decision | Value | Source |
|---|---|---|
| Avatar shape | Circle (C4.1) | round 1 |
| Status indicator | Colored dot (C5.1), ring matches surface | round 1 |
| Layout DNA | **Vogue-dynamic pfp size** (large on focus, smaller in roster) + **New Yorker fusion** (avatar beside name at small size, columned bio) | round 3 |
| Typography | Same as chat/settings: Ubuntu + JetBrains Mono. **No display serifs.** Editorial feel comes from layout + spacing + weight + tracking, not font family. | round 3 |
| Banner + pfp | Must display prominently. Banner ~150px, pfp ~96–128px overlapping banner edge by ~50%. Username + status **below** pfp (not beside), so name never gets clipped by pfp. Bug found in round-3 preview: do not put username in flex-row beside pfp. | round 3 |
| Customization model | **P2.uniform** — each of the 10 prototypes hardcodes one editorial template; the underlying data model carries `user.card_template` so future profile-customization is wired. | judgment |

### 3.4 Cross-cutting

| Decision | Value | Source |
|---|---|---|
| Delete V4 prototypes | Yes (D1.delete) | round 1 |
| Naming | `ChatPane-V5-{NN}-{Theme}.svelte`, `SettingsPane-V5-{NN}-{Variant}.svelte`, `PeoplePane-V5-{NN}-{Style}.svelte` | round 1 |
| Motion budget | Full (D3.full) — message arrive transitions, toggle springs, presence dot pulse, hover micro-interactions. User said "immersively and thoroughly." | round 1 |
| Component reuse | Self-contained `.svelte` files in `prototypes/`. Do NOT import `$lib/components/Avatar.svelte` or `$lib/components/Icon.svelte` from prototypes. Real app components (next section) reuse the shared $lib components. | round 1 |
| Pane size | 860×760 fixed for desktop prototype frames; mobile/responsive collapsing handled at the app shell level (`+layout.svelte`). | inherited |

---

## 4. Shared design tokens (the V5 system)

Replace the current Nocturne v3 tokens in `apps/web/src/routes/+layout.svelte` with this. Keep variable names that other components already reference (e.g. `--color-bg`, `--color-accent`) so consumers don't all need rewrites — just update the values.

### 4.1 OKLCH palette — T-D1 Periwinkle (default)

```css
:root[data-theme="dark"], :root {
  --p-bg:           oklch(0.16 0.020 280);  /* was #12121C */
  --p-surface:      oklch(0.21 0.025 280);
  --p-surface-2:    oklch(0.26 0.030 280);
  --p-text:         oklch(0.93 0.012 280);
  --p-text-2:       oklch(0.80 0.025 280);
  --p-muted:        oklch(0.65 0.050 280);
  --p-muted-2:      oklch(0.50 0.040 280);
  --p-accent:       oklch(0.69 0.140 285);  /* #8585F1 equivalent */
  --p-accent-soft:  oklch(0.69 0.140 285 / 0.16);
  --p-accent-edge:  oklch(0.69 0.140 285 / 0.36);
  --p-secondary:    oklch(0.78 0.090 280);
  --p-line:         oklch(0.78 0.090 280 / 0.12);
  --p-line-2:       oklch(0.78 0.090 280 / 0.22);
  --p-warning:      oklch(0.62 0.070 35);   /* terracotta sign-out */
  --p-warning-soft: oklch(0.62 0.070 35 / 0.12);
  --p-warning-edge: oklch(0.62 0.070 35 / 0.32);
  --p-success:      oklch(0.74 0.140 145);  /* presence dot online */
  --p-away:         oklch(0.82 0.130 80);   /* presence dot away */
  --p-offline:      oklch(0.55 0.020 280);  /* presence dot offline */
}
```

Map the existing names (`--color-bg`, `--color-accent`, etc.) onto these. Drop the bright `--color-success: #34d399` and `--color-error: #D65A4A` — use the new tokens.

### 4.2 Moonlit (light theme)

```css
:root[data-theme="light"] {
  --p-bg:           oklch(0.96 0.012 285);  /* pastel lavender, NOT white */
  --p-surface:      oklch(0.93 0.018 285);
  --p-surface-2:    oklch(0.88 0.022 285);
  --p-text:         oklch(0.22 0.020 285);
  --p-text-2:       oklch(0.40 0.025 285);
  --p-muted:        oklch(0.55 0.030 285);
  --p-muted-2:      oklch(0.65 0.025 285);
  --p-accent:       oklch(0.55 0.130 285);
  --p-accent-soft:  oklch(0.55 0.130 285 / 0.12);
  --p-accent-edge:  oklch(0.55 0.130 285 / 0.30);
  --p-line:         oklch(0.40 0.030 285 / 0.10);
  --p-line-2:       oklch(0.40 0.030 285 / 0.20);
  --p-warning:      oklch(0.50 0.080 30);
  --p-warning-soft: oklch(0.50 0.080 30 / 0.10);
}
```

### 4.3 Other tokens

```css
:root {
  /* Spacing — varied for rhythm */
  --sp-1:  4px;
  --sp-2:  8px;
  --sp-3:  14px;
  --sp-4:  22px;
  --sp-5:  40px;
  --sp-6:  64px;

  /* Radii */
  --r-pill: 999px;
  --r-lg:   22px;
  --r-md:   14px;
  --r-sm:   8px;
  --r-xs:   4px;

  /* Motion */
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);   /* ease-out-expo */
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);  /* ease-out-quart */
  --dur-fast: 180ms;
  --dur-base: 280ms;
  --dur-slow: 420ms;

  /* Texture — A1.3 Coarse Perlin · 40% applied via mix-blend-mode overlay */
  --tex: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.18' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E");

  /* Fonts */
  --font-sans:    'Ubuntu', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  /* DROP --font-display: 'Gelasio'. No serifs in V5. */
}
```

Texture is applied via:
```css
.surface-with-texture::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--tex);
  mix-blend-mode: overlay;
  opacity: 0.40;
  pointer-events: none;
  z-index: 0;
}
```

### 4.4 Typography scale

| Token | Use | Size | Weight | Tracking | Family |
|---|---|---|---|---|---|
| display | Pane h1 | `2.6rem` | 700 | `-1.5px` | Ubuntu |
| h1 | Section heading | `1.8rem` | 500 | `-1px` | Ubuntu |
| h2 | Sub-heading | `1.2rem` | 500 | `-0.5px` | Ubuntu |
| body-lg | Bio / focus copy | `0.95rem` | 400 | normal | Ubuntu |
| body | Body | `0.88rem` | 400 | normal | Ubuntu |
| label | Form label | `0.72rem` | 400 | `1.5px` uppercase | JBM |
| eyebrow | Section eyebrow | `0.70rem` | 400 | `2px` uppercase | JBM |
| meta | Value / ID badge | `0.66rem` | 400 | `1.5px` uppercase | JBM |
| caption | Status / timestamp | `0.66rem` | 400 | `1.5px` uppercase | JBM |

Hierarchy ratio is ≥1.25× between adjacent steps. Do not flatten this.

---

## 5. Shared component vocabulary

These primitives appear identically across all 30 prototypes AND the real app components. Build them once as design tokens; reuse them.

| Primitive | Class | Notes |
|---|---|---|
| Avatar circle | `.av`, sizes `32/38/84/96/128` | Texture overlay on every avatar |
| Status dot | `.dot.online / .away / .offline` | 2–3px ring color matches *current surface* |
| Glass panel | `.glass-panel` | bg `oklch(1 0 0 / 0.03)`, blur 10px, border `--p-line` |
| Toggle | `.toggle` / `.toggle.on` | 38×22 pill, 16×16 thumb, ease-out 280ms |
| Pill button | `.btn-primary` / `.btn-ghost` | radius `--r-pill`, padding 11×24 |
| Bubble | `.bub` / `.bub.short` / `.row.own .bub` | A2.4 mixed shape, 70% opaque (dark) / pastel-tint (light) |
| Field input | `.field input` | radius `--r-sm`, JBM font, focus border `--p-accent-edge` |
| Eyebrow | `.eyebrow` | JBM uppercase, 2px tracking, `--p-secondary` |
| Pane header | `.pane-head` | Eyebrow + Display h1 + version meta, bottom-bordered |

---

## 6. Implementation plan — phases

### Phase 1: Foundation (do this first, ~1 day)

1. **Update global tokens** in `apps/web/src/routes/+layout.svelte`:
   - Replace the `:root` and `[data-theme="light"]` blocks with the V5 OKLCH tokens above
   - Drop `--font-display: 'Gelasio'`. Remove its `@font-face` from `app.html`
   - Remove the body-level radial-dot pattern (the `background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 24px 24px;` block) — V5 uses A1.3 Perlin texture instead
   - Keep `.glass` utility but retune values to match `.glass-panel` spec above

2. **Add the texture overlay primitive** as a reusable mixin/class so any surface can opt in. Add to global `:global(.tex-overlay)`.

3. **Refresh fonts** in `app.html`:
   - Keep Ubuntu, JetBrains Mono
   - Remove Gelasio
   - No other fonts

4. **Wire 11 themes** into `$lib/utils/theme.ts`:
   - Extend `Theme` type beyond `'dark' | 'light' | 'system'` to include the 11 named themes (T-D1, T-D2, T-D3, T-D4, T-D7, T-L2, T-L3, T-L4, T-L5, T-L6, T-L7) plus `'system'`
   - Each theme writes a `data-theme` attribute with its name; each theme is one CSS variable block in `+layout.svelte`
   - Theme picker lives in settings (add it)

### Phase 2: Prototypes (build 30 .svelte files, ~2 days)

**Location:** `apps/web/src/lib/prototypes/{chat-pane,settings-pane,people-pane}/`

**Delete first:** all 30 `*-V4-*.svelte` files in those three subdirectories. User confirmed D1.delete.

**Then build:**

#### Chat (10 files)

Each = one theme variant. Same layout, same texture, same bubble shape, same avatar circle. Different palette + texture intensity nuance.

```
ChatPane-V5-01-Periwinkle.svelte        (T-D1, dark, periwinkle accent)
ChatPane-V5-02-SageMoss.svelte          (T-D2, dark)
ChatPane-V5-03-SlateBlue.svelte         (T-D3, dark)
ChatPane-V5-04-PlumMauve.svelte         (T-D4, dark)
ChatPane-V5-05-CharcoalRust.svelte      (T-D7, dark)
ChatPane-V5-06-SageCream.svelte         (T-L2, light, pastel bubble + ink text)
ChatPane-V5-07-SkyPastel.svelte         (T-L3, light)
ChatPane-V5-08-BlushPastel.svelte       (T-L4, light)
ChatPane-V5-09-LavenderPastel.svelte    (T-L5, light, modified per round 3)
ChatPane-V5-10-OatStone.svelte          (T-L7, light)
```

(T-L6 Mint cream was a nice-to-have; 10 above are the locked list. If you want to substitute T-L6 for any, ask the user.)

#### Settings (10 files)

All Lunar Mist palette + B3.3 terracotta sign-out. Vary surface treatment × hierarchy.

```
SettingsPane-V5-01-GlassQuiet.svelte         (S1.4 glass + S2.1 typography-led, the preview file)
SettingsPane-V5-02-FloatingPreviewLed.svelte (S1.5 floating + S2.3 preview-led)
SettingsPane-V5-03-BorderlessTypo.svelte     (S1.6 borderless + S2.1)
SettingsPane-V5-04-OutlinedDataLed.svelte    (S1.2 outlined + S2.4 data-led)
SettingsPane-V5-05-InsetMixed.svelte         (S1.3 inset + S2.2 control-led)
SettingsPane-V5-06-MoonlitGlass.svelte       (Moonlit light + S1.4 glass)
SettingsPane-V5-07-MoonlitBorderless.svelte  (Moonlit light + S1.6 borderless)
SettingsPane-V5-08-AsymmetricCombo.svelte    (custom mix: typo-led h1 4rem + inset rows)
SettingsPane-V5-09-StackedFloating.svelte    (vertical full-bleed, floating cards)
SettingsPane-V5-10-MosaicPreview.svelte      (bento grid, hero preview top-left)
```

Each prototype renders the full settings spec: identity (banner + pfp + handle + status), presence picker, display name input, preferences panel (Auto-AFK, push, typing, read receipts), wallpaper (url + opacity), theme picker, sign-out.

**Bug to avoid:** Do NOT place handle/username in flex-row beside pfp (see preview file v2 — the username "kimi.eve" gets visually clipped). Stack the pfp ABOVE the handle, or give the row generous gap and enough horizontal space.

#### People (10 files)

All share Vogue-dynamic-pfp + NY-fusion layout DNA. Vary the editorial voice via typography weight, banner treatment, roster style.

```
PeoplePane-V5-01-Editorial.svelte    (canonical, matches preview file)
PeoplePane-V5-02-Vogue.svelte        (P1.1 — large display name, big pfp overlap)
PeoplePane-V5-03-Wallpaper.svelte    (P1.2 — split layout, JBM N°04 meta)
PeoplePane-V5-04-NewYorker.svelte    (P1.3 — columned bio default)
PeoplePane-V5-05-Apartamento.svelte  (P1.4 — lowercase italics, warm)
PeoplePane-V5-06-Kinfolk.svelte      (P1.5 — Ubuntu Light 300, generous tracking)
PeoplePane-V5-07-Roster.svelte       (roster-led: large list, small focus)
PeoplePane-V5-08-Mosaic.svelte       (grid of cards, no focus pane)
PeoplePane-V5-09-Index.svelte        (a-z list, photo-on-hover)
PeoplePane-V5-10-Hero.svelte         (single member full-bleed, swipe between)
```

Each renders: roster + focus, banner image, circular pfp with status dot, name, role, location, bio, "Message" + "View portfolio" CTAs.

### Phase 3: Real app component migration (~3 days)

The user explicitly called out coherence: *"the app itself may also have a lot of discrepancies like different sorts of UI that we haven't gone through and designing them or edge cases. and then theres the containers for other elements within the app so youll want to search for those so that we dont have incoherent looking app."*

Touch every file below. For each, apply V5 tokens, replace ad-hoc colors with `var(--p-*)` references, match component vocabulary, and re-test.

| File | Priority | What changes |
|---|---|---|
| `apps/web/src/routes/+layout.svelte` | P0 | Token swap (phase 1) |
| `apps/web/src/app.html` | P0 | Drop Gelasio font link |
| `apps/web/src/lib/components/MessageBubble.svelte` | P0 | A2.4 shape, 70% opacity, theme-aware text color (ink in light themes), texture overlay on avatar inside |
| `apps/web/src/lib/components/MessageComposer.svelte` | P0 | Pill capsule shape (1px border `--p-line-2`, focus `--p-accent-edge`), JBM placeholder |
| `apps/web/src/lib/components/Avatar.svelte` | P0 | Texture overlay (`var(--tex)` mix-blend-overlay 0.45), gradient backgrounds use OKLCH tokens, expose `size` prop with values 32/38/84/96/128 |
| `apps/web/src/lib/components/Icon.svelte` | P1 | Make stroke-currentColor by default; consumer controls color via parent |
| `apps/web/src/lib/components/BottomNav.svelte` | P0 | Glass-soft surface, JBM labels uppercase tracked, presence dot on user avatar tab |
| `apps/web/src/lib/components/DesktopNav.svelte` | P0 | Same vocabulary as BottomNav |
| `apps/web/src/lib/components/DesktopShell.svelte` | P0 | Apply texture to shell bg, drop radial-dot |
| `apps/web/src/lib/components/ChatListPane.svelte` | P0 | Item rows match `.member` style from preview, glass-soft on hover, active state `--p-accent-soft + --p-accent-edge` |
| `apps/web/src/lib/components/ChatListItem.svelte` | P0 | Avatar 38px circle, unread pill JBM, last-message body Ubuntu 0.88rem |
| `apps/web/src/lib/components/ChannelList.svelte` | P1 | Same row vocabulary as ChatListItem |
| `apps/web/src/lib/components/ReplyBar.svelte` | P1 | Glass-soft pill above composer, JBM meta "REPLYING TO @name" |
| `apps/web/src/lib/components/TypingIndicator.svelte` | P1 | Bubble in A2.4 shape with 3-dot pulse animation, theme-aware color |
| `apps/web/src/lib/components/ReadReceipts.svelte` | P1 | Stacked tiny avatars (16px) with JBM count meta, no bright colors |
| `apps/web/src/lib/components/ReactionPill.svelte` | P1 | Pill `--p-surface-2`, hover `--p-accent-soft`, JBM count |
| `apps/web/src/lib/components/PinBanner.svelte` | P1 | Glass-soft, eyebrow + body, no bright accent stripe |
| `apps/web/src/lib/components/PushPermissionBanner.svelte` | P1 | Same banner treatment as PinBanner |
| `apps/web/src/lib/components/PushSettings.svelte` | P1 | Inherits settings-pane vocabulary (toggles, JBM values) |
| `apps/web/src/lib/components/MarkdownText.svelte` | P2 | Ensure inline `<code>` uses JBM at 0.86em, blockquotes get `--p-line` left treatment via PADDING not border (no side-stripe ban) |
| `apps/web/src/lib/components/AudioPlayer.svelte` | P2 | Pill controls, glass-soft surface, JBM timestamps |
| `apps/web/src/lib/components/AudioRecorder.svelte` | P2 | Match composer pill, recording state pulses `--p-accent` |
| `apps/web/src/lib/components/EmojiPicker.svelte` | P2 | Glass-soft popover, grid 8-col, hover `--p-accent-soft` |
| `apps/web/src/lib/components/EmotePicker.svelte` | P2 | Same as EmojiPicker |
| `apps/web/src/lib/components/StickerPicker.svelte` | P2 | Same vocabulary |
| `apps/web/src/lib/components/GifPicker.svelte` | P2 | Same vocabulary, JBM search input |
| `apps/web/src/lib/components/UnifiedPicker.svelte` | P2 | Tab strip uses JBM uppercase eyebrows, switch animation 280ms ease-out |
| `apps/web/src/lib/components/EmojiEmoteAutocomplete.svelte` | P2 | Glass-soft dropdown, item rows match `.member` style |
| `apps/web/src/routes/auth/+page.svelte` | P1 | Apply V5 system — was not in prototype scope but is the first surface a user sees. Centered card with eyebrow + display + form fields + terracotta-soft "Sign in" secondary action. |
| `apps/web/src/routes/chat/[id]/+page.svelte` | P0 | Glue: uses MessageBubble + Composer in V5 layout |
| `apps/web/src/routes/settings/+page.svelte` | P0 | Match SettingsPane-V5-01 as default; theme picker exposes the 11 themes |
| `apps/web/src/routes/users/+page.svelte` | P0 | Match PeoplePane-V5-01 |
| `apps/web/src/routes/+page.svelte` | P1 | Empty-state / welcome (see edge cases) |
| `apps/web/src/routes/prototypes/+page.svelte` | P1 | Index page listing all 30 prototypes; eyebrow + display title + 3 columns of cards. Use V5 vocabulary. |

### Phase 4: Edge cases (~1 day)

These weren't covered by the prototypes but must be designed for coherence.

| Edge case | Design direction |
|---|---|
| **Empty chat (no messages yet)** | Centered Ubuntu 0.95rem "No messages yet" + JBM meta "WAITING ON THE FIRST WORD" + faint avatar of the other party. NOT an illustration. |
| **Empty people roster** | "The Penthouse is quiet right now" + JBM meta "Invite someone to populate the floor". |
| **Empty chat list** | Eyebrow + display "Nothing yet" + ghost row showing what a chat row will look like once populated. |
| **Loading skeletons** | Shimmer is forbidden. Use a faint `--p-surface-2` block at the same dimensions as the final content, no animation. Or a single slow pulse at 1500ms ease-out. |
| **Error states** | Terracotta-soft surface (matches sign-out), JBM eyebrow "SOMETHING WENT WRONG", Ubuntu body explaining. Always offer a single action button (retry / dismiss). |
| **Toast / snackbar** | Top-center, glass-soft pill, eyebrow + body, auto-dismiss 4s ease-out fade. Do not use modals for transient feedback. |
| **Modal / dialog** | Reserve only for destructive confirms or required-input flows. Glass-soft panel, eyebrow + display heading + body + 2 buttons (primary + ghost). Backdrop is `oklch(0 0 0 / 0.45)`. |
| **Context menu (right-click on message)** | Glass-soft floating panel, items as pill rows with hover `--p-accent-soft`, JBM eyebrow grouping. |
| **Settings → Account dropdown** | Same context menu vocabulary. |
| **File upload progress** | Inline thin bar 2px, `--p-accent` fill, ease-out width animation. No spinner. |
| **Voice / video call surface** | Out of V5 scope but will inherit: large centered pfp ring pulse, JBM call duration, glass-soft action pill at bottom. |
| **Onboarding / first-run** | 3 panels stepping through: theme pick → display name → invite, each panel is full-pane editorial style (eyebrow + display + 1 input + primary button). |
| **404 / route not found** | "N° 404 · LOST" eyebrow, "Nothing on this floor" h1, single ghost link back. |
| **Disabled states** | `opacity: 0.45`, `cursor: not-allowed`. No grayscale filter. |
| **Focus rings (a11y)** | `outline: 2px solid var(--p-accent-edge); outline-offset: 2px;` Never `outline: none` without a custom focus style. |
| **Reduced-motion** | Respect `@media (prefers-reduced-motion: reduce)` block already in `+layout.svelte`. Disable message-arrive stagger and toggle springs. |

### Phase 5: QA + polish (~1 day)

1. Run `/responsive-qa-tester` against the 30 prototypes + the 5 main routes (`/`, `/chat/[id]`, `/users`, `/settings`, `/auth`).
2. Run `/impeccable critique` on each pane, then `/impeccable polish`.
3. Run `pnpm typecheck` and `pnpm test` from `apps/web/`.
4. Manually verify the avatar-and-username layout fix from the preview is applied everywhere it shows up (settings identity block, people focus pane, chat header).
5. Visual regression: open `_v5-coherence-preview.html` side by side with the actual app routes. They must feel like the same product.

---

## 7. Known issues / risks

1. **Theme proliferation.** 11 named themes is a lot for `data-theme` attribute switching. Consider generating the CSS variable blocks from a single TypeScript source-of-truth (a `themes.ts` file mapping theme name → token values), then composing at build time. Saves duplication.

2. **`Gelasio` removal may break callers.** Grep for `--font-display` and `font-family: var(--font-display)` before removing. Anywhere it's used, swap to Ubuntu 700 -1.5px tracking.

3. **The body-level radial-dot pattern** in `+layout.svelte` is applied via `:global(body) { background-image: radial-gradient(...) }`. Removing it might leave the body bg flat. V5 wants A1.3 texture there instead — apply via `:global(body)::before` overlay.

4. **`[data-settings]` global rule** at line 306–309 forces `--font-mono` on the whole settings page. V5 rule is the opposite: Ubuntu by default, JBM ONLY on values/eyebrows/meta. Remove this global rule and apply JBM precisely where needed.

5. **Auth screen and welcome page** were never prototyped in the V4 or V5 chooser flow. The user implicitly expects them to follow the same system. Phase-3 work covers `/auth`; add a `/welcome` prototype if user requests.

6. **Light-mode bubbles in the chat.** Round 3 user said "lets make those message bubbles more lighter pastel and use dark text instead." This applies to ALL light themes, not just lavender. Make sure `T-L2` through `T-L7` bubbles are pastel-tinted (≈25% alpha of the accent over the bg) with `--p-text` color, NOT saturated solid fills with white text.

7. **The user's banner-not-tall-enough finding.** The original preview had pfp + handle in a flex-row beside each other; the pfp's bottom half visually overlapped the username text. The preview has been corrected to stack vertically (pfp above, handle below). Carry this into every settings + people layout that has banner + pfp.

8. **Glass-soft is purposeful, not decorative.** The impeccable skill bans glassmorphism-as-default. V5 uses it intentionally to let the underlying A1.3 texture peek through panels — that IS the design language. When critiquing, defend it on this basis: it's not aesthetic-only, it serves the texture-led identity.

9. **OKLCH browser support** is ≥92% as of mid-2025 (Chrome 111+, Safari 15.4+, Firefox 113+). The user is shipping a modern PWA (sql.js, mediasoup-client, view transitions) — they're not targeting old browsers. No fallback needed.

10. **`--color-success` and `--color-error` are referenced elsewhere.** Grep before deleting. Keep them as aliases that point to new V5 tokens during migration, then remove once consumers are updated.

---

## 8. File map for this handoff

- `/Users/aim/Documents/The-Penthouse-Kimi/V5-HANDOFF.md` — this file
- `/Users/aim/Documents/The-Penthouse-Kimi/_v5-coherence-preview.html` — visual reference, open in browser
- `/Users/aim/Documents/The-Penthouse-Kimi/_design-chooser.html` — round 1 chooser
- `/Users/aim/Documents/The-Penthouse-Kimi/_design-chooser-2.html` — round 2 chooser
- `/Users/aim/Documents/The-Penthouse-Kimi/apps/web/src/lib/prototypes/` — destination for the 30 V5 svelte files (delete V4 first)
- `/Users/aim/Documents/The-Penthouse-Kimi/apps/web/src/routes/+layout.svelte` — token swap target
- `/Users/aim/Documents/The-Penthouse-Kimi/apps/web/src/lib/components/*.svelte` — component migration targets

---

## 9. Hand-off contract

When the user pings you to take this over, your first move should be:

1. Open the preview file in a browser. Acknowledge what you see.
2. Confirm with the user whether you should start with Phase 1 (foundation) or jump to Phase 2 (prototypes). Default to Phase 1 because every prototype + every real component depends on the tokens being right.
3. Build the 30 prototypes from the spec in section 6.2. Each file ≈ 250–350 lines of self-contained Svelte 5.
4. Stop after the first 3 prototypes (one per pane) and have the user spot-check coherence before fanning to the remaining 27. They've been burned by direction-drift twice already; one more check is cheap.
5. Phase 3 is the slog. Don't start it until 30 prototypes exist and are approved, because the real components borrow patterns FROM the prototypes.

---

## 10. What was rejected and why (for context)

So you don't suggest these again:

- **Display serifs** (Cormorant / Playfair / Fraunces / EB Garamond / GFS Didot). Rejected round 3 for breaking app-wide typography coherence. People-pane "editorial elegance" comes from layout + tracking + weight contrast, NOT serif font family.
- **Glow-orb backgrounds.** Rejected round 1. V5 uses A1.3 uniformly textured surface, no single radial pool.
- **Bright primary fills with white text on light themes** (e.g. solid `#8585F1` button with white text on cream). Rejected round 3. Light themes use lighter pastel fills with dark ink text.
- **Pure white background for moonlit light theme.** Rejected round 3 for being "too harsh." Use pastel lavender tint.
- **Saturated sign-out red.** Rejected round 1. Use terracotta soft.
- **Modal-first interaction patterns.** Rejected per impeccable skill — exhaust inline alternatives first.
- **Side-stripe accent borders** (e.g. `border-left: 3px solid var(--p-accent)` on banners). Rejected per impeccable absolute bans. Use full borders, leading icons, or background tints.
- **Em dashes in copy.** Rejected per impeccable. Use commas, colons, periods, or parentheses.
- **V4 prototypes.** Delete them.

---

End of handoff. Ping the user when you're ready to start Phase 1.
