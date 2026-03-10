# Native Notifications and Strict Read Receipts

## What changed

- Read receipts no longer advance just because a chat is selected in app state.
- A message only becomes `seen` when the receiving user is:
  - in the app
  - on the chat screen
  - at the live bottom of the message list
- Backgrounding the app or turning the screen off no longer counts as `seen`.
- Android local notifications are now wired through Capacitor Local Notifications.
- Notifications open the app back into the relevant chat when tapped.

## Why it matters

The previous logic was too optimistic. It treated "selected chat exists in state" as equivalent to "the user actually saw the message." That was technically wrong and would produce false `✓✓` receipts.

The new rule uses the same source of truth for both unread state and seen state:

- the app must be foregrounded
- the chat must be the active screen
- the latest messages must be visible

## Limits of the current notification slice

This is a local-notification implementation, not full push.

That means:

- if the runtime is alive enough to receive the realtime event, Android can show a device notification
- if Android fully suspends the app process, there is no server-driven push wakeup yet

True always-on background delivery needs a later FCM/APNs push slice.

## Files touched

- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/MessageList.vue`
- `apps/mobile/src/components/ConnectionStatus.vue`
- `apps/mobile/src/components/MessageComposer.vue`
- `apps/mobile/src/services/notifications.ts`
- `docs/INTERNAL_TESTING.md`

## Validation

- mobile tests passed
- full repo validation passed
- Capacitor Android sync detected the local-notifications plugin
