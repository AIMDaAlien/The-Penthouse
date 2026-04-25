# Desktop Nav & Monolith Routing — Design Spec
**Date:** 2026-04-23
**Status:** Approved

---

## Goal

Expand the SvelteKit `(app)` route group so that `/users`, `/users/[id]`, and `/settings` render inside the desktop monolith's right pane — while adding the Typographic Waterfall desktop navigation to the left pane. Mobile behavior is unchanged.

---

## Architecture

### Route group expansion

Move three route trees into `routes/(app)/` so they inherit `(app)/+layout.svelte`:

| Current path | New path | URL unchanged |
|---|---|---|
| `routes/users/+page.svelte` | `routes/(app)/users/+page.svelte` | `/users` |
| `routes/users/[id]/+page.svelte` | `routes/(app)/users/[id]/+page.svelte` | `/users/[id]` |
| `routes/settings/+page.svelte` | `routes/(app)/settings/+page.svelte` | `/settings` |

Old files at `routes/users/` and `routes/settings/` are deleted after migration.

### Monolith layout (desktop)

On desktop (`hover: hover and pointer: fine`):
- **Left pane (340px, fixed):** ChatListPane + DesktopNav at bottom-left
- **Right pane (flex: 1):** Slot — renders Messages home, chat threads, users directory, user profiles, settings
- Both panes always visible; no toggling

### Mobile pane logic

The `isThread` boolean in `(app)/+layout.svelte` is replaced by `showRightPane`:

```js
const showRightPane = $derived(
  page.url.pathname.startsWith('/chat/') ||
  page.url.pathname === '/users' ||
  page.url.pathname.startsWith('/users/') ||
  page.url.pathname === '/settings'
);
```

- At `/`: left pane shows (chat list), right pane hidden
- At any other monolith route: right pane shows (full-width), left pane hidden
- BottomNav still renders via root layout — mobile tab switching unchanged

---

## Components

### `DesktopNav.svelte`

**Location:** `apps/web/src/lib/components/DesktopNav.svelte`

**Visual spec (Typographic Waterfall):**
- Font: Gelasio, italic, 2.8rem, line-height 0.8
- Layout: `position: absolute; bottom: 32px; left: 32px; flex-direction: column; align-items: flex-start`
- Three navigation items: **Messages** (`/`), **People** (`/users`), **Settings** (`/settings`)
- Inactive state: `color: var(--color-text-secondary)`, `opacity: 0.2`
- Hover state: `opacity: 0.4`
- Active state: `color: var(--color-text-primary)`, `opacity: 1`, `transform: translateX(16px)`
- Transition: `all 0.4s cubic-bezier(0.22, 1, 0.36, 1)`

**Behavior:**
- Reads `$page.url.pathname` from `$app/state` for active detection
- Uses SvelteKit `goto()` for navigation
- Hidden on mobile via `display: none` inside `@media (hover: hover) and (pointer: fine)` — inverted: visible only on desktop

**Active detection rules:**
- Messages active: `pathname === '/'`
- People active: `pathname === '/users' || pathname.startsWith('/users/')`
- Settings active: `pathname === '/settings'`

---

## File changes

### `(app)/+layout.svelte`
1. Replace `isThread` with `showRightPane` (extended logic above)
2. Update `class:show-thread={isThread}` → `class:show-right={showRightPane}` (rename CSS class too)
3. Update `aria-hidden` on pane-left to use `showRightPane`
4. Import and render `<DesktopNav />` inside `pane-left`, after `<ChatListPane />`
5. Add `position: relative` to `pane-left` so `DesktopNav` absolute positioning is contained

### `+layout.svelte` (root)
Extend `isMonolithRoute`:
```js
const isMonolithRoute = $derived(
  page.url.pathname === '/' ||
  page.url.pathname.startsWith('/chat/') ||
  page.url.pathname === '/users' ||
  page.url.pathname.startsWith('/users/') ||
  page.url.pathname === '/settings'
);
```

---

## Task breakdown (3-file rule)

| Task | Files touched |
|---|---|
| **Task 1** | `DesktopNav.svelte` (create) + `(app)/+layout.svelte` (update) |
| **Task 2** | `(app)/users/+page.svelte` (create) + `(app)/users/[id]/+page.svelte` (create) + delete `routes/users/` originals |
| **Task 3** | `(app)/settings/+page.svelte` (create) + delete `routes/settings/` original + `+layout.svelte` isMonolithRoute update |

---

## Constraints

- No Tailwind — CSS custom properties only (project standard)
- No changes to `services/api/`, `infra/`, or `packages/contracts/`
- Gelasio already loaded via `--font-display` CSS variable — no new font imports needed
- BottomNav visibility logic in root layout is unchanged
- `routes/users/[id]/+page.svelte` content is moved verbatim — no logic changes

---

## Definition of done

1. Desktop: left pane persists across all 5 routes (`/`, `/chat/[id]`, `/users`, `/users/[id]`, `/settings`)
2. Desktop: DesktopNav shows active state correctly per route
3. Mobile: `/users`, `/users/[id]`, `/settings` render full-screen (right pane only, pane-left hidden)
4. Mobile: BottomNav still appears on tab routes
5. TypeScript compiles clean
6. No files outside `apps/web/` modified
