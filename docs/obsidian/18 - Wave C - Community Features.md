---
tags: [penthouse, pwa, polls, slash-commands, note-to-self, obsidian]
created: 2026-04-09
---

# Wave C — Community Features

## What this wave was about

Waves A and B brought the app up to feature parity with any competent messenger. Wave C starts pulling away from that baseline.

These are features designed for small communities specifically — things that feel natural when you know everyone in the room but would be noisy or confusing in a chat with strangers.

## What was added

### Slash commands

Typing `/` as the first character of a message now triggers a command picker that floats above the composer. The picker filters as you type — so `/po` highlights the poll command before you've even finished.

Selecting a command from the picker (by tapping it or pressing Enter) clears the composer and performs the action immediately. Pressing Escape or typing something that doesn't match any command dismisses the picker and lets the text through as a normal message.

This is the same pattern Discord popularized. It keeps power features accessible without cluttering the toolbar.

### Polls

Typing `/poll` and selecting it opens a poll builder as a slide-up sheet. The form lets you:

- write a question (up to 200 characters)
- add between 2 and 4 answer options
- optionally set an expiry: never, 24 hours, or one week

Once created, the poll appears inline in the chat thread as a card rather than a regular message bubble. Anyone in the chat can tap an option to vote. After you vote, the card expands to show percentage bars for each option alongside the vote counts.

Votes are live. Tap an option and everyone in the chat sees the bars update in real time. The backend broadcasts each vote as a socket event so no polling is needed — it just updates.

When a poll expires, the options lock. The final results stay visible as read-only bars, so the conversation record is preserved.

### Note to Self

Every member automatically has a personal private thread that only they can see and write in. It appears pinned at the top of the chat list, above all other conversations, and is labeled "Saved" with a bookmark icon.

This works exactly like Telegram's "Saved Messages" feature. It's useful for:

- dropping links or text you want to find later
- writing notes to yourself between sessions
- keeping things visible without sending them to anyone

The thread behaves identically to any other chat on the inside — the same composer, the same message history, the same search. It just happens to be an audience of one.

## Design choices

**Polls are an inline card, not a separate screen.** The voting interaction happens directly in the thread without navigating away. This keeps the conversation context visible while you vote.

**The slash command picker only shows commands that actually exist.** There is no "coming soon" placeholder behavior. If you type something that doesn't match anything, the picker disappears and your text is treated as a message. No friction.

**Note to Self is not a special feature — it's just a chat.** The implementation is a self-DM created once on first login. The only special behavior is that it pins to the top of the list. Everything else is identical to any other thread, so there's nothing new to learn.

## What to test manually

- Type `/` in a composer. Confirm the command picker appears.
- Type `/po`. Confirm the picker filters to just the poll command.
- Press Escape. Confirm the picker dismisses and your text stays.
- Select the poll command. Confirm the builder opens. Create a poll with 3 options and a 24-hour expiry.
- Confirm the poll card appears in the thread. Have a second user vote on a different option.
- Confirm both clients see the updated bars without refreshing.
- Wait for expiry (or test with a just-passed expiry date). Confirm the options lock.
- Open the chat list. Confirm "Saved" is pinned above everything else.
- Tap it. Write a note. Navigate away and back. Confirm the note is still there.

## What comes after this

The next work is finishing the remaining Wave B items that were staged:

1. **Image attachments** — attach and send images directly from the chat composer
2. **Markdown rendering** — bold, italic, code, and links render properly inside message bubbles
3. **Message editing** — correct a message after sending without deleting and resending
