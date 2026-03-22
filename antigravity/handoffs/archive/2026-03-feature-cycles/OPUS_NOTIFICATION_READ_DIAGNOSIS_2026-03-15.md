# Opus Prompt: Notification and Read-Visibility Diagnosis

Claude Opus 4.6, do a bounded diagnosis pass on the next likely alpha blocker: local notification UX and strict read-visibility behavior.

## Project context

- The Penthouse rebuild
- Mobile-first Vue 3 + Vite + Capacitor app
- Fastify + PostgreSQL backend
- Shared contracts in `packages/contracts`
- Internal-only alpha prep
- Public rollout paused

## Recent manual-confirmed wins

- Auth/layout clipping was resolved by the global box-sizing fix.
- Typing indicator is now visible in runtime.
- Presence indicators are back and readable.
- Klipy inline playback now works in chat.

## Next task

Inspect the current notification/read-visibility seam and identify what still needs hardening before another serious alpha sweep.

## Focus only on

- local notifications for unread messages outside the active chat
- suppression while the user is already in the active live chat
- behavior when the app is backgrounded vs foregrounded
- tapping a notification and landing in the correct chat
- delivered-notification cleanup and clear behavior
- strict seen logic staying honest when the app is backgrounded or not at live bottom

## Do not do

- push notification infrastructure
- DMs
- admin UI
- visual redesign
- backend contract churn unless you find a true blocker

## Important

- Manual runtime truth matters more than code-review confidence.
- Be skeptical of tests that prove a code path but not actual Android behavior.
- Do a double take on lifecycle edges, stale state, reconnect, and notification duplication/suppression.

## Useful seams

- `apps/mobile/src/App.vue`
- `apps/mobile/src/services/notifications.ts`
- `apps/mobile/src/App.test.ts`
- `docs/INTERNAL_TESTING.md`
- `docs/obsidian/12 - Native Notifications and Strict Read Receipts.md`

## Return

1. Root-cause diagnosis of the remaining notification/read risks
2. A bounded fix list only
3. Which risks need implementation now vs manual retest only
4. Which tests are currently giving false confidence, if any
