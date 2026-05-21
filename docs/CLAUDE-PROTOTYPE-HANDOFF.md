# Claude Handoff — V5 Prototype Build

**Date:** 2026-05-13
**From:** Kimi K2.6 (Phase 1 foundation + first 3 prototypes)
**To:** Claude Opus (build remaining 27 prototypes + refine if needed)
**Context:** V5-HANDOFF.md + CLAUDE-V5-REDESIGN-HANDOFF-RESPONSE.md are authoritative.

---

## What's Already Done

### Phase 1: Foundation (complete)
- Token swap in `+layout.svelte` — V5 OKLCH T-D1 default, moonlit light base
- Dual-attribute theme system (`data-theme` + `data-theme-variant`)
- Success/error/info/warning tokens with `-soft` and `-edge` variants
- Backward-compat aliases (`--color-bg` → `--p-bg`, etc.)
- Global utilities: `.tex-overlay`, `.menu`, `.input-filled`, `.input-underline`, `.composer`, `.notice-pill`, focus-visible
- Texture overlay on body at 30%, on panes at 40%
- `app.html` — Gelasio dropped, Ubuntu Italic added
- `offline.html` — Claude's spec implemented
- `prototypes/+page.svelte` — V5 viewer page

### First 3 Prototypes (built by Kimi — review/refine as needed)

| File | Theme | Notes |
|------|-------|-------|
| `ChatPane-V5-01-Periwinkle.svelte` | T-D1 dark | A2.4 bubbles, texture, composer pill, reactions |
| `SettingsPane-V5-01-GlassQuiet.svelte` | T-D1 dark | Glass-quiet, toggles, theme picker, sign-out |
| `PeoplePane-V5-01-Editorial.svelte` | T-D1 dark | Roster + focus, banner+pfp overlap, CTAs |

**Location:** `apps/web/src/lib/prototypes/{chat-pane,settings-pane,people-pane}/`

**Self-contained rule:** Each prototype is a single `.svelte` file with NO imports from `$lib/components/`. All CSS is inline in `<style>`. Mock data lives in `<script>`.

---

## What You Need to Build

### Chat Panes (9 remaining)

Per V5-HANDOFF.md sec 6.2:

| # | File | Theme | Palette notes |
|---|------|-------|---------------|
| 02 | `ChatPane-V5-02-SageMoss.svelte` | T-D2 dark | Sage moss accent (`oklch(0.65 0.06 145)`) |
| 03 | `ChatPane-V5-03-SlateBlue.svelte` | T-D3 dark | Slate blue accent |
| 04 | `ChatPane-V5-04-PlumMauve.svelte` | T-D4 dark | Plum mauve accent |
| 05 | `ChatPane-V5-05-CharcoalRust.svelte` | T-D7 dark | Charcoal rust accent |
| 06 | `ChatPane-V5-06-SageCream.svelte` | T-L2 light | Pastel bubble + dark ink text |
| 07 | `ChatPane-V5-07-SkyPastel.svelte` | T-L3 light | Pastel bubble + dark ink text |
| 08 | `ChatPane-V5-08-BlushPastel.svelte` | T-L4 light | Pastel bubble + dark ink text |
| 09 | `ChatPane-V5-09-LavenderPastel.svelte` | T-L5 light | Modified lavender, pastel bubble + dark ink |
| 10 | `ChatPane-V5-10-OatStone.svelte` | T-L7 light | Pastel bubble + dark ink text |

**For dark themes (01-05):** Same layout as Periwinkle. Override only `--p-accent`, `--p-accent-soft`, `--p-accent-edge` and related derived colors in the component's `:root` or via inline CSS vars.

**For light themes (06-10):** CRITICAL — bubbles must be pastel-tinted (~25% alpha of accent over bg) with `--p-text` color, NOT saturated solid fills with white text. See V5-HANDOFF.md sec 3.1 and sec 6 (risk #6).

### Settings Panes (9 remaining)

Per V5-HANDOFF.md sec 6.2:

| # | File | Variant | Notes |
|---|------|---------|-------|
| 02 | `SettingsPane-V5-02-FloatingPreviewLed.svelte` | S1.5 floating + S2.3 preview-led | More image-forward |
| 03 | `SettingsPane-V5-03-BorderlessTypo.svelte` | S1.6 borderless + S2.1 | No visible borders |
| 04 | `SettingsPane-V5-04-OutlinedDataLed.svelte` | S1.2 outlined + S2.4 data-led | Values prominent |
| 05 | `SettingsPane-V5-05-InsetMixed.svelte` | S1.3 inset + S2.2 control-led | Controls are hero |
| 06 | `SettingsPane-V5-06-MoonlitGlass.svelte` | Moonlit light + S1.4 glass | Light theme variant |
| 07 | `SettingsPane-V5-07-MoonlitBorderless.svelte` | Moonlit light + S1.6 | Light + borderless |
| 08 | `SettingsPane-V5-08-AsymmetricCombo.svelte` | Custom mix | Typo-led h1 4rem + inset rows |
| 09 | `SettingsPane-V5-09-StackedFloating.svelte` | Vertical full-bleed | Floating cards stacked |
| 10 | `SettingsPane-V5-10-MosaicPreview.svelte` | Bento grid | Hero preview top-left |

All settings panes share:
- Identity block (banner + pfp + handle + status)
- Presence picker
- Display name input
- Preferences toggles (Auto-AFK, push, typing, read receipts)
- Wallpaper section
- Theme picker
- Sign-out button

Vary the **surface treatment** and **hierarchy emphasis** per the spec.

### People Panes (9 remaining)

Per V5-HANDOFF.md sec 6.2:

| # | File | Style | Notes |
|---|------|-------|-------|
| 02 | `PeoplePane-V5-02-Vogue.svelte` | P1.1 | Large display name, big pfp overlap |
| 03 | `PeoplePane-V5-03-Wallpaper.svelte` | P1.2 | Split layout, JBM N°04 meta |
| 04 | `PeoplePane-V5-04-NewYorker.svelte` | P1.3 | Columned bio default |
| 05 | `PeoplePane-V5-05-Apartamento.svelte` | P1.4 | Lowercase italics, warm |
| 06 | `PeoplePane-V5-06-Kinfolk.svelte` | P1.5 | Ubuntu Light 300, generous tracking |
| 07 | `PeoplePane-V5-07-Roster.svelte` | Roster-led | Large list, small focus |
| 08 | `PeoplePane-V5-08-Mosaic.svelte` | Grid of cards | No focus pane |
| 09 | `PeoplePane-V5-09-Index.svelte` | A-Z list | Photo-on-hover |
| 10 | `PeoplePane-V5-10-Hero.svelte` | Single member full-bleed | Swipe between |

All people panes share:
- Roster + focus (except Mosaic and Hero)
- Banner image
- Circular pfp with status dot
- Name, role, location, bio
- "Message" + "View portfolio" CTAs

Vary the **editorial voice** via typography weight, banner treatment, roster style.

---

## Technical Constraints

### Self-contained rule
```svelte
<!-- CORRECT: no imports -->
<script>
  const mockData = { ... };
</script>

<!-- INCORRECT: don't do this in prototypes -->
<script>
  import Avatar from '$components/Avatar.svelte'; // NO
</script>
```

### Token access
Prototypes run inside the app shell, so they inherit V5 CSS custom properties from `+layout.svelte`. Use `var(--p-*)` tokens directly. For prototype-specific overrides (e.g., T-D2 accent), define them in the component's `:root` or top-level selector.

Example for T-D2:
```css
.pane {
  --p-accent: oklch(0.65 0.06 145);
  --p-accent-soft: oklch(0.65 0.06 145 / 0.16);
  --p-accent-edge: oklch(0.65 0.06 145 / 0.36);
  /* ...other overrides... */
}
```

### Pane size
All prototypes render at 860×760. Wrap in:
```css
.pane {
  width: 860px;
  height: 760px;
  border-radius: var(--r-lg, 22px);
  overflow: hidden;
  position: relative;
}
```

### Texture
Every pane gets the A1.3 Perlin texture:
```css
.tex {
  position: absolute;
  inset: 0;
  background-image: var(--tex); /* inherited from +layout.svelte */
  mix-blend-mode: overlay;
  opacity: 0.40;
  pointer-events: none;
  z-index: 0;
}
```

### Avatar texture overlay
Every avatar gets texture on top:
```css
.avatar-wrap {
  position: relative;
}
.tex-avatar {
  position: absolute;
  inset: 0;
  background-image: var(--tex);
  mix-blend-mode: overlay;
  opacity: 0.45;
  pointer-events: none;
  border-radius: 50%;
}
```

---

## Quality Gates

After each batch of 3 prototypes:
- [ ] `cd apps/web && npx svelte-check` — 0 errors
- [ ] Visual check: open `/prototypes`, switch categories
- [ ] Light themes: verify bubble text is dark, not white
- [ ] No Gelasio references
- [ ] Texture visible on all panes

After all 30:
- [ ] Update `prototypes/+page.svelte` to import and list all 30
- [ ] Full svelte-check pass
- [ ] Build pass (`npm run build`)

---

## Reference Files

| File | What's in it |
|------|-------------|
| `V5-HANDOFF.md` | Original design handoff with locked decisions |
| `CLAUDE-V5-REDESIGN-HANDOFF-RESPONSE.md` | Your detailed response with all specs |
| `apps/web/src/routes/+layout.svelte` | Token source of truth |
| `apps/web/src/lib/prototypes/chat-pane/ChatPane-V5-01-Periwinkle.svelte` | Kimi's chat reference |
| `apps/web/src/lib/prototypes/settings-pane/SettingsPane-V5-01-GlassQuiet.svelte` | Kimi's settings reference |
| `apps/web/src/lib/prototypes/people-pane/PeoplePane-V5-01-Editorial.svelte` | Kimi's people reference |

---

## Hand-off Contract

1. Review the 3 existing prototypes. Refine if needed.
2. Build in batches of 3 (one per pane type).
3. Stop after batch 1 (prototypes 01-03 of each type = 9 total) and ping the user for spot-check.
4. Continue to completion.
5. Update `prototypes/+page.svelte` with all 30 imports and listings.
6. Run quality gates.

---

*End of handoff. Questions → ask Aim or Kimi.*
