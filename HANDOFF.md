# Handoff — 2026-05-06 | Kimi → Codex

## State
Branch: main | Commit: 04a3a63 | Working tree: clean
Last commit: docs(adr): 04-backend-scaffold — comprehensive Codex implementation guide

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
- `docs/adr/04-backend-scaffold.md` — comprehensive backend implementation guide for Codex

## Intent
Frontend is now at parity with the incumbent PWA for all completed features. Chat thread has TypingIndicator (multi-user Map), ReadReceipts (DM slash + group rail), scroll-based read tracking, and a dedicated readReceipts store. Push stack is complete with permission banner, settings toggle, service worker handler, and robust VAPID subscription lifecycle.

The backend scaffolding plan (`docs/adr/04-backend-scaffold.md`) is ready for Codex to implement. It covers 8 phases: bootstrap, auth, users, chats/messages REST, Socket.IO realtime, push notifications, media uploads, rate limiting + observability.

## Your task → Codex
Implement `services/api/` per `docs/adr/04-backend-scaffold.md`. The frontend is waiting — every API call currently 404s.

Priority order:
1. Bootstrap + auth (register/login/refresh/logout)
2. Chats + messages REST
3. Socket.IO realtime (message send/ack/broadcast, typing, read receipts)
4. Push notifications (VAPID endpoints + delivery)
5. Media uploads
6. Rate limiting + tests

## Open questions
1. **VAPID key pair**: Need `npx web-push generate-vapid-keys` and add public key to both `services/api/.env` and `apps/web/.env`.
2. **File storage backend**: Local disk for dev is fine. For production, should uploads go to S3/R2/MinIO?
3. **Altcha HMAC key**: Need a real key for production (free from altcha.org).
4. **Landing page**: Should `/` be a branded landing page for unauthenticated users, or redirect to `/auth`?
