# Media Controls + Picker Polish Packet

## Current truth

The rebuild is now the live public app.

What already exists:

- uploads and inline media rendering
- fullscreen media viewer
- Giphy and Klipy picker support
- a fresh notification-controls slice

## What is actually missing

The member-facing media experience still lacks a simple control layer.

Current loose ends:

- Klipy picker previews can still appear static even though sent Klipy media animates correctly in chat
- users cannot tone down motion or data usage without giving up media entirely

## Scope for this round

Build the **first media-controls slice** and fold the known Klipy picker polish issue into it.

That slice should be:

- member-facing
- local-only
- practical
- small enough to land without redesigning the chat media system

## First slice target

1. User can control whether GIFs animate automatically
2. User can enable a reduced-data media mode on this device
3. Klipy picker previews animate correctly when animation is allowed
4. GIF/media browsing still feels usable when animation is turned down
5. Explicit user actions like opening the fullscreen viewer still show the real media asset

## Suggested v1 behaviors

- `Animate GIFs automatically`
  - local-only preference
  - default on
- `Reduced data mode`
  - local-only preference
  - when on, prefer static/lighter previews where possible
  - overrides automatic animation behavior
- `GIF picker`
  - when animation is allowed and reduced-data mode is off:
    - Klipy should stop looking artificially static
  - when animation is reduced:
    - use lighter/still previews
- `Chat thread`
  - animated GIFs can render as still previews when the user has chosen less motion/data
  - tapping/opening media still leads to the real asset

## Not in this slice

- caption support
- richer file icons
- upload pipeline changes
- per-chat media settings
- backend analytics or media metrics
- broader settings redesign

## Agent order

1. `Opencode`
   - implement media controls + Klipy picker polish
2. `Claude Opus 4.6`
   - review for provider regressions, stale preference behavior, and broken viewer/runtime behavior

## Important implementation boundary

Keep this slice local-only unless a minimal API/provider parsing adjustment is truly required to make the Klipy picker behave correctly.

Do **not** invent a synced cross-device media preferences system in this round.
