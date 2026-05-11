# HANDOFF → Gemini — Right Pane Design Prototypes

## Scope

Redesign the three right-pane content areas in The Penthouse v4 web app. Produce **10 unique visual prototypes** for each pane type (30 total), each implemented as a self-contained Svelte 5 component.

## Files to create

```
apps/web/src/lib/prototypes/chat-pane/
  ChatPane-01-<ThemeName>.svelte
  ChatPane-02-<ThemeName>.svelte
  ... 10 total

apps/web/src/lib/prototypes/settings-pane/
  SettingsPane-01-<ThemeName>.svelte
  ... 10 total

apps/web/src/lib/prototypes/people-pane/
  PeoplePane-01-<ThemeName>.svelte
  ... 10 total
```

## Context document

**Read first:** `docs/GEMINI-RIGHT-PANE-DESIGN-BRIEF.md`

That brief contains:
- The CORRECT periwinkle-forward color palette (not the stale v3 palette)
- Locked-in typography (Ubuntu adaptive weight for most, JetBrains Mono for settings)
- Full breakdown of what UI elements each pane must display
- 10 conceptual design directions to seed from
- Output format requirements
- Existing component references and CSS variables

## Color palette (quick ref)

| Token | Hex | Role |
|-------|-----|------|
| Primary | `#7070da` | Main actions, brand presence |
| Secondary | `#8282c3` | Supportive UI, secondary actions |
| Tertiary | `#567dd4` | Highlights, badges, decorative emphasis |
| Neutral | `#12121C` | Core background |

## Rules

1. Each of the 10 designs per pane must be **genuinely different** — not color swaps of the same layout
2. All prototypes use **static mock data** — no API calls
3. Use the project's existing CSS variables where possible
4. Include hover/focus states and at least one animation per prototype
5. Target pane size: ~860px wide × 760px tall (desktop monolith right pane)
6. Do NOT use Tailwind, Bootstrap, Material, or any CSS framework
7. Do NOT produce generic Discord/Telegram/iMessage clones

## Build verification

After creating prototypes, verify the project still builds:
```bash
cd /Users/aim/Documents/penthouse-v3/apps/web && npm run build
```

## Priority

The user wants to see these prototypes in-browser to pick a direction. Accuracy to the color palette and distinctiveness between designs are the top criteria.
