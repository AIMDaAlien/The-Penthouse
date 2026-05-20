# DESIGN.md — The Penthouse

> Bootstrapped from `apps/web/src/lib/prototypes/_state.svelte.ts` and the
> V5 / Flow handoff docs. Keep in sync with `apps/web/src/lib/themes.ts`
> once that file lands.

## Color system

**Color space:** OKLCH literals only in new code. No hex, no rgba. Neutrals
are tinted toward the theme hue at chroma 0.020–0.032 — never `#000`
or `#fff`.

**Strategy:** Committed-restrained hybrid. One accent color carries identity
(~10–20% of surface, more on the wordmark and on accent states). Surfaces
are tinted neutrals tied to the theme hue.

### Themes (five, all bidirectional)

Each theme defines a full PaletteVars for `dark` and `light` modes. Light is
hand-tuned, never derived from dark via OKLCH math.

| Theme | Dark accent | Light accent | Dark bg hue | Light bg hue |
|---|---|---|---|---|
| Periwinkle (default) | `oklch(0.69 0.140 285)` | `oklch(0.55 0.130 285)` | 280 | 285 |
| Sage | `oklch(0.65 0.060 145)` | `oklch(0.46 0.070 145)` | 145 | 110 |
| Slate | `oklch(0.62 0.075 245)` | `oklch(0.50 0.090 230)` | 245 | 230 |
| Plum | `oklch(0.60 0.090 340)` | `oklch(0.52 0.090 20)` | 340 | 20 |
| Charcoal | `oklch(0.60 0.100 35)` | `oklch(0.46 0.030 75)` | 35 | 75 |

### Token contract per palette

```ts
interface PaletteVars {
  accent: string;        // oklch literal
  accentSoft: string;    // accent / 0.18 dark, / 0.14 light
  accentEdge: string;    // accent / 0.38 dark, / 0.32 light
  bg: string;
  surface: string;       // dark: LIGHTER than bg; light: DARKER than bg
  surface2: string;      // one more step in the same direction
  text: string;
  text2: string;
  muted: string;
  secondary: string;
  line: string;          // alpha border
  line2: string;         // alpha border, more visible
  success: string;
  warning: string;
}
```

### Light-mode surface rule (critical)

Surfaces step DARKER than bg. The alpha-on-text-color trick that works on
dark backgrounds disappears against light backgrounds.

❌ `background: color-mix(in oklch, var(--p-text) 4%, transparent)` on a
0.96-light bg → ~0.92 = invisible.

✅ `background: var(--p-surface)` where `--p-surface = oklch(0.91 ... <hue>)`
— explicitly darker than bg by ~5%.

## Typography

- **UI body:** Ubuntu (variable). 14–15px base, line-height 1.5–1.55.
- **Mono / metadata:** JetBrains Mono. Timestamps, handles, technical labels.
- **Wordmark / display:** Playfair Display (or another high-contrast Didone)
  — wordmark and brand surfaces ONLY. Never use serifs in product chrome.
- **Hierarchy:** scale ratio ≥1.25 between steps. Weight contrast 400 ↔ 600
  is the workhorse pair.
- **Cap body line length:** 65–75ch in long-form (settings descriptions,
  empty states, profile bios).

### Type scale

| Token | Size | Use |
|---|---|---|
| `--t-xs` | 11px | Timestamps, captions |
| `--t-sm` | 13px | Secondary text, labels |
| `--t-base` | 15px | Body, chat bubbles |
| `--t-md` | 17px | Section headings |
| `--t-lg` | 22px | Page titles |
| `--t-xl` | 32px | Profile display names |
| `--t-display` | 48–96px | Hero, settings landing, wordmark |

## Spacing scale

`--sp-1: 4px`, `--sp-2: 8px`, `--sp-3: 14px`, `--sp-4: 22px`,
`--sp-5: 40px`, `--sp-6: 64px`. Vary spacing for rhythm — same padding
everywhere is monotony.

## Radii

| Token | Value | Use |
|---|---|---|
| `--r-xs` | 4px | Inline tags, kbd |
| `--r-sm` | 8px | Small chips, dense controls |
| `--r-md` | 14px | Cards, panes |
| `--r-lg` | 22px | Modals, large panels |
| `--r-pill` | 999px | Pill buttons, presence dots, avatars |

## Motion

- Curve: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo). No bounce, no
  elastic, no overshoot.
- Duration: 180ms for micro (hover, focus), 320ms for layout-adjacent state
  changes, 480ms only for entry/exit of major panels.
- Never animate CSS layout properties (`width`, `top`, `left`). Animate
  `transform` and `opacity`.

## Texture

A single Perlin SVG noise overlay sits above bg, below surfaces. Opacity
~3–5% dark mode, ~2–3% light mode. One overlay only — never per-component
noise.

## Component patterns

### Chat clustering

DOM: `.msg > .row(.avatar-col + .bub) + optional sibling .reactions-row`

- Avatar in `.avatar-col`, `width: 32–36px`, `align-self: flex-end` via
  parent `align-items: flex-end`.
- Avatar only on the **last** message in a same-sender cluster.
- Timestamp absolutely positioned below avatar:
  `position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
   margin-top: 6px;`
- Reactions row is a sibling outside the avatar+bubble flex — never pushes
  the pfp.
- Bubble max-width: 70% desktop, 80% mobile.

### Settings

- Numbered sections (`N°01 Identity`, `N°02 Presence`, `N°03 Appearance`,
  `N°04 Profile style`). Mono numerals.
- 2-column on `min-inline-size: 640px`, 1-column below.
- Single-word color labels: Periwinkle, Sage, Slate, Plum, Charcoal.

### Profile cards

Three layouts driven by `profile_style`:
- **Editorial** — banner above, roster + focus pane. Calm, magazine-like.
- **Vogue** — display-name hero, large pfp overlap. Identity-forward.
- **Wallpaper** — banner fills, identity card floats at midheight.

## Absolute bans (cross-register)

Refuse on sight; rewrite the element with different structure.

- **Side-stripe borders** (`border-left: 3px solid <accent>`)
- **Gradient text** (`background-clip: text` + gradient bg)
- **Glassmorphism as default** — only for one specific surface, never
  decorative
- **Hero-metric template** — big number, label, gradient, supporting stats
- **Identical card grids** — same-sized icon-heading-text cards repeated
- **Modal as first thought** — exhaust inline / progressive alternatives
- **Em dashes in copy** — use commas, colons, semicolons, parens
- **`#000` and `#fff`** — always tint toward theme hue
- **Drop shadows on chat bubbles** — flat surfaces only
- **Serifs in product chrome** — wordmark and brand surfaces only

## File map

- `apps/web/src/lib/themes.ts` — theme catalog (canonical, to be created)
- `apps/web/src/lib/stores/appearance.svelte.ts` — themeId + mode store
- `apps/web/src/routes/+layout.svelte` — token application via `style:` bindings
- `apps/web/src/lib/prototypes/_state.svelte.ts` — prototype-only state
- `apps/web/src/routes/prototypes/flow/+page.svelte` — visual contract
