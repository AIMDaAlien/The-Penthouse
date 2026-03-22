# Claude Opus Review Prompt: Direct Messages v1

Use this as the bounded post-implementation review prompt for the newly landed Direct Messages v1 slice in The Penthouse rebuild.

```text
Claude Opus 4.6, do a bounded review of the newly landed Direct Messages v1 slice for The Penthouse rebuild.

Context
- The rebuild is already live publicly.
- This slice has been implemented, not just planned.
- Scope added:
  - private 1:1 DMs
  - one thread per pair
  - first-send creation
  - mixed chat-list presentation
  - full message/media/GIF/push/read-state parity
  - per-thread mute
  - explicit admin visibility notice in DM threads
  - admin audit/moderation support for DMs

Important constraints
- Review this as a correctness / privacy / trust / stale-state pass.
- Do not widen into blocklists, reports, group DMs, or broader product strategy.
- Do not suggest redesigning the chat architecture; DMs intentionally reuse the existing chat stack.

Locked product decisions
- 1:1 only
- any active member can DM any other active member
- one thread per pair
- DM created on first send, not on open
- DMs mixed into the existing chat list
- full parity with current message/media/GIF/push/read behavior
- admins can audit and moderate DMs
- mute thread is the only self-service DM control in v1
- no archive, leave, delete, block, or report controls in v1

What changed conceptually

Backend / contracts
- a `direct_chats` mapping table should now exist
- a DM find-or-create endpoint should now exist
- per-chat mute preferences should now exist on `chat_members`
- chat summaries should now include DM counterpart fields and mute state
- an admin chat-list endpoint should now exist so moderation can browse DMs too
- push / notification behavior should now respect per-thread mute for the receiving user

Frontend
- `MemberProfileSheet` should now expose a Message action
- DM start should use a provisional compose state before the first send
- DMs should appear in the existing mixed chat list with counterpart avatar/name
- DM threads should show a mute toggle and an admin-visibility notice
- admin moderation should browse DMs through an admin chat selector rather than the signed-in admin’s own chat memberships

What to review

1. DM correctness
- Does one-thread-per-pair truly hold under repeated creation attempts?
- Does first-send creation avoid ghost threads while still behaving sanely for media/GIF sends?
- Do DMs correctly become read-only when the counterpart is removed/banned?
- Does the client avoid stale provisional-state weirdness after the first successful send?

2. Privacy / trust
- Do normal members only see DM content they should see?
- Does admin access to DMs stay clearly admin-only in API paths and UI state?
- Does the member-facing DM notice match the actual admin visibility model?
- Any content leak through mute, chat summaries, realtime payloads, or stale client state?

3. Mute behavior
- Does per-thread mute suppress:
  - push
  - local background fallback notifications
  - in-app foreground toasts
  for the muted user only?
- Does mute incorrectly suppress unread counts, list updates, or message delivery?
- Any weak spots in how mute is represented or persisted?

4. Mixed chat list / UX correctness
- Do DM rows render with the right counterpart identity for each viewer?
- Any likely confusion from mixing channels and DMs in the same list?
- Does the implementation avoid storing viewer-relative DM names incorrectly in shared DB state?

5. Admin moderation / audit behavior
- Can admins actually browse DMs through the moderation selector?
- Do DM audit reads show original content plus moderation metadata?
- Do member reads of moderated DM messages still return tombstones only?

6. Test coverage gaps
- Focus on real missing acceptance checks, not wishlist tests
- Call out any concurrency or stale-state path that deserves live/manual proof

Do not do
- no group DM suggestions
- no blocklist/report system
- no broad privacy-policy or legal commentary
- no deployment redesign
- no push redesign beyond this DM slice

Files/seams to review
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- DM-related DB migration(s)
- `services/api/src/routes/chats.ts`
- `services/api/src/routes/admin.ts`
- `services/api/src/push/fcm.ts`
- `services/api/src/utils/users.ts`
- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/ChatListPanel.vue`
- `apps/mobile/src/components/MemberProfileSheet.vue`
- `apps/mobile/src/components/AdminModerationManagement.vue`
- relevant backend/frontend tests

Return
1. Findings first, ordered by severity
2. Missing acceptance checks
3. Any privacy-leak, stale-state, or trust risk
4. Brief verdict: safe for real member/admin use, or not yet

Manual truth still matters
- If you think the code is probably right but still needs runtime proof, say exactly which live/manual DM checks matter most.
```
