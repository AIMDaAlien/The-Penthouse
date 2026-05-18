# AGENT-HANDOFF-KIMI-APP-ICON

**Status:** decided, assets shipped, ready to wire up
**Author:** Claude (Opus 4.7)
**Date:** 2026-05-16
**Recipient:** Kimi K2.6

## Decision

App icon = the `pent-thick` variant from the logo prototype gallery.

Constructivist 2x2 grid: four PENT letters in heavy Didone (Playfair Display, weight 900) anchored to the corners of the canvas, divided by a heavy periwinkle crosshair. The cross carries 8% of the surface in committed-accent color; the letters carry the ink.

Visually it reads as:
- a typographic monogram (four letters of PENT)
- a confident editorial nameplate (the cross as a printer's register)
- a quiet building reference (four floor-plan quadrants, no skeuomorphism)

This is **only** the app icon. The wordmark ("The PENT HOUSE" stacked Didone) remains the primary brand mark in every in-app surface — settings, headers, landing, profile cards, conversation chrome. The thick-cross icon appears strictly where the OS or browser demands a square mark and the wordmark won't fit.

## Where the icon is used

- Browser tab favicon (16 / 32 / 48 px)
- iOS Safari home-screen icon (`apple-touch-icon`)
- Android Chrome PWA install icon (manifest, "any" purpose)
- Android Chrome PWA install icon (manifest, "maskable" purpose)
- Chromebook PWA installs (manifest)
- OG image / social-card thumbnail (optional, not yet wired)

## Where the icon is NOT used

- Header bar of the app
- Settings landing
- Profile cards
- Empty states
- Login / auth screens
- Anywhere the wordmark already lives

When in doubt, the wordmark wins.

## Assets shipped (by Claude)

| File | Purpose | Notes |
|---|---|---|
| `apps/web/static/icons/icon.svg` | Default (dark) | `oklch` palette baked in. Previous gradient-P icon replaced. |
| `apps/web/static/icons/icon-light.svg` | Light variant | For `media="(prefers-color-scheme: light)"` favicon override. |
| `apps/web/static/icons/icon-maskable.svg` | PWA maskable | Full-bleed bg, content scaled to inner-80% safe zone. |
| `apps/web/static/manifest.webmanifest` | PWA manifest | Icons array was missing; now populated. theme_color stays hex (webmanifest spec doesn't accept oklch). |

All four files use `viewBox="0 0 512 512"` so PNG raster output is precise.

## Source-of-truth note

The design source lives at `apps/web/src/lib/prototypes/logo/variants.js` under the id `pent-thick` (family `grid`, number `01h`). Don't reference variants.js for production — it's a theme-aware function that takes runtime ink/accent. The static SVGs in `static/icons/` are the frozen, color-baked production copies. They are the canonical assets.

If you ever need to regenerate the SVGs from the prototype source, run `pent-thick` with:
- dark: ink `oklch(0.95 0.012 280)`, accent `oklch(0.72 0.150 285)`, bg `oklch(0.16 0.020 280)`
- light: ink `oklch(0.20 0.020 285)`, accent `oklch(0.52 0.135 285)`, bg `oklch(0.96 0.020 285)`

## What Kimi needs to do

### 1. Add favicon link tags to `apps/web/src/app.html`

Inside `<head>`, before `%sveltekit.head%`:

```html
<link rel="icon" type="image/svg+xml" href="/icons/icon.svg" media="(prefers-color-scheme: dark)" />
<link rel="icon" type="image/svg+xml" href="/icons/icon-light.svg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

The `media` attribute pair lets browsers pick the favicon that matches the user's OS theme. Safari ignores `media` on icons but uses the apple-touch-icon for home-screen installs.

### 2. Regenerate the three existing PNG raster icons from the new SVG

The existing files were generated from the old gradient-P icon and are now stale:

- `apps/web/static/icons/icon-192.png` (192×192)
- `apps/web/static/icons/icon-512.png` (512×512)
- `apps/web/static/icons/icon-512-maskable.png` (512×512, from `icon-maskable.svg`)

Three viable tools:

- **rsvg-convert**: `rsvg-convert -w 192 -h 192 static/icons/icon.svg -o static/icons/icon-192.png`
- **sharp** (Node): `sharp('static/icons/icon.svg').resize(192, 192).png().toFile('static/icons/icon-192.png')`
- **Inkscape CLI**: `inkscape --export-type=png --export-width=192 static/icons/icon.svg`

`sharp` is the easiest if the project already has it in `apps/web/node_modules/`. Worth a check before installing anything.

**Font caveat:** Playfair Display must be available to the rasterizer or the letterforms collapse to Times. `sharp` and `rsvg-convert` use the system font cache. Either install Playfair Display system-wide before rasterizing, OR convert the `<text>` elements to outlined SVG paths once before raster (Inkscape: `File → Save As → Plain SVG` after `Path → Object to Path`). Outlining once is the durable answer.

### 3. Generate the iOS apple-touch-icon

Create `apps/web/static/icons/apple-touch-icon.png` at 180×180 from `icon.svg`. iOS Safari uses this for home-screen installs; it ignores the SVG. Same rasterization caveat as step 2.

### 4. Verify Playfair Display loads before the favicon paints

For the SVG favicon to render correctly in the browser tab, Playfair Display must be available when the SVG paints. Currently `apps/web/src/app.html` only preloads Ubuntu + JetBrains Mono. Add Playfair to the Google Fonts URL:

```
&family=Playfair+Display:wght@900&display=swap
```

This adds ~6 KB to the font payload. Worth it for icon fidelity. Alternatively (better): outline the four PENT letters to SVG paths once and commit the outlined version. Then Playfair Display is no longer a runtime dependency for the icon.

### 5. Optional: theme_color is still hex

`manifest.webmanifest` keeps `#12121c` because the webmanifest spec doesn't accept `oklch`. If the project standardizes a hex companion for `oklch(0.16 0.020 280)` somewhere in `themes.ts`, this is the place to keep it in sync.

## Maskable safe-zone explanation

Android Chrome and other PWA installers apply OS-defined icon-shape masks (circle, squircle, square with various radii) over the icon. Content outside the inner-80% safe-zone is clipped.

`icon-maskable.svg` pre-scales the pent-thick content to 80% and centers it. All four letters and both cross arms sit inside a radius-205 circle around (256, 256). Maskable spec confirmed.

Test with [maskable.app](https://maskable.app/) — drop the SVG in, cycle the mask shapes. None should clip the letterforms.

## QA checklist

- [ ] Favicon shows as periwinkle plate with PENT cross in Chrome / Firefox / Safari tabs
- [ ] Light-mode favicon swaps to cream plate with darker letters when OS theme is light
- [ ] iOS Safari → Share → Add to Home Screen produces the apple-touch-icon variant (not a screenshot)
- [ ] Android Chrome → Install app produces a maskable icon that renders correctly in circular, squircle, and square mask shapes
- [ ] At 16 px favicon size, the periwinkle cross is still distinguishable (letters may blur — acceptable, the cross carries identity)
- [ ] The prototype gallery at `/prototypes/logo` still shows the full set (it's a sandbox; the production icon is the frozen file, not the prototype)

## Out of scope for this handoff

- OG image generation (Twitter / Facebook / iMessage social cards) — same icon could be used, but needs a 1200×630 letterboxed variant. Separate task.
- Splash screens for iOS PWA installs — iOS will auto-generate from the apple-touch-icon, but a custom `apple-touch-startup-image` could be designed if needed.
- Animated favicon (e.g., spinning dot when there are unread messages). Not requested; product chrome handles unread badges.
- Wordmark integration in the login / landing surfaces — that's a separate redesign track, not blocking on this icon.

## Files touched

- `apps/web/static/icons/icon.svg` — replaced (new pent-thick design)
- `apps/web/static/icons/icon-light.svg` — created
- `apps/web/static/icons/icon-maskable.svg` — created
- `apps/web/static/manifest.webmanifest` — icons array added (was missing)

Wordmark integrity and prototype gallery untouched.
