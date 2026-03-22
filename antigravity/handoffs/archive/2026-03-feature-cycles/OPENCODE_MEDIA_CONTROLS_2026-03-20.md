Implement the first media-controls slice for The Penthouse rebuild. Use this prompt as the contract. Keep scope tight and practical.

Project context
- The Penthouse rebuild is now live publicly
- Mobile: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Shared contracts already support media/GIF metadata
- Uploads, inline media, and fullscreen viewer already exist
- Giphy and Klipy picker support already exists
- Notification-controls slice already landed

Goal
Add a local-only media control layer so users can reduce motion/data when they want to, while also fixing the remaining Klipy picker polish issue.

Build this exact slice

1. Add media controls to Settings
- Add a small media section in the existing settings/profile area
- Keep the controls local-only and device-specific
- The UI should stay simple and plain-language

2. Add these controls
- `Animate GIFs automatically`
  - boolean
  - default `true`
- `Reduced data mode`
  - boolean
  - default `false`
  - when enabled, it should override automatic animation behavior and favor lighter/still previews

3. Storage model
- Store both media preferences in the existing local client-side persistence layer used for local device settings
- Do not add backend APIs or database fields for this slice unless a very small provider-shape fix is truly required for Klipy picker behavior

4. Klipy picker polish
- Fix the current loose end where Klipy picker tiles can look static even though the same GIF animates once sent into chat
- Expected behavior:
  - when animation is allowed and reduced-data mode is off:
    - Klipy picker should use the animated asset when that is the right visual path
  - when animation is reduced:
    - use still/lighter previews instead
- Do not regress Giphy behavior while fixing Klipy

5. Chat/media behavior rules
- If `Animate GIFs automatically` is on and `Reduced data mode` is off:
  - current animated inline GIF behavior can remain
- If animation is off or reduced-data mode is on:
  - inline GIFs should render as still previews where possible
  - video-mode GIFs should not autoplay inline
  - tapping the media should still open the fullscreen viewer with the real media asset
- Fullscreen viewer behavior:
  - explicit open/tap should still show the actual media asset
  - do not neuter fullscreen playback because of the lighter inline settings

6. Scope discipline
- no caption support
- no upload pipeline changes
- no file-card redesign
- no per-chat media preferences
- no analytics
- no broad settings-page redesign

7. Tests
- Frontend tests should cover:
  - settings load and local persistence
  - Klipy picker renders the intended asset path when animation is allowed
  - reduced-data / animation-off path uses still previews instead of autoplaying GIF behavior
  - fullscreen viewer still opens the real media asset from a reduced-motion/reduced-data inline state
  - Giphy behavior does not regress
- Backend tests only if a minimal provider parsing change is actually needed

Likely files
- `apps/mobile/src/components/ProfileSettings.vue`
- `apps/mobile/src/components/ProfileSettings.test.ts`
- `apps/mobile/src/components/GifPicker.vue`
- `apps/mobile/src/components/MessageList.vue`
- `apps/mobile/src/services/sessionStorage.ts`
- `apps/mobile/src/App.vue` if preference plumbing needs a parent-level state path
- `docs/obsidian/00 - Knowledge Hub.md`
- `docs/obsidian/10 - Media Integration.md`
- `docs/obsidian/13 - MVP Stability Plan v2.md`

Validation
- run relevant mobile tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`
- if backend media parsing changed, run the relevant API tests too

Return
1. Root cause addressed
2. Files changed
3. Settings / behavior summary
4. Tests updated
5. Validation results
6. Any remaining runtime risk or manual proof still worth doing
