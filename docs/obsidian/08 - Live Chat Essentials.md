---
tags: [penthouse, realtime, typing, presence, obsidian]
created: 2026-03-08
---

# Live Chat Essentials

## Why this slice exists

Shared chat and message delivery were working, but the app still lacked the two pieces that make a live room feel actually live:

- typing indicators
- presence state

Without them, the app could move messages, but it still felt more like request/response than realtime conversation.

## What was added

### Typing flow

The mobile composer now emits a typing lifecycle instead of only send events:

- `typing.start` when a user begins entering a non-empty draft
- `typing.stop` after idle timeout, blur, send, or unmount

The client only emits these while the socket is actually connected, so stale typing events do not queue up during outages.

### Typing indicator UI

The active chat now shows a typing indicator between the scrollable message history and the composer.

That placement matters. The earlier version rendered inside the scroll container, so the indicator could exist in the DOM while still sitting below the visible viewport in any real chat with enough messages.

Rules:

- only remote users are shown
- indicator clears when the user stops typing
- indicator also clears when a message from that sender arrives
- multiple typers collapse to a short summary instead of rendering noise

### Presence sync

The backend already emitted online/offline transitions, but a fresh client had no way to know who was already online at connect time.

That gap was closed with a new socket event:

- `presence.sync`

It sends the connecting client a snapshot of current online user ids immediately after connection.

This matters because otherwise presence would only become correct after everyone else disconnected and reconnected.

### Presence UI

Presence now surfaces in the member-facing app in low-noise places:

- always-visible online/offline dots in the member directory
- online/offline status in the member profile sheet

Directory rule:

- gray dot = offline or no live presence yet
- green dot = online

## Design rule used here

This slice avoided a full visual pass.

Reason:
- typing and presence change interaction structure
- attachment/media work is still ahead
- doing a full redesign now would create avoidable rework

So the implementation stayed narrow:
- functional realtime behavior first
- minimal UI affordances to expose it

## Key backend note

Presence state is only trustworthy when the socket is healthy.

When the client loses realtime connectivity, the app clears live typing state and drops presence back to offline until a fresh sync arrives.

That is stricter than showing "last known online", but it is more honest.

## What to test manually

Use two clients and verify:

- directory dots update without reopening the app
- profile-sheet status updates without reopening the app
- typing indicator shows correct display name
- typing clears on send and idle timeout
- reconnect restores presence snapshot without full reinstall

## What this unlocks next

This slice finishes the core realtime loop enough to justify moving into one of the next two branches:

1. media foundation
2. basic admin/operator UI

Media is the more natural product-facing next step.

## DM v1 note

The chat stack now also supports 1:1 direct messages without introducing a second message system.

- DMs are created on first send, not on open
- one DM thread exists per member pair
- DMs stay mixed into the normal chat list and reuse typing, read state, media, GIF, and moderation behavior
- if a counterpart is later removed or banned, the remaining member can still read history but the DM becomes read-only
