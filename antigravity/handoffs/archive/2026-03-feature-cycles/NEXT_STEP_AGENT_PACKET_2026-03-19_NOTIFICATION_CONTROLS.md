# Notification Controls Packet

## Current truth

The rebuild is now live publicly.

What already exists:

- Android push works in real runtime testing
- foreground in-app toast behavior exists
- local-notification fallback still exists where appropriate
- profile/settings UI already exists
- device tokens already register with the backend

## What is actually missing

The app still lacks a member-facing control layer for **how notifications behave on a specific device**.

Right now the app can notify, but the user cannot easily tell it:

- stop pushing on this phone
- hide message text in notifications
- stay quiet during a chosen quiet-hours window
- stop foreground in-app toasts

## Scope for this round

Build the **first notification-controls slice**.

That slice should be:

- Android-first
- device-level
- practical for daily use
- small enough to land without turning into a full notification-preferences platform

## First slice target

1. User can open notification controls from Settings
2. User can pause push on this device without logging out
3. User can turn notification message previews on or off
4. User can set a quiet-hours window for this device
5. User can turn foreground in-app toasts on or off on this device
6. Token refresh does not silently wipe the device’s saved notification settings

## Suggested v1 behaviors

- `Push on this device`
  - off = backend keeps the device token row but does not send push to it
- `Show message previews`
  - off = push notifications use generic body text instead of message content
- `Quiet hours`
  - uses local device timezone
  - supports cross-midnight windows
  - suppresses push during the active quiet window for that device
- `In-app toasts`
  - local-only preference
  - when off, foreground toast noise is suppressed but message delivery still happens

## Not in this slice

- per-chat mute
- multi-device management UI
- iOS notification preferences
- badges
- notification sounds/vibration channel customization
- announcement system
- broader settings redesign

## Agent order

1. `Opencode`
   - implement the first notification-controls slice
2. `Claude Opus 4.6`
   - review for preference drift, privacy leaks, stale token behavior, and edge-case notification mistakes

## Important implementation boundary

This slice should split preferences into:

- backend-backed, device-specific push behavior
- local-only, device-specific in-app toast behavior

Do **not** invent a synced cross-device preferences system in this round.
