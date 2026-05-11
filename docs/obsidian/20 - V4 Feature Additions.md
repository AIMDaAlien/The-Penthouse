---
tags: [penthouse, v4, features, alpha]
created: 2026-05-10
---

# V4 Feature Additions

V4 is the alpha-ready clean-room rebuild merged over the incumbent deployment shape.

## Chat and realtime

- Pinned messages: `services/api/src/routes/chats.ts`, `apps/web/src/lib/components/PinBanner.svelte`
- Channel creation and listing: `services/api/src/features/channels/routes.ts`, `apps/web/src/lib/components/ChannelList.svelte`
- Message search: `services/api/src/routes/chats.ts`, `apps/web/src/routes/chat/[id]/+page.svelte`
- Read receipt socket broadcast fixes: `services/api/src/routes/chats.ts`, `apps/web/src/lib/stores/readReceipts.svelte.ts`
- Deep availability states: `packages/contracts/src/events.ts`, `services/api/src/realtime/socket.ts`

## Expression and media

- Giphy search proxy: `services/api/src/features/gifs/routes.ts`, `apps/web/src/lib/services/gifs.ts`
- Custom emotes and `:name:` syntax: `services/api/src/features/customEmotes/routes.ts`, `apps/web/src/lib/components/EmotePicker.svelte`
- Stickers and sticker packs: `services/api/src/features/customEmotes/routes.ts`, `apps/web/src/lib/components/StickerPicker.svelte`
- Unified picker: `apps/web/src/lib/components/UnifiedPicker.svelte`
- Emoji/emote autocomplete: `apps/web/src/lib/components/EmojiEmoteAutocomplete.svelte`
- Markdown rendering: `apps/web/src/lib/components/MarkdownText.svelte`
- Audio recording/playback with waveform controls: `apps/web/src/lib/components/AudioRecorder.svelte`, `apps/web/src/lib/components/AudioPlayer.svelte`

## Organization and personalization

- Chat folders: `services/api/src/features/chatFolders/routes.ts`, `apps/web/src/lib/stores/folders.svelte.ts`
- Per-chat and global wallpapers: `services/api/src/routes/wallpapers.ts`, `apps/web/src/lib/stores/wallpapers.svelte.ts`
- Dark/light/system theme handling: `apps/web/src/lib/utils/theme.ts`
- Push controls and privacy levels: `services/api/src/routes/push.ts`, `apps/web/src/lib/components/PushSettings.svelte`

## Deferred

Voice chat has a WebRTC scaffold in `apps/web/src/lib/stores/voice.svelte.ts` and related e2e coverage, but release-quality voice chat is deferred to beta.
