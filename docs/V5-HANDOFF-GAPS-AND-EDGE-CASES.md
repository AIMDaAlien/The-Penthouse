# V5 Handoff — Gaps, Edge Cases & Missed Surfaces

**Date:** 2026-05-13
**Analyzed by:** Kimi K2.6
**Scope:** Cross-reference `V5-HANDOFF.md` against actual codebase to find:
1. Surfaces that exist in code but are NOT mentioned in the handoff
2. Edge cases the handoff mentions but doesn't fully design for
3. Hardcoded values that will break with multi-theme
4. Token migration gaps

---

## 1. SURFACES NOT IN THE HANDOFF AT ALL

These files/components exist in the app but receive zero mention in `V5-HANDOFF.md`. They will inherit no design direction unless explicitly added.

### 1.1 `PushPermissionBanner.svelte`
- **What it is:** Fixed top banner asking for push notification permission
- **Current design:** Dark glass panel, bell icon in accent circle, "Stay in the loop" title
- **V5 gap:** Banner vocabulary exists in Phase 4 ("Toast / snackbar", "Modal / dialog") but push permission banner is its own distinct pattern. Needs:
  - Terracotta-soft or accent-soft treatment?
  - JBM eyebrow + Ubuntu body?
  - Glass-soft backdrop spec
- **Risk:** Currently hardcodes `color: #12121C` on the bell icon wrap — will be invisible on light themes

### 1.2 `PushSettings.svelte`
- **What it is:** Settings sub-panel for push notification preferences
- **Current design:** Toggle switches for enable/disable, detailed explanatory text
- **V5 gap:** Handoff says "Inherits settings-pane vocabulary" but PushSettings has its own unique patterns:
  - Status badges ("Enabled — you'll get alerts even when closed")
  - Browser permission state indicators
  - Test notification button
- **Risk:** Not covered by any prototype

### 1.3 `PinBanner.svelte`
- **What it is:** Banner above chat showing pinned message
- **Current design:** Surface-elevated bg, pin icon, sender name in accent, content truncated
- **V5 gap:** Phase 4 mentions "PinBanner" in passing but gives no design spec. Needs:
  - Glass-soft or surface treatment?
  - JBM "PINNED" eyebrow?
  - Unpin button styling

### 1.4 `AudioPlayer.svelte`
- **What it is:** Inline voice message playback widget (waveform + play + time + speed)
- **Current design:** Surface-elevated pill, accent play button, border-colored waveform bars
- **V5 gap:** Handoff says "Pill controls, glass-soft surface, JBM timestamps" — but that's 1 line for a complex interactive widget. Needs:
  - Waveform bar color in light themes (currently `var(--color-border)` which may disappear)
  - Play button hover states
  - Speed button treatment

### 1.5 `AudioRecorder.svelte`
- **What it is:** Voice message recording interface
- **Current design:** Recording state with timer, stop/send controls
- **V5 gap:** Handoff says "Match composer pill, recording state pulses `--p-accent`" — but the component has:
  - Permission denied state
  - Countdown timer display
  - Cancel vs Send dual actions
  - Visual waveform while recording
- **Risk:** Not covered by any prototype or edge-case spec

### 1.6 `EmojiEmoteAutocomplete.svelte`
- **What it is:** `@` mention / `:` emoji autocomplete dropdown
- **Current design:** Glass panel, rows with avatar + name, highlighted selection
- **V5 gap:** Handoff says "Glass-soft dropdown, item rows match `.member` style" — but this component also handles:
  - Empty state (no matches)
  - Loading state while fetching users
  - Different trigger characters (`@` vs `:`)

### 1.7 `UnifiedPicker.svelte`
- **What it is:** Tabbed container for emoji/sticker/gif pickers
- **Current design:** Tab strip at top, content panel below
- **V5 gap:** Handoff says "Tab strip uses JBM uppercase eyebrows, switch animation 280ms ease-out" — but doesn't specify:
  - Active tab indicator style
  - Content panel surface treatment
  - Search input within picker

### 1.8 `static/offline.html`
- **What it is:** Service worker offline fallback page
- **Current design:** Standalone HTML with hardcoded `#12121C` bg, Gelasio logo, gold accent (`#C9A96E`)
- **V5 gap:** Completely missed. This page:
  - Uses **Gelasio** (the font V5 is dropping)
  - Has its own color scheme (gold accent instead of periwinkle)
  - Has no texture
  - Has no light mode
- **Risk:** This is what users see when offline. It's the most incoherent surface post-V5.

### 1.9 `service-worker.ts` push notifications
- **What it is:** OS-level notification styling (title, body, badge, icon)
- **Current design:** Programmatic via `showNotification()` — no CSS
- **V5 gap:** Handoff never mentions push notification chrome. The notification:
  - Uses generic title/body
  - Has no app icon/badge spec for V5
  - No theme-aware iconography
- **Risk:** OS notifications are a brand touchpoint. They should feel consistent.

### 1.10 `app.html` theme-color meta
- **What it is:** `<meta name="theme-color" content="#12121C">` — controls browser chrome color
- **V5 gap:** Hardcoded to dark. Light themes will show dark browser chrome.
- **Fix:** Make dynamic via JS, or use `media="(prefers-color-scheme: dark)"` alternative.

---

## 2. EDGE CASES THE HANDOFF MENTIONS BUT DOESN'T FULLY DESIGN

### 2.1 Context menus — TWO different implementations
The handoff says (Phase 4):
> "Context menu (right-click on message): Glass-soft floating panel, items as pill rows with hover `--p-accent-soft`, JBM eyebrow grouping."

But the app has **two** context menus:

| | `MessageBubble.svelte` `.menu` | `ChatListItem.svelte` `.context-menu` |
|---|---|---|
| Trigger | Hover-reveal actions button | Right-click on row |
| Layout | Vertical stack, max 120px | Vertical stack, min 160px |
| Sections | No sections | Has `.menu-section` headers |
| Danger | `.danger` class | `.menu-item-danger` class |
| Shadow | `var(--shadow-card)` | Hardcoded `0 4px 12px rgba(0,0,0,0.15)` |

**Gap:** Handoff describes ONE context menu style. The app needs TWO different ones (message actions vs folder management). The folder menu needs section headers; the message menu doesn't. Neither matches the handoff spec exactly.

### 2.2 Auth page — more complex than described
The handoff says:
> "Centered card with eyebrow + display + form fields + terracotta-soft 'Sign in' secondary action."

But the actual auth page (`routes/auth/+page.svelte`) has:
- **Logo block** with display font (Gelasio), multi-line "The / PENT / HOUSE" — V5 is dropping display serifs. What replaces this?
- **Mode tabs** (Sign in / Create account) with `.tab.active` that hardcodes `color: #12121C` — breaks light themes
- **CAPTCHA widget** (Altcha) with its own styling that may not match V5
- **Password requirements** checklist with success states (`--color-success`)
- **Alpha notice checkbox** with inline bold styling
- **Error message** banner with `--color-error` background
- **Bottom-border inputs** (`border-bottom: 1px solid var(--color-border)`) — V5 spec says inputs should have `--r-sm` radius and `--p-accent-edge` focus border. These are fundamentally different input styles.

**Gap:** The auth page has a COMPLETELY different input style (bottom-border, no radius) vs the V5 spec (radius-sm, full border). Need a decision: redesign auth inputs to match V5, or keep auth as its own aesthetic?

### 2.3 Home page (`+page.svelte`) editorial empty state
The handoff says:
> "Empty chat list: Eyebrow + display 'Nothing yet' + ghost row showing what a chat row will look like once populated."

But the actual home page has:
- **Desktop:** A full editorial empty state with Rilke quote, `font-family: var(--font-display)` (Gelasio), gradient text (`-webkit-background-clip: text`)
- **Mobile:** "The Penthouse" header with connection status dot

**Gap:** The desktop empty state uses gradient text (banned by impeccable), display serif (banned by V5), and is more elaborate than the handoff's simple "Nothing yet" spec. Need a redesign.

### 2.4 Voice / PTT system
The handoff says:
> "Voice / video call surface: Out of V5 scope but will inherit: large centered pfp ring pulse, JBM call duration, glass-soft action pill at bottom."

But the app has:
- `voiceStore` with PTT mode
- `AudioPlayer` for playback
- `AudioRecorder` for recording
- Spacebar PTT keyboard handler in chat page
- Voice channel joining UI (in chat page, `voiceStore.isInVoice`)

**Gap:** The voice UI is embedded IN the chat page, not a separate call surface. It needs:
- Push-to-talk overlay indicator
- Voice channel participant list
- Mute/deafen controls
- These are not designed at all.

### 2.5 Channel creation UI
In `chat/[id]/+page.svelte`:
```svelte
let creatingChannel = $state(false);
let newChannelName = $state('');
```

**Gap:** Channel creation is a small inline form in the chat page. Not mentioned in handoff. Needs:
- Input field styling
- Create/cancel buttons
- Error state for duplicate names

### 2.6 Chat search UI
In `chat/[id]/+page.svelte`:
```svelte
let showSearch = $state(false);
let searchQuery = $state('');
let searchResults = $state<Message[]>([]);
let searching = $state(false);
```

**Gap:** Search is a toggled overlay in the chat page. Not mentioned in handoff. Needs:
- Search input styling (JBM per spec?)
- Results list styling
- Empty state
- Highlighting matching text

### 2.7 Reply bar
`ReplyBar.svelte` exists but handoff only says:
> "Glass-soft pill above composer, JBM meta 'REPLYING TO @name'"

Actual component has:
- Truncated message preview
- Cancel button
- Different surface treatment

### 2.8 Wallpaper system
`wallpapersStore` exists. Handoff mentions wallpaper in settings prototypes but doesn't specify:
- How wallpaper applies to the app shell
- Opacity slider interaction
- Preview thumbnail grid
- Default wallpaper options

---

## 3. HARDENED VALUES THAT WILL BREAK WITH THEMES

These are hardcoded colors/values that won't adapt to the 11 V5 themes.

| File | Line | Hardcoded Value | Problem |
|------|------|-----------------|---------|
| `auth/+page.svelte` | 283 | `color: #12121C` on active tab | Text invisible on light themes (dark text on dark accent) |
| `auth/+page.svelte` | 384 | `color: #12121C` on submit button | Same — needs `var(--p-bg)` |
| `PushPermissionBanner.svelte` | 121 | `color: #12121C` on bell icon | Icon invisible on light themes |
| `PushPermissionBanner.svelte` | 172 | `color: #12121C` on allow button | Same |
| `MessageBubble.svelte` | 171 | `color: var(--color-bg)` on own bubble | OK if mapped, but `--color-bg` is being replaced |
| `ChatListItem.svelte` | 173 | `color: var(--color-bg)` on badge | Same |
| `offline.html` | 13 | `--accent: #C9A96E` | Gold accent, not periwinkle. Entire page off-brand |
| `offline.html` | 9 | `--bg: #12121C` | Hardcoded dark, no light mode |
| `app.html` | 9 | `theme-color="#12121C"` | Browser chrome stays dark in light themes |
| `+layout.svelte` | 276 | `text-shadow: 0 1px 2px rgba(0,0,0,0.5)` on buttons | May look bad on light themes |
| `ChatListItem.svelte` | 187 | `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` | Shadow doesn't adapt to theme |

---

## 4. TOKEN MAPPING GAPS (v3 → V5)

The handoff says "Map the existing names onto these" but doesn't specify mappings for all v3 tokens. Here are the ones used in code but not mapped:

| v3 Token | Used In | V5 Equivalent? | Notes |
|----------|---------|----------------|-------|
| `--color-surface-elevated` | PinBanner, ChatListItem, global | `--p-surface-2`? | Close but not exact |
| `--color-surface-glass` | Global `.glass` | `--p-surface` with alpha? | Different semantics |
| `--color-surface-raised` | Global | **NONE** | Not used in components but defined |
| `--color-border-solid` | Global | `--p-line-2`? | Similar opacity |
| `--color-accent-dim` | Global button bg | `--p-accent-soft`? | Different opacity (0.15 vs 0.16) |
| `--color-accent-hover` | Global | **NONE** | Used for hover states |
| `--color-accent-secondary` | Global | `--p-secondary`? | Close |
| `--color-accent-light` | Global | **NONE** | Not directly mapped |
| `--color-accent-periwinkle` | Global | `--p-accent`? | Same hue, different value |
| `--color-danger` | Global, auth error | `--p-warning`? | Different semantic meaning |
| `--color-error` | Global, errors | `--p-warning`? | Same as danger? |
| `--color-success` | Global, socket status, password reqs | **NONE** | Handoff says "drop" but app uses it heavily |
| `--color-text-primary` | Global | `--p-text`? | Same |
| `--font-body` | Global | `--font-sans`? | Same |

**Critical:** `--color-success` is used for:
- Socket connection status dot (`+page.svelte`)
- Password requirement met indicator (`auth/+page.svelte`)
- The handoff says "Drop the bright `--color-success: #34d399`" but provides NO replacement.

**Recommendation:** Add `--p-success: oklch(0.74 0.140 145)` to V5 tokens, or map `--color-success` to `--p-away` (which is similar OKLCH).

---

## 5. COMPONENTS MENTIONED IN HANDOFF BUT NOT IN APP

These are in the handoff's Phase 3 table but don't exist in the codebase yet. They'll need to be built from scratch:

| Component | Handoff Priority | Status |
|-----------|-----------------|--------|
| `ReadReceipts.svelte` | P1 | ✅ Exists |
| `ReactionPill.svelte` | P1 | ✅ Exists |
| `TypingIndicator.svelte` | P1 | ✅ Exists |
| `MarkdownText.svelte` | P2 | ✅ Exists |
| `EmotePicker.svelte` | P2 | ✅ Exists |
| `StickerPicker.svelte` | P2 | ✅ Exists |
| `GifPicker.svelte` | P2 | ✅ Exists |
| `EmojiPicker.svelte` | P2 | ✅ Exists |

All listed components exist. Good.

---

## 6. THEME SYSTEM GAPS

### 6.1 Theme type too narrow
Current `theme.ts`:
```typescript
export type Theme = 'dark' | 'light' | 'system';
```

V5 needs 11 named themes. The handoff says:
> "Extend `Theme` type beyond `'dark' | 'light' | 'system'` to include the 11 named themes"

But doesn't specify:
- How `system` resolves when the OS is dark but user picks T-L2 (light)
- Whether `dark`/`light` are aliases for T-D1/T-L2 or remain separate
- Storage format (currently `localStorage.getItem('penthouse-theme')`)

### 6.2 `data-theme` attribute collision
Current code sets `data-theme="dark"` or `data-theme="light"`. V5 wants `data-theme="T-D1"`, `data-theme="T-L2"`, etc.

But the CSS in `+layout.svelte` uses `:global([data-theme="light"])` — this will break if the attribute becomes `T-L2`.

**Migration path needed:**
1. Keep `data-theme="dark"` / `"light"` for the base mode
2. Add a SECOND attribute `data-theme-variant="T-D1"` for the named theme
3. Or: keep `data-theme` for base mode, apply variant via class

### 6.3 `theme-color` meta is static
As noted above, `app.html` has hardcoded `theme-color="#12121C"`. For light themes, this should be the light bg color.

---

## 7. RECOMMENDATIONS

### Immediate (before any V5 work starts)

1. **Decide on `--color-success` replacement.** The app cannot function without it. Add to V5 tokens or accept it as an alias.

2. **Fix hardcoded `#12121C` values.** These will break light themes immediately. Replace with `var(--p-bg)` or similar.

3. **Decide auth page input style.** The bottom-border input is fundamentally different from V5's radius-sm input. Either:
   - Redesign auth to match V5 inputs (more work, more coherent)
   - Keep auth as a "special case" with its own aesthetic (less work, less coherent)

4. **Design the `offline.html` page.** It's the most incoherent surface post-V5. At minimum:
   - Remove Gelasio
   - Use periwinkle accent instead of gold
   - Add light mode support

### During Phase 1 (foundation)

5. **Add missing tokens to V5 palette:**
   - `--p-success` (or keep `--color-success` as alias)
   - `--p-info` (if needed)
   - `--p-surface-elevated` → map to `--p-surface-2`
   - `--p-surface-glass` → map to `.glass-panel` spec

6. **Fix theme attribute strategy.** Don't just overwrite `data-theme` with variant names — the base dark/light mode is still needed for OS sync.

### During Phase 3 (component migration)

7. **Add these components to the migration list:**
   - `PushPermissionBanner.svelte` (P1 — user-facing, high visibility)
   - `PushSettings.svelte` (P2 — lower visibility)
   - `PinBanner.svelte` (P1 — visible in every chat with pins)
   - `AudioPlayer.svelte` (P2 — visible when voice messages exist)
   - `AudioRecorder.svelte` (P2 — visible when recording)
   - `offline.html` (P1 — offline users see this)

8. **Design voice/PTT UI.** Even a minimal spec would help:
   - PTT active indicator (overlay pill?)
   - Voice channel participant avatars
   - Mute/deafen toggle styling

### During Phase 4 (edge cases)

9. **Add these edge cases to the handoff:**
   - Channel creation inline form
   - Chat search overlay
   - CAPTCHA widget styling
   - Alpha notice checkbox styling
   - Password strength checklist

10. **Unify context menu styles.** The app has 2.5 menu styles (MessageBubble, ChatListItem, and the handoff's spec). Pick one vocabulary and apply everywhere.

---

## 8. SUMMARY TABLE

| Category | Count | Risk Level |
|----------|-------|------------|
| Surfaces not in handoff | 10 | Medium-High |
| Hardcoded theme-breaking values | 11 | High |
| Unmapped v3 tokens | 12 | Medium |
| Edge cases mentioned but under-designed | 8 | Medium |
| Edge cases in app not mentioned | 5 | Medium |
| Theme system architectural gaps | 3 | High |

**Overall assessment:** The V5 handoff is comprehensive for the main panes and prototypes, but has significant gaps in:
- Peripheral components (banners, audio, push)
- Token migration completeness
- Theme system architecture
- Edge case UI (search, channel creation, voice)
- Static assets (offline.html, app.html meta)

These gaps are manageable but will cause incoherence if not addressed before or during implementation.
