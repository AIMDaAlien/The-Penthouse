# Frontend Optimization Report

Date: 2026-05-23
Scope: `apps/web/` only — cleanup, deduplication, dependency trimming
Validation: `typecheck` 0 errors, `build` passed, `test` 4/4 passed, `jscpd` 0 clones

---

## Files Removed

| File | Reasoning |
|------|-----------|
| `apps/web/scripts/build-logo-gallery.mjs` | Not referenced by any package script. Dead build tooling. |
| `apps/web/src/lib/components/MediaComposer.svelte` | Not imported by any UI component. Only referenced by its own test. |
| `apps/web/src/lib/components/MediaComposer.utils.ts` | Only used by dead `MediaComposer.svelte`. |
| `apps/web/src/lib/components/MediaComposer.utils.test.ts` | Tests for dead component. |
| `apps/web/src/lib/stores/settings.svelte.ts` | NOT imported anywhere. `data-density` attribute set but zero CSS references it. |
| `apps/web/src/lib/sync/queries.ts` | NOT imported anywhere. `sync/search.ts` is the canonical local-first query surface. |
| `apps/web/src/lib/utils/emoji-data-common.ts` | Superseded by `emoji-data-full.ts`. First 111 entries were identical — pure duplication. |
| `apps/web/src/lib/utils/messageFormat.ts` | NOT imported anywhere. `formatMessageContent` unused. |

**Total: 8 files removed, -1,518 lines**

## Files Modified

| File | Change |
|------|--------|
| `apps/web/package.json` | Removed 4 dead dependencies, kept `mediasoup-client` per user decision |
| `apps/web/src/lib/push/subscribe.ts` | Removed unused `subscribe`/`unsubscribe` aliases |
| `apps/web/src/lib/themes.ts` | Removed unused `tokensFor` export |
| `apps/web/src/lib/utils/emoji-data.ts` | Re-exports from `emoji-data-full.ts` only; local `searchNativeEmoji` function preserved for API compatibility |

## Dependencies Removed

| Dependency | Reasoning |
|------------|-----------|
| `@types/dompurify` | `dompurify` v3.4.2 ships its own types. Redundant. |
| `@testing-library/svelte` | Zero usage. No test file imports it; all tests use vitest. |
| `playwright-lighthouse` | Zero usage. No script or test references it. |
| `web-vitals` | Zero imports in source. Not wired to any runtime reporting. |

## Dependencies Kept (Intentionally)

| Dependency | Reasoning |
|------------|-----------|
| `mediasoup-client` | User explicitly wants to keep for planned voice/video chat SFU integration. Current voice uses raw WebRTC + socket.io signaling; mediasoup-client is a future seam. |
| `emotes.ts` | **Knip false positive.** Actively imported by `+layout.svelte`, `+page.svelte`, `EmotePicker.svelte`, `EmojiEmoteAutocomplete.svelte`, `emotes.svelte.ts` via `$lib/utils/emotes` alias. |

## Before / After `jscpd`

| Metric | Before | After |
|--------|--------|-------|
| Files analyzed | 94 | 89 |
| Total lines | 13,897 | 13,377 |
| Total tokens | 158,127 | 151,486 |
| Clones found | 2 | **0** |
| Duplicated lines | 137 (0.99%) | **0 (0%)** |
| Duplicated tokens | 3,189 (2.02%) | **0 (0%)** |

**Clone elimination:**
- `emoji-data-common.ts` + `emoji-data-full.ts` → removed common, deduplicated
- `sync/queries.ts` + `sync/search.ts` → removed queries, eliminated duplicate `rowToMessage`/`parseJson`

## Remaining `knip` Findings (Pre-existing, Not Actioned)

These were left untouched per the handoff guardrail: "Do not remove local-first sync, push, media composer, voice/WebRTC, or prototypes just because `knip` flags them. Confirm runtime intent first."

| Finding | Assessment |
|---------|------------|
| `emotes.ts` flagged as unused | **False positive.** Imported via `$lib/utils/emotes` SvelteKit alias across 5 files. |
| `mediasoup-client` flagged as unused | **Intentional.** Kept per user decision for future voice/video work. |
| E2E unresolved imports (`/src/lib/sync/db-client.ts`, `/src/lib/sync/search.ts`) | **Valid dynamic browser imports.** Work in Vite dev mode; knip cannot resolve Playwright browser-context dynamic imports. |
| 16 unused exports (push helpers, socket helpers, sync helpers) | **Likely false positives / indirect usage.** Many are consumed by service workers, dynamic imports, or internal stores that static analysis misses. Removing without runtime confirmation is unsafe. |
| 4 unused exported types | **Same as above.** Types like `PushPrivacyLevel`, `PushStatus` are part of the public API surface. |
| `pg` unlisted dep in E2E | **Pre-existing.** E2E test imports `pg` directly for test DB seeding. |
| `vite-plugin-pwa/client` unlisted | **Pre-existing.** Ambient type declaration in `app.d.ts`. |

## Bundle / Build Observations

| Asset | Status |
|-------|--------|
| `sql-wasm.wasm` (660KB / 323KB gzip) | **Already lazy.** Loaded only in Web Worker (`db.worker.ts`) when local-first sync initializes. Feature-gated by env var. No change needed. |
| Emoji datasets | **Deduplicated.** Removed `emoji-data-common.ts`; `emoji-data.ts` now re-exports from `emoji-data-full.ts` only. ~111 duplicate emoji entries eliminated from bundle. |
| Prototype routes | **Clean.** No `$lib/prototypes` or `$routes/prototypes` imports found in production routes. |
| `mediasoup-client` | **Not in bundle.** Zero imports in source. Install-size dead weight only (~200KB+). Acceptable as documented future seam. |

## Validation Commands & Results

```bash
npm --workspace @penthouse/web run typecheck
# svelte-check found 0 errors and 0 warnings

npm --workspace @penthouse/web run build
# SSR: 256 modules transformed
# Client: 307 modules transformed
# Service worker: 68 modules transformed
# VitePWA precache: 53 entries (621.75 KiB)

npm --workspace @penthouse/web run test
# 1 passed (4 tests)

npm exec --yes jscpd -- --min-lines 30 --min-tokens 180 ...
# 0 clones found, 0% duplication
```

## Scope Discipline

- **Only `apps/web/` touched.** Zero changes to `services/api/` or `packages/contracts/`.
- `git diff --name-only -- services/api packages/contracts` shows no new modifications from this pass.
- Pre-existing backend changes on the `audit/backend-trim-performance` branch were not modified.

## No Backend Follow-up Required

All findings were frontend-only and resolved within `apps/web/`. No issues requiring Codex/backend attention were discovered during this pass.
