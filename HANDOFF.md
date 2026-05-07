# Handoff — 2026-05-06 | Kimi → Next Agent

## State
Branch: main | Commit: d7aa463 | Working tree: clean
Last commit: feat(web): backfill TypingIndicator, ReadReceipts, readReceipts store, enhanced push subscribe

## Changed this session
- `apps/web/src/lib/components/TypingIndicator.svelte` — named avatars + animated dots, horizontal layout, overflow text
- `apps/web/src/lib/components/ReadReceipts.svelte` — DM slash glyph system, group avatar rail up to 5
- `apps/web/src/lib/stores/readReceipts.svelte.ts` — marker model store with socket listener, seedFromMessages, getReadersForMessage
- `apps/web/src/lib/push/subscribe.ts` — SW timeout guard (5s), idempotent resubscribe, SubscribeResult/PushStatus types
- `apps/web/src/routes/chat/[id]/+page.svelte` — wire TypingIndicator (Map-based multi-typer) and ReadReceipts
- `apps/web/src/lib/components/PushPermissionBanner.svelte` + `PushSettings.svelte` — adapt to new SubscribeResult
- `apps/web/src/lib/push/payload.ts` — parse push payload with privacy levels (private/metadata/full)
- `apps/web/src/service-worker.ts` — push event handler + notificationclick navigation to chat
- `apps/web/src/routes/+layout.svelte` — integrate PushPermissionBanner
- `apps/web/src/routes/settings/+page.svelte` — add Notifications section with PushSettings
- `apps/web/.env.example` — add PUBLIC_VAPID_PUBLIC_KEY

## Intent
Frontend is now at parity with the incumbent PWA for all completed features. Chat thread has TypingIndicator (multi-user Map), ReadReceipts (DM slash + group rail), scroll-based read tracking, and a dedicated readReceipts store. Push stack is complete with permission banner, settings toggle, service worker handler, and robust VAPID subscription lifecycle.

## Your task
- **Codex**: implement `services/api/` push endpoints (`/push/vapid-key`, `/push/subscribe`, `/push/unsubscribe`) so frontend can actually subscribe and receive push notifications. Also need VAPID key generation.
- **Claude/Kimi**: Landing page `/+page.svelte` is currently a redirect to `/auth` — needs The Penthouse brand moment. Playwright e2e tests are scaffolded but no specs written.

## Open questions
1. **VAPID key pair**: Need `npx web-push generate-vapid-keys` and add public key to both backend env and `apps/web/.env.example`.
2. **Push for channels**: Confirm `scope_default = 'dm_only'` correctly suppresses push for group channel messages.
3. **Landing page**: Should `/` be a branded landing page for unauthenticated users, or redirect to `/auth`?
