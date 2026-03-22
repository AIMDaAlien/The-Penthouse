# Claude Opus Review Prompt: Balanced Admin Suite v1

Use this as a bounded review and testing prompt for the newly landed Balanced Admin Suite v1 in The Penthouse rebuild.

```text
Claude Opus 4.6, do a bounded review of the newly landed Balanced Admin Suite v1 for The Penthouse rebuild.

Context
- The rebuild is live publicly.
- This slice has now been implemented, not just planned.
- Scope added:
  - reversible message hide / unhide moderation
  - required moderator reasons
  - member tombstones for moderated messages
  - admin audit visibility of original content plus latest moderation metadata
  - realtime moderation updates
  - expanded read-only operator diagnostics

Important constraints
- Review this as a correctness / trust / stale-state pass.
- Do not widen into product redesign.
- Do not suggest member reports, hard delete, remote-control server tooling, analytics bloat, or unrelated moderation systems.

What changed

Backend / contracts
- packages/contracts/src/api.ts
- packages/contracts/src/events.ts
- packages/contracts/openapi.v1.yaml
- services/api/src/db/migrations/010_message_moderation.sql
- services/api/src/db/migrate.ts
- services/api/src/routes/admin.ts
- services/api/src/routes/chats.ts
- services/api/src/realtime/socket.ts
- services/api/src/utils/messages.ts

Frontend
- apps/mobile/src/App.vue
- apps/mobile/src/services/http.ts
- apps/mobile/src/components/AdminModerationManagement.vue
- apps/mobile/src/components/AdminServerManagement.vue
- apps/mobile/src/components/MessageList.vue

Tests
- apps/mobile/src/components/AdminModerationManagement.test.ts
- apps/mobile/src/components/AdminServerManagement.test.ts
- apps/mobile/src/components/MessageList.test.ts
- apps/mobile/src/App.test.ts
- services/api/test/integration-auth.test.ts
- services/api/test/integration-moderation.test.ts

What the implementation is supposed to do

1. Moderation model
- Admin-only message moderation
- Hide and unhide only
- Non-empty reason required for both actions
- Original content is preserved
- Append-only moderation event log exists

2. Member/admin read behavior
- Normal member reads should receive moderated messages as tombstones, not silent disappearance
- Tombstones must be generic and must not expose moderator reason
- Admin audit reads must still show original content plus latest moderation metadata
- Removed/banned-user visibility should remain coherent with the new tombstone model

3. Realtime behavior
- Open chats should update when a message is hidden or restored
- Members should not keep seeing old moderated content after the event if the message is already in view
- If the message is not currently loaded, the fallback behavior should still be sane and not fabricate bad state

4. Operator diagnostics
- Server panel remains read-only
- New summary now includes:
  - realtime/socket counts
  - moderation counts
  - richer push/device-preference counts
- Call out any number that looks more authoritative than it really is

What to review

1. Moderation correctness
- Is hide/unhide truly reversible?
- Are reasons actually required and persisted?
- Do member reads and admin audit reads diverge correctly?
- Do removed/banned-user message rules still make sense after this change?

2. Privacy / trust
- Any leak of hidden message content to normal members through:
  - normal reads
  - realtime events
  - stale client state
  - metadata / type / media URLs
- Any leak of moderator reason or moderation metadata to non-admin paths

3. Realtime / stale-state
- Do open chats update correctly on hide and restore?
- Any cases where the selected chat can keep stale content until a manual refresh?
- Any admin/member divergence that would confuse trust in moderation?

4. Operator summary honesty
- Are the new diagnostics meaningful?
- Any weak guesses being presented as facts?
- Any field that should be softened or renamed for honesty?

5. Test coverage gaps
- What important acceptance checks are still missing?
- Focus on real risk, not wishlist tests

Do not do
- no member report system suggestions
- no hard delete system
- no deploy/restart controls
- no broad admin redesign
- no analytics/dashboard expansion
- no push redesign
- no iOS work

Return
1. Findings first, ordered by severity
2. Missing acceptance checks
3. Any privacy-leak or stale-state risk
4. Brief verdict: safe for real admin/operator use, or not yet

Manual truth still matters
- If you think the code is probably right but still needs runtime proof, say exactly which live/manual checks still matter most.
```

Suggested manual checks after the review

- Hide a live message from the admin moderation panel and confirm a member client shows `Message removed by moderation.` without reload.
- Restore the same message and confirm the member view recovers without reload.
- Confirm the admin audit panel still shows original content plus the latest moderation reason, actor, and timestamp.
- Confirm the operator panel numbers are believable on the live stack:
  - socket count
  - connected users
  - hidden messages
  - recent moderation actions
  - push/device preference counts
