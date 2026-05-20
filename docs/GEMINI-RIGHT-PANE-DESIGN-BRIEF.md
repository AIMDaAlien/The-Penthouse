# Gemini Design Brief — Right Pane Redesign Prototypes

## Project Context

**The Penthouse** — v4 clean-room rebuild. A dark-mode chat application with a sophisticated, nocturnal aesthetic. Think: editorial nightclub. Not Discord. Not Slack. Something with personality.

**Tech stack:** Svelte 5 (runes), CSS-in-component (`<style>` blocks), no Tailwind, no generic UI frameworks. Floating monolith shell (1200×760px on desktop).

**Layout:** Two-pane desktop layout. Left pane (340px) = chat list. Right pane (flex:1) = content. This brief is **only** about redesigning the **right pane** content areas.

---

## The CORRECT Color Palette (from DESIGN.md)

| Token | Hex | Role |
|-------|-----|------|
| **Primary** | `#7070da` | Main actions, brand presence, primary buttons, active states |
| **Secondary** | `#8282c3` | Supportive UI, secondary actions, muted accents |
| **Tertiary** | `#567dd4` | Highlights, badges, decorative emphasis, links |
| **Neutral** | `#12121C` | Core background surface for ALL elements |

**Derived dark-mode surface hierarchy (build these from the palette above):**
- Background: `#12121C`
- Surface (cards, panels): `#1E1E2D`
- Surface elevated: `#252538`
- Border: `rgba(130, 130, 195, 0.2)` — periwinkle-tinted, not grey
- Text primary: `#E2E2EC`
- Text secondary: `#8C8CC5`
- Text muted: `#646478`
- Danger/Error: `#ff8ca6`
- Success: `#34d399`

**CRITICAL:** Do NOT use generic greys. Everything should feel periwinkle-tinted. Even "neutral" surfaces should have a subtle cool/periwinkle undertone.

---

## Typography (ALREADY DECIDED — do not change)

| Context | Font | Notes |
|---------|------|-------|
| **Settings page** | JetBrains Mono | Monospace throughout settings |
| **Everything else** | Ubuntu (adaptive weight) | Light (300), Regular (400), Medium (500), Bold (700) as needed |

The current root CSS already sets these up via `--font-sans: 'Ubuntu'` and `--font-mono: 'JetBrains Mono'`.

---

## Shape Language (from DESIGN.md)

- **Maximum corner rounding.** Pill-shaped buttons, heavily rounded cards, soft inputs.
- `--radius-sm: 6px`, `--radius-md: 12px`, `--radius-lg: 20px`, `--radius-xl: 24px`, `--radius-full: 9999px`
- Standard density — neither cramped nor sparse.

---

## The Three Pane Types

Each needs 10 **different and unique** visual treatments. Nonconventional. Not generic chat-app templates.

### Pane A: Message Chat (`/chat/[id]`)

**What it displays:**
- Chat header (name, channel list dropdown, search toggle, pinned messages)
- Scrollable message list (text, images, GIFs, reactions, replies, edits, read receipts)
- Message composer at bottom (text input, emoji/sticker/GIF picker, file attach, audio recorder, send button)
- Typing indicator
- Optional: search overlay, voice chat bar

**Current pain points:**
- Message bubbles are basic rectangles
- Read receipts were removed from the loop (need a better placement strategy)
- Composer icons are small/bland
- No visual hierarchy between own messages and others

### Pane B: Settings (`/settings`)

**What it displays:**
- Banner + overlapping avatar upload area (with crop modal already built)
- Display name field
- Presence selector (available/busy/dnd/afk/offline) + note
- Auto-AFK toggle
- Push notification settings
- Wallpaper manager (URL, color, opacity, list of saved wallpapers)
- Theme toggle
- Logout button

**Current pain points:**
- Scrollable but visually flat
- Wallpaper section is a basic list
- Profile section lacks visual impact

### Pane C: People Directory (`/users`)

**What it displays:**
- Search bar (search by display name)
- User cards: avatar, display name, username, presence state (with colored dot), presence note, last seen
- Tap a user to start a DM
- Empty states for no users / no search results

**Current pain points:**
- User cards are flat horizontal rows
- Presence dots are tiny 8px circles
- No visual distinction between states
- Search feels disconnected from results

---

## Design Direction: "Nonconventional but The Penthouse Befitting"

Think about these as starting points for uniqueness. Each of the 10 designs per pane should push into one of these territories or combine them unexpectedly:

1. **Liquid Glass** — Heavy glassmorphism with periwinkle refraction, frosted panels floating over deep void
2. **Brutalist Soft** — Raw blocky layouts but with the pill-shaped rounding, periwinkle raw concrete textures
3. **Art Deco Nocturne** — Geometric fan patterns, stepped borders, periwinkle gold-substitute accents on deep navy
4. **Zen Garden Grid** — Extreme whitespace, single thin periwinkle lines, asymmetric composition
5. **Terminal Couture** — Monospace + box-drawing characters + periwinkle glow, but make it fashion
6. **Swiss Editorial** — Bold typographic hierarchy, strict grid, periwinkle as the only color against black
7. **Organic Blobs** — No straight lines, everything is soft curved shapes, periwinkle gradients bleeding into void
8. **Vaporwave Cathedral** — Periwinkle-to-pink gradients, scanlines, chrome effects, but restrained and elegant
9. **Kinetic Typography** — Messages that animate in with physics, presence states as pulsing orbs, everything breathes
10. **Museum Exhibit** — Each message is a framed artifact, settings are control panels, people are portrait galleries

**IMPORTANT:** These are starting concepts. Gemini should invent its own directions too. The goal is variety — 10 genuinely different approaches so the user can pick what resonates.

---

## Output Format

For each pane (Chat, Settings, People), produce 10 prototype files in this structure:

```
apps/web/src/lib/prototypes/
  chat-pane/
    ChatPane-01-LiquidGlass.svelte
    ChatPane-02-BrutalistSoft.svelte
    ... (10 total)
  settings-pane/
    SettingsPane-01-TerminalCouture.svelte
    ... (10 total)
  people-pane/
    PeoplePane-01-MuseumExhibit.svelte
    ... (10 total)
```

Each prototype:
- Is a **self-contained Svelte 5 component** (no external dependencies beyond the project's existing icon/avatar components)
- Uses **static mock data** — no real API calls
- Demonstrates the layout, spacing, colors, and interactive feel
- Includes hover states, focus states, and at least one animation
- Uses the correct color palette (`#7070da`, `#8282c3`, `#567dd4`, `#12121C`)
- Respects the pane dimensions: right pane is ~860px wide × 760px tall on desktop
- Is **visually distinctive** from the other 9 in its category

---

## What NOT to do

- Do NOT use Tailwind, Bootstrap, Material, or any CSS framework
- Do NOT use generic light-mode palettes
- Do NOT produce 10 variations of the same layout with slightly different colors
- Do NOT ignore the periwinkle-forward requirement
- Do NOT change typography fonts (Ubuntu for most, JetBrains Mono for settings)
- Do NOT make designs that look like Discord, Telegram, or iMessage

---

## Existing Component References

These components exist and can be imported in prototypes:
- `Icon.svelte` — SVG icons (stroke-based, accepts `name`, `size`, `strokeWidth`)
- `Avatar.svelte` — circular avatar with fallback initials
- `MessageBubble.svelte` — current message bubble (can be restyled or replaced)
- `MessageComposer.svelte` — current composer (can be restyled or replaced)

Existing CSS variables available:
```
--color-bg, --color-surface, --color-surface-elevated
--color-border, --color-border-solid
--color-text, --color-text-secondary, --color-text-muted
--color-accent, --color-accent-dim, --color-accent-hover
--color-danger, --color-error, --color-success
--font-sans, --font-mono, --font-display
--text-xs through --text-2xl
--weight-light, --weight-regular, --weight-medium, --weight-bold
--space-xs through --space-xl
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-full
```

---

## Final Note

The user wants to **see** these prototypes in the browser. Each design should be something they'd actually want to click through and experience. Make them feel like walking into a different room in the same penthouse suite.
