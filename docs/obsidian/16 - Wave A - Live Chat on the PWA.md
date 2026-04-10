---
tags: [penthouse, pwa, realtime, typing, presence, read-receipts, gif, muting, obsidian]
created: 2026-04-09
---

# Wave A — Live Chat on the PWA

## What this wave was about

The PWA baseline could send and receive messages. What it could not yet do was feel alive.

A chat that doesn't show you when someone is typing, whether they're online, or whether they've seen your message feels like a bulletin board. Wave A closed that gap — everything that makes a conversation feel like a conversation rather than an exchange of documents.

## What was added

### Typing indicators

When someone is actively composing a reply, a small indicator appears in the header of that chat. It clears automatically when they send or stop typing, and it handles multiple simultaneous typers gracefully.

The indicator is careful not to lie: it only shows while the real-time connection is healthy. If the socket drops, it goes silent rather than showing stale data.

### Presence

Every member in the chat list and in the member directory now has a small dot next to their avatar:

- green = online right now
- no dot = offline or unknown

The tricky part of presence is the cold-start problem: when you first open the app, you don't know who was already online before you connected. That was solved with a sync event that fires immediately on connect and sends the current online snapshot in one shot.

Presence is only shown as trustworthy while the socket is live. On disconnect, everyone goes gray rather than showing stale state.

### Read receipts

The app now shows whether messages have been seen:

- In a direct message (1:1 conversation): "Seen 4:32 PM" appears below the last message the other person has read
- In a group channel: small stacked avatars appear below messages to show who has seen them

The read state updates in real time. If the other person is looking at the chat right now, you see it immediately.

### GIF sending

A dedicated GIF button opens a picker backed by two providers: Giphy and Klipy. Trending GIFs load by default; there's also a search bar for finding something specific.

Selected GIFs appear inline in the chat thread — they render as animated images, not links. The picker closes automatically after selection and the GIF is sent with the same delivery guarantee as a text message.

### Chat muting

Long-pressing on any conversation in the chat list opens a mute option. Muted chats:

- suppress the unread badge (no more red dot demanding your attention)
- show a small bell-off icon so you can see at a glance which chats you've silenced
- can be unmuted any time with another long press

Muting is local to your device. It does not affect other members of the same channel.

## Design choices worth noting

All of these features went through the same optimistic delivery pattern already in place for text messages. When you take an action — send a message, mark read — the UI responds immediately. The server confirmation catches up behind the scenes, and the UI corrects if anything went wrong.

Typing events are rate-limited on the client so they don't flood the server. One event per second is the cap, regardless of how fast someone types.

## What to test manually

- Open the same chat on two devices. Start typing on one — confirm the indicator appears on the other. Send — confirm it clears.
- Go offline on one device. Confirm presence goes gray. Reconnect. Confirm it updates.
- Send messages in a DM. Confirm "Seen" appears when the other person scrolls to that point.
- Mute a chat. Confirm the unread badge disappears. Receive a new message. Confirm it does not rebadge.
- Open the GIF picker. Search for something. Select a GIF. Confirm it appears animated in the thread.

## What this unlocks

With the live-chat feedback layer in place, the app feels genuinely real-time. The next logical layer is richer message content — things you can do with messages beyond just sending and reading text.

Next: [[17 - Wave B - Rich Messaging]]
