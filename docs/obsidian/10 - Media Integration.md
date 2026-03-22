# Media Integration

## What was added

- message types now support `text`, `image`, `video`, `gif`, and `file`
- uploaded attachments are stored through the API and rendered from message metadata
- the mobile composer can now:
  - upload images
  - upload videos
  - upload text-style files (`.txt`, `.md`, `.json`, `.csv`, `.log`, `.yaml`, `.xml`)
  - open a GIF picker backed by `Giphy` and `Klipy`
- sent messages keep the existing optimistic delivery flow and queue/retry behavior after upload

## Important design choices

- uploads are still sent through the API, not directly to third-party storage
- attachment message metadata stores relative upload URLs so different clients resolve media against their own API base cleanly
- GIF provider requests are proxied through the API using locally configured provider keys
- upload failure is surfaced immediately to the sender; queued retry only begins after the file has been uploaded and the message payload exists

## What this affects

- composer behavior
- message rendering in chat history
- message contracts and realtime payload shape
- manual testing scope for Android/web clients

## Known limits

- there is no attachment caption flow yet; attachment messages use filename or GIF title as their content label
- failed raw uploads are not persisted to the offline queue; the user retries by choosing the file again
- avatar upload reuse is still separate from chat attachment flow

## Runtime correction: Klipy inline playback

Klipy needed a follow-up fix after manual Android testing.

What was wrong:

- the chat-thread inline renderer was using the preview asset for Klipy image-mode GIFs
- that meant the modal could animate while the inline chat tile stayed static

What is true now:

- inline chat rendering uses the animated asset URL for GIF playback
- preview assets remain for picker/fallback behavior
- inline playback and modal playback are now aligned

## Local media controls

- media behavior now has device-local settings for:
  - automatic GIF animation
  - reduced data mode
- reduced data mode favors still/lighter previews in both the picker and inline chat rendering
- fullscreen media still opens the real asset even when inline rendering is reduced

## Current status

- Klipy picker polish is now fixed for the main live paths:
  - when animation is allowed, Klipy picker tiles can use animated assets
  - when reduced motion/data is preferred, picker tiles fall back to still/lighter previews
- Giphy behavior remains intact under the same local preference rules

## Next likely slices

1. richer media polish: caption support, better file icons
2. unread markers and notification basics
3. admin/operator UI on top of the backend controls already built
4. visual restoration and broader UI exploration once the core product surface is stable
