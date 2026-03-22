Claude Opus 4.6, do a bounded review of the first media-controls slice for The Penthouse rebuild after implementation lands.

Review target
- The rebuild is now the live public app
- Media upload/rendering and fullscreen viewer already exist
- A new local-only media-controls slice has been added
- The known Klipy picker preview polish issue is supposed to be fixed in this pass

What to review

1. Preference correctness
- Confirm the media settings behave as local-only device settings
- Watch for stale preference behavior or cases where the settings appear saved but are not actually applied

2. Runtime behavior
- Confirm Klipy picker behavior is genuinely improved, not just shifted around
- Confirm Giphy behavior does not regress
- Confirm reduced-motion/reduced-data states still leave the media experience usable
- Confirm the fullscreen viewer still opens the real asset when inline behavior is intentionally lighter

3. Product clarity
- The settings UI should be understandable to a normal user
- Call out wording that overpromises what “reduced data mode” or “animate GIFs automatically” actually does
- Watch for confusing states where the picker looks broken instead of intentionally lighter

4. Scope discipline
- Call out drift into:
  - caption support
  - file-card redesign
  - upload pipeline work
  - backend analytics
  - synced cross-device media preferences

Do not do
- no broad chat redesign
- no notification-controls review
- no settings-page redesign outside this slice

Files/seams to review
- `apps/mobile/src/components/ProfileSettings.vue`
- `apps/mobile/src/components/ProfileSettings.test.ts`
- `apps/mobile/src/components/GifPicker.vue`
- `apps/mobile/src/components/MessageList.vue`
- `apps/mobile/src/services/sessionStorage.ts`
- `apps/mobile/src/App.vue` if touched
- any backend media route changes only if they were necessary for the picker fix

Return
1. Findings first, ordered by severity
2. Any missing acceptance checks
3. Any stale-preference or provider-regression risk
4. Brief verdict: safe for real member use, or not yet
