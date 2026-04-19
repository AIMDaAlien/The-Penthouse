# Claude Frontend Handoff - Chat SSR Fetch Cleanup

**Date:** 2026-04-19
**Written by:** Codex

## Context

Tier A chat runtime proof passed after the recent frontend fixes:

- Root chat list loads.
- Direct hard-load `/chat/:id` works.
- Text message sends and appears realtime on a second client.
- Edit shows on both clients.
- Star persists after reload and appears in starred state.
- Delete tombstone appears on both clients.
- Audio upload renders as an audio bubble.
- Archive works via actual pointer click.
- Archived row appears under Archived.

There is one cleanup item left before we should call the frontend fully quiet:

On direct hard-load of `apps/web/src/routes/chat/[id]/+page.svelte`, Vite logs:

```text
Avoid calling fetch eagerly during server-side rendering - put your fetch calls inside onMount or a load function instead
```

The API also logs an unauthenticated `POST /api/v1/chats/:id/read` 401 before the authenticated client pass succeeds. The user-visible flow works, but this SSR/server noise should be removed so direct chat loading stays clean and debuggable.

Likely source: the current load `$effect` in `apps/web/src/routes/chat/[id]/+page.svelte` around the chat initialization block. It calls chat/message/pin/read APIs while SvelteKit is still evaluating the page during SSR.

## Current frontend state

Recent changes already made:

- `apps/web/src/routes/chat/[id]/+page.ts` exists and returns `chatId: params.id`.
- `apps/web/src/routes/chat/[id]/+page.svelte` reads `data.chatId` via `$props<{ data: PageData }>()`.
- The chat initialization was converted from `onMount` to a `$effect` with a cancellation flag so fast chat-to-chat navigation cannot clobber state.
- `apps/web/src/routes/+page.svelte` raised the options overlay z-index from `50` to `200`.

Keep those fixes intact unless you find a safer Svelte 5 pattern that preserves the same behavior.

## What to fix in apps/web/

Fix the chat page so API calls do not run during SSR.

The behavior to preserve:

- Direct hard-load `/chat/:id` works without a blank screen or 500.
- Navigating from one chat to another refreshes the active chat state correctly.
- Fast chat-to-chat navigation cannot let an older request clobber newer state.
- Message list, pinned messages, read receipts, and chat metadata still load.
- `page.url.searchParams.get('name')` fallback behavior still works.
- Realtime socket updates still work after the initial load.

Implementation guidance:

- Use SvelteKit 2 and Svelte 5 runes.
- API calls must continue to go through `apps/web/src/lib/services/api.ts`.
- Prefer the smallest frontend-only change that removes the SSR eager-fetch warning.
- A browser-only guard is acceptable if it is correct for navigation:
  - `import { browser } from '$app/environment'`
  - do not call chat APIs unless `browser` is true.
- If you use `onMount`, make sure chat-to-chat navigation still reloads when `chatId` changes.
- If you keep `$effect`, make sure it exits before any API call during SSR and still cancels stale async work.
- Do not move auth-sensitive client calls into a server load unless the existing auth/session plumbing supports that cleanly.

## Files to read for context

Read these first:

```text
apps/web/CLAUDE.md
apps/web/src/routes/chat/[id]/+page.svelte
apps/web/src/routes/chat/[id]/+page.ts
apps/web/src/lib/services/api.ts
apps/web/src/lib/stores/session.svelte.ts
apps/web/src/lib/stores/socket.svelte.ts
```

Useful nearby files:

```text
apps/web/src/routes/+page.svelte
apps/web/src/lib/components/MediaBubble.svelte
apps/web/src/lib/components/MessageContextMenu.svelte
```

## Hard constraints

- Only edit files under `apps/web/`.
- Do not modify backend, contracts, migrations, infra, or docs.
- Stack is SvelteKit 2.x and Svelte 5 runes. Do not introduce Svelte 4 patterns.
- No external UI frameworks.
- Icons must remain via `<Icon name="..." />`; no emoji icons.
- Mobile-first, dark-first, 375px remains the primary viewport.
- Preserve the existing API client and socket event envelope patterns.

## Cheap gate

Run from repo root:

```bash
npm --workspace apps/web run typecheck
```

Expected result:

- 0 errors.
- The existing `autofocus` accessibility warning is unrelated unless your change touches that area.

## Runtime proof to run after the fix

Start API:

```bash
cd /Users/aim/Documents/THE\ PENTHOUSE\ OPTIMIZED/services/api
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse_test JWT_SECRET=integration-test-jwt-secret-long-enough ALTCHA_HMAC_KEY=integration-test-altcha-key npm run dev
```

Start web:

```bash
cd /Users/aim/Documents/THE\ PENTHOUSE\ OPTIMIZED/apps/web
npm run dev
```

Focused browser proof:

- Use an authenticated browser session.
- Hard-load a real `/chat/:id` URL directly.
- Confirm the chat renders without refresh.
- Confirm server/browser logs no eager SSR fetch warning.
- Confirm API logs no unauthenticated `POST /api/v1/chats/:id/read` 401 caused by the direct load.
- Navigate root chat list -> chat.
- Navigate chat -> different chat if possible.
- Send a text message and confirm it appears.
- Confirm realtime still works with a second browser context if time permits.

Known dev noise:

- Ignore a lone `/sw.js` 404 in dev.
- Ignore the pre-existing `autofocus` warning if untouched.

Stop and report if you see:

- App console errors.
- API 4xx/5xx during the tested flow.
- Socket reconnect loops.
- Blank `/chat/:id`.
- Playwright/browser timeouts.
- Anything that only works after manual refresh.

## Definition of done

- `npm --workspace apps/web run typecheck` passes with 0 errors.
- Direct `/chat/:id` hard-load renders without 500 or blank state.
- No eager `fetch` during SSR warning.
- No unauthenticated `markRead` 401 during the direct-load path.
- Root list -> chat navigation still works.
- Chat-to-chat navigation still works.
- Realtime messaging still works.
- No files outside `apps/web/` modified.

