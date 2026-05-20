# Claude Handoff — V5 Redesign: Surfaces & Edge Cases

**Date:** 2026-05-13
**From:** Kimi K2.6 (technical audit + quick fixes)
**To:** Claude Opus (design decisions + redesign spec)
**Context:** V5-HANDOFF.md covers chat/settings/people panes well. This doc covers everything else.

---

## What Kimi Already Fixed (don't redo)

| Fix | File | What changed |
|-----|------|-------------|
| Hardcoded `#12121C` text colors | `auth/+page.svelte`, `PushPermissionBanner.svelte`, `BottomNav.svelte`, `AudioRecorder.svelte` | Changed to `var(--color-bg)` so text adapts to theme |
| Hardcoded gold shadow | `BottomNav.svelte` | Changed to `color-mix(in srgb, var(--color-accent) X%, transparent)` |
| `offline.html` | `static/offline.html` | Removed Gelasio, added light mode via `prefers-color-scheme`, uses periwinkle accent |
| `app.html` theme-color | `app.html` | Added `media="(prefers-color-scheme: dark/light)"` dual meta tags |
| Own-bubble text in light mode | `MessageBubble.svelte` | Added `@media (prefers-color-scheme: light)` override for own-bubble text color |

---

## Part 1: Surfaces That Need Design (Not In V5 Handoff)

These exist in the app but V5-HANDOFF.md says nothing about them. They need design specs from you.

### 1.1 `PushPermissionBanner.svelte` — P1

**What:** Fixed top banner asking for push notification permission. Appears on first visit for every user.

**Current design:**
- Dark glass panel (`rgba(26, 26, 40, 0.92)` + `blur(16px)`)
- Bell icon in 36px accent circle
- Title + description + dismiss/allow buttons
- Slides down with `cubic-bezier(0.34, 1.56, 0.64, 1)` animation

**Needs from you:**
- V5 treatment: glass-soft? surface-elevated? texture overlay?
- JBM eyebrow + Ubuntu body hierarchy?
- Button vocabulary: primary (allow) + ghost (dismiss)?
- Error state styling (when permission denied)
- **Light theme:** currently uses dark glass on light bg — will look wrong

**Reference file:** `apps/web/src/lib/components/PushPermissionBanner.svelte`

---

### 1.2 `PushSettings.svelte` — P2

**What:** Settings sub-panel for push notification preferences. Lower visibility but part of settings coherence.

**Current design:**
- Toggle switches for enable/disable
- Status badges ("Enabled — you'll get alerts even when closed")
- Browser permission state indicators
- Test notification button
- Error states for unsupported/denied

**Needs from you:**
- Toggle styling (already specced in V5: 38×22 pill, 16×16 thumb)
- Status badge treatment: JBM meta pill?
- Error/unsupported state: terracotta-soft?
- Test button: primary or ghost?

**Reference file:** `apps/web/src/lib/components/PushSettings.svelte`

---

### 1.3 `PinBanner.svelte` — P1

**What:** Banner above chat showing pinned message. Visible in every chat that has pins.

**Current design:**
- `var(--color-surface-elevated)` background
- Pin icon (16px)
- Sender name in `var(--color-accent)`
- Truncated message content
- "Unpin" button (if user pinned it)

**Needs from you:**
- Banner treatment: glass-soft or surface?
- Should it have a JBM "PINNED" eyebrow?
- Unpin button: ghost pill or text link?
- Max height / truncation behavior?
- **Light theme:** current surface-elevated may not have enough contrast

**Reference file:** `apps/web/src/lib/components/PinBanner.svelte`

---

### 1.4 `AudioPlayer.svelte` — P2

**What:** Inline voice message playback widget.

**Current design:**
- Surface-elevated pill (`border-radius: var(--radius-lg)`)
- Accent circle play/pause button (36px)
- Waveform: 32 bars, `var(--color-border)` unplayed, `var(--color-accent)` played
- JBM-style timestamp `0:00 / 0:00`
- Speed toggle button (1× / 1.5× / 2×)

**Needs from you:**
- Glass-soft or surface treatment?
- Waveform bar colors for light themes (border color may be too faint)
- Play button: accent fill with bg-colored icon? (already fixed to use `var(--color-bg)`)
- Speed button: JBM mono pill?
- Hover states for waveform seek

**Reference file:** `apps/web/src/lib/components/AudioPlayer.svelte`

---

### 1.5 `AudioRecorder.svelte` — P2

**What:** Voice message recording interface.

**Current design:**
- Recording state with timer (JBM)
- Stop/send controls
- Cancel action
- Permission denied state

**Needs from you:**
- Recording active indicator: pulsing accent ring?
- Timer display: JBM large?
- Send/cancel button layout: horizontal or vertical?
- Permission denied error: terracotta-soft banner?
- Visual waveform while recording (not yet implemented but planned)

**Reference file:** `apps/web/src/lib/components/AudioRecorder.svelte`

---

### 1.6 `EmojiEmoteAutocomplete.svelte` — P2

**What:** `@` mention / `:` emoji autocomplete dropdown.

**Current design:**
- Glass panel dropdown
- Rows with avatar + name (for mentions) or emoji + name (for emoji)
- Highlighted selection state
- Positioned above/below cursor

**Needs from you:**
- Dropdown surface: glass-soft or solid surface?
- Selected row: `--p-accent-soft` background?
- Avatar size in rows: 24px? 32px?
- Empty state (no matches): JBM "NO MATCHES"?
- Loading state while fetching users

**Reference file:** `apps/web/src/lib/components/EmojiEmoteAutocomplete.svelte`

---

### 1.7 `UnifiedPicker.svelte` — P2

**What:** Tabbed container for emoji/sticker/gif pickers.

**Current design:**
- Tab strip at top (emoji / stickers / GIFs)
- Content panel below
- Each tab has an icon
- Close button (×)

**Needs from you:**
- Active tab indicator: underline? background pill? accent color?
- Inactive tab: muted color?
- Tab strip surface: same as panel or separated?
- Content panel: glass-soft popover?
- Animation: 280ms ease-out tab switch?
- Search input inside picker: JBM placeholder?

**Reference file:** `apps/web/src/lib/components/UnifiedPicker.svelte`

---

### 1.8 `static/offline.html` — P1

**What:** Service worker offline fallback page. Users see this when they have no connection.

**What Kimi did:**
- Removed Gelasio
- Added `prefers-color-scheme` light/dark support
- Changed accent to periwinkle

**Still needs from you:**
- V5 texture overlay? (it's a standalone HTML file, can't easily import CSS)
- Typography: Ubuntu + JBM hierarchy?
- Should it match the auth page aesthetic or be simpler?
- Button styling: match V5 primary button?
- **Note:** This is a static HTML file with no JS/CSS framework. Keep design implementable in plain CSS.

**Reference file:** `apps/web/static/offline.html`

---

### 1.9 `service-worker.ts` push notifications — P3

**What:** OS-level notification styling (title, body, badge, icon).

**Current design:**
- Title: from `buildNotificationTitle()`
- Body: from `buildNotificationBody()`
- Badge: unread count
- Tag: per-chat grouping
- No icon specified (uses default)

**Needs from you:**
- App icon for notifications (need a 192×192 PNG or SVG)
- Badge icon for notifications (monochrome 72×72 or 96×96)
- Notification title format: "The Penthouse" or sender name?
- Should notifications be silent or have sound?
- Action buttons? (reply, dismiss)

**Reference file:** `apps/web/src/service-worker.ts`

---

## Part 2: Edge Cases In The App Not Covered By V5 Handoff

These are real features in the app that need design but aren't mentioned anywhere.

### 2.1 Voice/PTT System — P1

**What exists:**
- `voiceStore` with PTT (push-to-talk) mode
- Spacebar PTT keyboard handler in chat page
- `AudioPlayer` / `AudioRecorder` for voice messages
- Voice channel joining (mesh WebRTC, soon Mediasoup SFU)

**Current UI in chat page:**
```svelte
{#if voiceStore.isInVoice}
  <!-- Shows voice channel participants -->
{/if}
```

**What the handoff says:**
> "Voice / video call surface: Out of V5 scope but will inherit: large centered pfp ring pulse, JBM call duration, glass-soft action pill at bottom."

**The problem:** The voice UI is NOT a separate call surface. It's embedded IN the chat page:
- PTT active indicator (overlay pill? inline badge?)
- Voice channel participant list (where? how many?)
- Mute/deafen toggle buttons
- Leave channel button

**Needs from you:**
- PTT active state indicator design (overlay? inline?)
- Voice participant list: horizontal avatars? vertical list?
- Mute/deafen buttons: toggle pills? icon buttons?
- Connection quality indicator?
- **This is a real feature users will see. It needs a design.**

**Reference:** `apps/web/src/lib/stores/voice.svelte.ts`, `apps/web/src/routes/chat/[id]/+page.svelte` (search for `voiceStore`)

---

### 2.2 Channel Creation Inline Form — P2

**What exists:**
```svelte
let creatingChannel = $state(false);
let newChannelName = $state('');
```

In the chat page, users can create a new channel within a group chat. It's an inline form that appears when a button is clicked.

**Needs from you:**
- Input field styling (V5 says radius-sm, but inline in chat?)
- Create/cancel button layout
- Error state for duplicate name
- Success feedback

**Reference:** `apps/web/src/routes/chat/[id]/+page.svelte` (search for `creatingChannel`)

---

### 2.3 Chat Search Overlay — P2

**What exists:**
```svelte
let showSearch = $state(false);
let searchQuery = $state('');
let searchResults = $state<Message[]>([]);
let searching = $state(false);
```

A search UI toggled within the chat page. Shows search input + results list.

**Needs from you:**
- Search input styling: JBM placeholder? accent focus border?
- Results list: message bubbles reduced? plain text rows?
- Highlight matching text: accent background?
- Empty state: JBM "NO MATCHES"?
- Loading state

**Reference:** `apps/web/src/routes/chat/[id]/+page.svelte` (search for `showSearch`)

---

### 2.4 Context Menus — Two Different Implementations

**What exists:**

| Menu | File | Trigger | Features |
|------|------|---------|----------|
| Message actions | `MessageBubble.svelte` | Hover-reveal button | Pin, Edit, Delete |
| Folder management | `ChatListItem.svelte` | Right-click on row | Move to folder, Remove from folder |

**V5 handoff says:**
> "Context menu (right-click on message): Glass-soft floating panel, items as pill rows with hover `--p-accent-soft`, JBM eyebrow grouping."

**The problem:** The handoff describes ONE menu style. The app has TWO different ones:
- Message menu: no sections, compact (max 120px), no eyebrow headers
- Folder menu: has `.menu-section` headers ("Move to folder"), divider, danger action

**Needs from you:**
- Are these two menus unified into one style, or do they stay different?
- If unified: do message actions get eyebrow headers too? (e.g. "MESSAGE ACTIONS")
- If different: what's the spec for each?
- Danger action color: terracotta text? terracotta-soft background?
- Menu width: fixed or content-based?
- Shadow: V5 shadow tokens or hardcoded?

**Reference files:**
- `apps/web/src/lib/components/MessageBubble.svelte` (lines 316–347)
- `apps/web/src/lib/components/ChatListItem.svelte` (lines 183–226)

---

### 2.5 Reply Bar — P2

**What exists:** `ReplyBar.svelte` — shows above composer when replying to a message.

**Current design:**
- Small bar with truncated message preview
- Sender name
- Cancel (×) button
- Minimal styling

**V5 handoff says:**
> "Glass-soft pill above composer, JBM meta 'REPLYING TO @name'"

**Needs from you:**
- Full spec: padding, border, background?
- Message preview truncation: max chars? max height?
- Cancel button: icon only or text?
- Animation: slide in from composer?

**Reference file:** `apps/web/src/lib/components/ReplyBar.svelte`

---

### 2.6 Auth Page — Input Style Conflict

**What exists:** `auth/+page.svelte` — login/register page.

**V5 handoff says:**
> "Centered card with eyebrow + display + form fields + terracotta-soft 'Sign in' secondary action."

**The conflict:**
- V5 spec says inputs should be: `border-radius: --r-sm`, full border, focus border `--p-accent-edge`
- Auth page inputs are: `border-radius: 0`, `border-bottom: 1px solid var(--color-border)`, no side borders
- These are fundamentally different input aesthetics

**Auth page also has:**
- Logo block: "The / PENT / HOUSE" with display font (Gelasio, being dropped)
- Mode tabs: "Sign in" / "Create account" — active tab has `color: var(--color-bg)` on accent bg (Kimi fixed the hardcoded value)
- CAPTCHA widget (Altcha) — external component with its own styling
- Password requirements checklist with success indicators
- Alpha notice checkbox with inline bold
- Error message banner

**Needs from you:**
- **Decision:** Redesign auth inputs to match V5 spec, or keep auth as a special case?
- Logo block: what replaces Gelasio display font? Ubuntu 700 with tight tracking?
- CAPTCHA widget: can it be styled to match V5? (it has CSS custom properties)
- Password requirements: how does `--color-success` map to V5? (Kimi added token alias)
- Error banner: terracotta-soft surface?

**Reference file:** `apps/web/src/routes/auth/+page.svelte`

---

### 2.7 Home Page (`+page.svelte`) — Editorial Empty State

**What exists:** Desktop shows an editorial empty state when no chat is selected.

**Current design:**
- Rilke quote: "All distances are the same / to the person who longs."
- `font-family: var(--font-display)` (Gelasio, being dropped)
- Gradient text effect: `-webkit-background-clip: text`
- Cite: JBM monospace
- Label: "DIRECTORY IS EMPTY"

**V5 handoff says:**
> "Empty chat list: Eyebrow + display 'Nothing yet' + ghost row showing what a chat row will look like once populated."

**The conflict:** The actual empty state is FAR more elaborate than the handoff spec. It uses:
- Gradient text (banned by impeccable skill)
- Display serif (banned by V5)
- Poetry quote (not mentioned in V5)

**Needs from you:**
- Does the editorial empty state stay or get replaced with the simpler spec?
- If it stays: how does it work without Gelasio? Ubuntu italic?
- If replaced: what does the ghost row look like?
- Mobile empty state: currently just "Loading conversations…" / error — needs design?

**Reference file:** `apps/web/src/routes/+page.svelte`

---

### 2.8 Wallpaper System

**What exists:** `wallpapersStore` — users can set a custom wallpaper with opacity control.

**Current state:** Store exists but UI may not be fully wired.

**V5 handoff mentions:** Wallpaper in settings prototypes but doesn't specify:
- How wallpaper applies to app shell vs pane
- Opacity slider interaction
- Preview thumbnail grid
- Default wallpaper options
- Reset to default action

**Needs from you:**
- Wallpaper settings UI design
- How does wallpaper interact with the A1.3 texture overlay? (texture on top of wallpaper?)
- Opacity slider: V5 toggle component or native range input?

**Reference:** `apps/web/src/lib/stores/wallpapers.svelte.ts`

---

## Part 3: Design Decisions Needed

These are conflicts between the current app and V5 spec where you need to make a call.

### 3.1 Theme attribute strategy

**Current:** `data-theme="dark"` or `data-theme="light"`
**V5 wants:** `data-theme="T-D1"`, `data-theme="T-L2"`, etc.

**Conflict:** The CSS uses `:global([data-theme="light"])` for light mode overrides. If we change to variant names, this breaks.

**Options:**
1. Keep `data-theme` for base mode, add `data-theme-variant` for named themes
2. Change `data-theme` to variant names, add `data-color-scheme` for base mode
3. Generate all 11 theme CSS blocks and use only `data-theme`

**Needs your decision:** Which approach?

---

### 3.2 `--color-success` and `--color-error`

**Current:** Used heavily (`#34d399` success, `#D65A4A` error)
**V5 handoff says:** "Drop the bright `--color-success: #34d399` and `--color-error: #D65A4A`"

**Conflict:** The app cannot function without these. Used for:
- Socket connection status dot
- Password requirements checklist
- Form validation errors
- Push permission errors
- Various store error states

**Options:**
1. Add V5 tokens: `--p-success: oklch(0.74 0.140 145)` and `--p-error: oklch(0.62 0.070 35)` (terracotta)
2. Keep old tokens as aliases during migration
3. Map success to `--p-away` (similar OKLCH) and error to `--p-warning`

**Needs your decision:** What are the canonical V5 success/error tokens?

---

### 3.3 Input style unification

**V5 spec:** Radius-sm, full border, focus accent-edge
**Auth page:** No radius, bottom-border only, focus accent
**Chat composer:** Pill capsule, 1px border
**Settings inputs:** Radius-sm (matches V5)

**Conflict:** Three different input styles in one app.

**Options:**
1. Unify ALL inputs to V5 spec (auth page gets redesigned)
2. Keep auth inputs distinct (they're "before you enter the app")
3. Unify auth + settings, keep composer distinct (composer is special)

**Needs your decision:** How many input styles should V5 have?

---

### 3.4 Context menu vocabulary

**Current:** Two different menu styles (message vs folder)
**V5 handoff:** One generic spec

**Options:**
1. Unify to one style: glass-soft, JBM eyebrow sections, pill rows
2. Keep message menu compact (no sections), folder menu with sections
3. Two completely different specs

**Needs your decision:** One menu style or two?

---

## Part 4: Quick Wins (Kimi can do without design)

These don't need design decisions — just token swaps.

| Task | File | Action |
|------|------|--------|
| Token swap in +layout.svelte | `+layout.svelte` | Replace `:root` block with V5 OKLCH tokens |
| Token swap in +layout.svelte | `+layout.svelte` | Replace `[data-theme="light"]` block with V5 light tokens |
| Drop Gelasio | `+layout.svelte`, `app.html` | Remove `--font-display`, remove font link |
| Remove radial-dot body bg | `+layout.svelte` | Replace with A1.3 texture overlay |
| Remove `[data-settings]` global rule | `+layout.svelte` | Apply JBM precisely where needed |
| Add texture overlay class | `+layout.svelte` | Add `.tex-overlay` global class |

---

## Part 5: File Reference Map

### Components needing design spec:

| Component | Priority | What's needed |
|-----------|----------|--------------|
| `PushPermissionBanner.svelte` | P1 | Full redesign spec |
| `PinBanner.svelte` | P1 | Full redesign spec |
| `AudioPlayer.svelte` | P2 | Full redesign spec |
| `AudioRecorder.svelte` | P2 | Full redesign spec |
| `PushSettings.svelte` | P2 | Full redesign spec |
| `EmojiEmoteAutocomplete.svelte` | P2 | Full redesign spec |
| `UnifiedPicker.svelte` | P2 | Full redesign spec |
| `ReplyBar.svelte` | P2 | Full redesign spec |

### Routes needing design spec:

| Route | Priority | What's needed |
|-------|----------|--------------|
| `auth/+page.svelte` | P1 | Input style decision, logo redesign, CAPTCHA styling |
| `+page.svelte` (home) | P1 | Editorial empty state: keep or replace? |
| `chat/[id]/+page.svelte` | P1 | Voice/PTT UI, channel creation, search overlay |
| `static/offline.html` | P1 | V5-compatible static page design |

### Design decisions needed:

| Decision | Impact |
|----------|--------|
| Theme attribute strategy | Architecture — affects all theme switching |
| `--color-success` / `--color-error` mapping | All validation, status, error states |
| Input style unification | Auth page, settings, composer |
| Context menu vocabulary | MessageBubble, ChatListItem |
| Voice/PTT UI design | chat page — real user-facing feature |

---

## Summary

**V5-HANDOFF.md is excellent for the three main panes (chat, settings, people) and the 30 prototypes.**

**What's missing:**
- 8 components that exist in the app but aren't mentioned
- 5 edge-case UIs that exist but have no design
- 4 architectural decisions that block implementation
- Static assets (offline.html, push notifications)

**Recommended order:**
1. Make the 4 architectural decisions (Part 3) — these unblock everything
2. Design the P1 surfaces (PushPermissionBanner, PinBanner, auth, home, offline)
3. Design voice/PTT UI — this is a real feature, not theoretical
4. Design P2 surfaces (audio, autocomplete, picker, reply, search, channel creation)
5. Hand back to Kimi for implementation

---

*End of handoff. Questions → ask Aim or Kimi.*
