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

The active chat now shows a typing indicator at the bottom of the message list.

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

- online count in the chat list
- online/offline badges in the member directory
- online/offline status in the member profile sheet

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

- both users see the same online count
- directory badges update without reopening the app
- typing indicator shows correct display name
- typing clears on send and idle timeout
- reconnect restores presence snapshot without full reinstall

## What this unlocks next

This slice finishes the core realtime loop enough to justify moving into one of the next two branches:

1. media foundation
2. basic admin/operator UI

Media is the more natural product-facing next step.
