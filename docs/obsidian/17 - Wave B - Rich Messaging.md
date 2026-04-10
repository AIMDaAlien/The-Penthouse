---
tags: [penthouse, pwa, reactions, reply, pins, delete, obsidian]
created: 2026-04-09
---

# Wave B — Rich Messaging

## What this wave was about

Wave A made the chat feel alive. Wave B made individual messages feel interactive.

At the end of Wave A, a message was a one-way thing. You could send it, and the other person could read it. That was it. You couldn't react to it, reply to a specific one, pin an important one, or take it back. Wave B adds all of that.

## What was added

### Emoji reactions

Long-pressing any message opens a bottom sheet. The top row shows six quick-access emoji. Below that is an expandable grid of roughly eighty common emoji.

Tap an emoji and it attaches to the message as a small pill under the bubble — the emoji plus a count of who's reacted. Tap your own reaction a second time to remove it.

Reactions are live. Everyone in the chat sees counts update in real time without refreshing. If you and three other people react with the same emoji, the count ticks up as each one comes in.

The backend enforces the obvious rules: you can't remove someone else's reaction, and non-members can't react at all.

### Reply / quote

Long-pressing a message and tapping Reply locks that message as the context for your next send. A bar appears directly above the composer showing a short preview of what you're replying to, with the original sender's name.

Send your message and it goes out with a visible quote block at the top of your bubble — the sender name and a snippet of what they said. Anyone reading the thread immediately sees the context without having to scroll up.

The quote preview stays attached to the message permanently, even if the original message is later deleted.

Tapping the dismiss button on the reply bar cancels the reply and returns the composer to normal. If your send fails, the reply target is restored so you don't lose your place.

### Message deletion

Tapping Delete from the long-press menu on your own message removes it immediately in your view. The bubble is replaced with a gray "Message removed" placeholder.

Deletion is optimistic — the placeholder appears the moment you tap so the action feels instant. The server confirms it and broadcasts the removal to everyone else in the chat.

You can only delete your own messages. Admins have a separate moderation path for removing content from other users (handled by the backend admin routes, not this surface).

### Pinned messages

Long-pressing a message reveals a Pin option. Pinning marks a message as important for the whole channel — it's useful for rules, announcements, links, or anything the room should be able to find quickly.

The pin state is live. When anyone pins a message, everyone in that chat immediately sees it pinned. Same for unpinning.

Pinned messages are tracked by the backend, so they survive sessions and devices. Open the chat a week later on a different device and the pins are still there.

### Icon and UI refresh

This wave also included a visual consistency pass on the parts of the interface that had been using text characters as icons (← for back, 🔍 for search, → for navigation arrows, ✎ for edit).

All of those were replaced with proper SVG icons drawn from a consistent icon library. The icons are:

- back arrow
- search glass
- chevron (navigation)
- trash (delete)
- pin
- reply arrow
- paperclip (attachment — for future use)
- download
- edit pencil
- copy

Avatar displays across the member directory and profile pages were also cleaned up to use the shared Avatar component consistently, including the presence dot and proper size scaling.

## Security boundaries

This wave touched some sensitive areas — delete, reactions, pins — so the backend authorization rules were tested explicitly:

- non-members of a chat cannot react, pin, or delete messages in it
- members cannot delete other members' messages
- members cannot remove other members' reactions
- pinned message content snapshots survive deletion of the source message

These boundaries were tested before the wave was considered complete.

## What to test manually

- Long-press a message. Confirm the emoji row and action list appear.
- React with an emoji. Confirm it appears as a pill under the message on both devices.
- Tap the same reaction a second time. Confirm it removes.
- Long-press a message and tap Reply. Confirm the reply bar appears above the composer. Send — confirm the quote appears in the thread.
- Dismiss the reply bar and confirm the composer returns to normal.
- Delete one of your own messages. Confirm the tombstone appears on all devices.
- Pin a message. Confirm all devices see the pin. Unpin — confirm it clears.

## What this unlocks

With reactions, reply, delete, and pins in place, the core messaging experience is now complete enough that the next layer can focus on things that are unique to this app's character — features that generic messengers don't typically have.

Next: [[18 - Wave C - Community Features]]
