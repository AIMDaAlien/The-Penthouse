# Direct Messages v1 Agent Packet

## Summary

Run this next slice as a two-agent sequence:

1. `Opencode` implements the full Direct Messages v1 slice
2. `Claude Opus 4.6` reviews the landed work for correctness, privacy, stale-state behavior, mute semantics, and admin trust clarity

This slice adds:
- private `1:1` DMs only
- one DM thread per pair
- first-send creation
- mixed chat-list presentation
- full message/media/GIF/typing/read/push parity
- per-thread mute
- explicit admin visibility notice
- admin audit/moderation support for DMs

## Locked product decisions

- `1:1 only`
- `any active member can DM any other active member`
- `one thread per pair`
- `DM is created on first send, not on open`
- `DMs live in the existing mixed chat list`
- `full content parity with channels`
- `admins can audit and moderate DMs`
- `mute thread` is the only self-service DM control in v1
- show a lightweight in-app notice that admins can review DMs for safety
- no group DMs, blocklists, archive/hide-from-list, leave/delete, or reports in v1

## Why this split

- `Opencode` should own the implementation because this is mostly mechanical reuse of the existing chat stack plus UI plumbing.
- `Claude` should review after landing because the real risks are privacy expectations, stale UI state, mute correctness, and admin visibility trust, not architecture invention.

## Expected implementation shape

Backend / contracts
- add `direct_chats` mapping table with a uniqueness guarantee per ordered user pair
- add DM find-or-create endpoint
- add per-chat member preference endpoint for mute
- extend chat summary shape for DM counterpart data and mute state
- add admin chat-list endpoint so moderation can browse DMs too
- keep messages/typing/read/push/moderation on the existing chat stack

Frontend
- add `Message` entry point to `MemberProfileSheet`
- support provisional DM compose state before the first send
- resolve/create DM on first send and then use the normal send path
- show DM rows in the mixed chat list with counterpart avatar/name
- add DM thread header/info strip with mute toggle + admin visibility notice
- switch admin moderation chat selector to the admin chat list instead of the signed-in user’s own chat list

## Agent order

1. Send `OPENCODE_DIRECT_MESSAGES_V1_2026-03-21.md`
2. After it lands, send `OPUS_DIRECT_MESSAGES_V1_REVIEW_2026-03-21.md`

## Acceptance targets

- a member can start a DM from profile, send first message, and land in the real thread
- sending another DM to the same person reuses the same thread
- DM rows appear correctly in the main mixed list
- per-thread mute suppresses push + local fallback + foreground toasts for that user only
- admin moderation can inspect and moderate DMs
- if one DM participant becomes removed/banned, the other side becomes read-only but still sees history
