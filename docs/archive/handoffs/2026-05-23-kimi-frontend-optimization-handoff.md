# Agent Handoff: Codex -> Kimi - Frontend Optimization Follow-Up

Date: 2026-05-23
Repo: `/Users/aim/Documents/The Penthouse`
Source branch: `audit/backend-trim-performance`
Recipient: Kimi
Scope: Frontend-only optimization, cleanup, and validation. Do not edit backend code unless a frontend contract bug proves it is necessary and Aim approves the scope change.

## Purpose

Codex completed the backend trim/performance pass and intentionally left frontend findings untouched. This handoff packages the frontend evidence from that pass into a Kimi-ready optimization brief.

This is not a broad redesign request. Treat it as a skeptical frontend cleanup and performance pass: verify actual runtime usage first, remove or refactor only what is proven safe, and preserve user-visible behavior.

## Current Baseline Evidence

Latest validation from the backend audit branch:

```bash
npm run typecheck
# passed across web, API, and contracts

npm --workspace @penthouse/web run build
# passed
# SSR build: 257 modules transformed
# client build: 308 modules transformed
# service worker build: 68 modules transformed
# VitePWA precache: 53 entries (627.53 KiB)
# notable generated asset: sql-wasm-UFUCzYNW.wasm 659.73 kB, gzip 323.01 kB
```

Static-analysis commands:

```bash
npm exec --yes knip -- --no-progress --workspace apps/web --workspace services/api --workspace packages/contracts
```

Result: exits `1`. Backend cleanup findings from the audit are gone; remaining actionable frontend items are listed below.

```bash
npm exec --yes jscpd -- --min-lines 30 --min-tokens 180 --reporters console --format typescript --ignore "**/node_modules/**" --ignore "**/dist/**" --ignore "**/.svelte-kit/**" services/api/src packages/contracts/src apps/web/src
```

Result: exits `0`; frontend-only duplication remains:

- Files analyzed: `94`
- Total lines: `13,897`
- Total tokens: `158,127`
- Clones found: `2`
- Duplicated lines: `137 (0.99%)`
- Duplicated tokens: `3,189 (2.02%)`

## Guardrails

- Keep this pass frontend-only: `apps/web/**` and docs only.
- Do not remove local-first sync, push, media composer, voice/WebRTC, or prototypes just because `knip` flags them. Confirm runtime intent first.
- Do not touch `services/api/**`, `packages/contracts/**`, migrations, deployment files, or lockfile backend dependency state unless Aim explicitly expands scope.
- Keep public routes, auth flow, chat flow, PWA install behavior, and local-first/offline behavior stable.
- If a finding is an intentional future seam, document it instead of deleting it.

## Findings To Investigate

### 1. Frontend unused files from `knip`

Verify these before deleting. Some may be stale; some may be future seams or manually imported by generated/runtime code.

| File | Initial read | Suggested classification |
| --- | --- | --- |
| `apps/web/scripts/build-logo-gallery.mjs` | Script appears unused by package scripts. | Safe if no manual release/icon workflow depends on it. |
| `apps/web/src/lib/components/MediaComposer.svelte` | Component-level media composer may be stale after chat composer changes. | Needs runtime confirmation. Search rendered chat/composer paths before deleting. |
| `apps/web/src/lib/stores/settings.svelte.ts` | Store not statically imported. | Needs runtime confirmation; could be replaced by newer appearance/settings store. |
| `apps/web/src/lib/sync/queries.ts` | Duplicates logic with sync/search and may be stale. | Needs runtime confirmation; likely cleanup or merge candidate. |
| `apps/web/src/lib/utils/emotes.ts` | Emoji/emote helper not statically imported. | Product decision if custom emotes are planned. |
| `apps/web/src/lib/utils/messageFormat.ts` | Message formatting helper not statically imported. | Needs runtime confirmation; likely stale if render path uses another formatter. |

Intent: reduce maintenance surface and bundle risk, but avoid deleting future-facing UI paths without proof.

### 2. Dependency candidates

`knip` flagged these dependencies:

- `mediasoup-client`
- `@testing-library/svelte`
- `@types/dompurify`
- `playwright-lighthouse`
- `web-vitals`

Suggested handling:

- `mediasoup-client`: product/runtime decision. If voice/WebRTC UI is not wired yet, either keep and document the future seam or move it behind a feature-specific import. Do not remove blindly if near-term call/media work expects it.
- `@testing-library/svelte`: remove only if no current or planned Svelte component tests use it. If the frontend test strategy should include component tests, keep it and add an actual test.
- `@types/dompurify`: likely removable if `dompurify` ships its own types in the installed version. Confirm with `npm --workspace @penthouse/web run typecheck` after removal.
- `playwright-lighthouse`: likely stale unless there is a performance audit script outside package scripts. If removed, replace with a documented Lighthouse command or keep as explicit tooling.
- `web-vitals`: likely stale unless runtime web-vitals reporting is planned. Remove or wire intentionally.

Intent: reduce install/build/test noise, not strip planned product capabilities by accident.

### 3. Duplicate code from `jscpd`

Clone group 1:

- `apps/web/src/lib/utils/emoji-data-common.ts`
- `apps/web/src/lib/utils/emoji-data-full.ts`

Likely optimization:

- Confirm whether both datasets are necessary at runtime.
- If both are needed, factor shared search/indexing logic without merging the datasets into one eager import.
- If only one dataset is used, remove the other and its re-export.

Clone group 2:

- `apps/web/src/lib/sync/queries.ts`
- `apps/web/src/lib/sync/search.ts`

Likely optimization:

- Confirm which sync module is the canonical local-first query surface.
- Extract shared row mapping/query helpers or delete the stale path.
- Keep local-first sync response shapes unchanged.

Intent: reduce duplicate logic where behavior can drift, especially in local search/sync.

### 4. Unresolved E2E imports

`knip` reported unresolved imports in `apps/web/e2e/local-sync.spec.ts`:

- `/src/lib/sync/db-client.ts`
- `/src/lib/sync/search.ts`

This looks like stale Vite alias usage or test code that was written against an older sync module shape.

Suggested handling:

- Inspect `apps/web/e2e/local-sync.spec.ts` before changing sync code.
- Decide whether this test should import through `$lib/...`, relative paths, or exercise the browser-visible local-sync behavior only.
- If the test is obsolete, rewrite it around the current runtime path rather than preserving fake imports.

Intent: make local-first test coverage tell the truth. A passing build with stale E2E imports is a trap.

### 5. Unused exports and duplicate push aliases

`knip` flagged frontend unused exports including:

- Push helpers in `apps/web/src/lib/push/payload.ts` and `apps/web/src/lib/push/subscribe.ts`
- Socket store helpers in `apps/web/src/lib/stores/socket.svelte.ts`
- Sync helpers in `apps/web/src/lib/sync/operations.ts`, `outbox.ts`, and `search.ts`
- Theme helper `tokensFor`
- Emoji search exports and re-exports
- Duplicate exports: `subscribeToPush|subscribe`, `unsubscribeFromPush|unsubscribe`

Suggested handling:

- For push, verify the UI and service worker path before deleting helpers. Browser push often has indirect/manual flows that static analysis misses.
- For socket store helpers, confirm whether they are intended API surface for components or leftovers from an older store shape.
- For duplicate push aliases, pick one public name if both are not required by call sites.
- For sync helpers, decide whether local-first sync is shadow-mode, production-mode, or abandoned. Then trim accordingly.

Intent: shrink the frontend API surface so future agents do not build on stale helper names.

### 6. Bundle/performance questions

The build is green, but the output points to areas worth checking:

- `sql-wasm-UFUCzYNW.wasm` is `659.73 kB` (`323.01 kB gzip`). Confirm it is loaded only when local-first IndexedDB/SQL.js is needed, not on first paint for unauthenticated/auth/chat shell routes.
- Confirm prototype routes and prototype libraries are not statically imported into production chat/auth/settings routes.
- Confirm any mediasoup client code is lazily loaded behind call/media UI, if the dependency remains.
- Check whether emoji datasets are eagerly imported into chat boot. If yes, prefer lazy search/index loading or a smaller common dataset for first paint.

Suggested commands:

```bash
rg -n "sql-wasm|initSqlJs|mediasoup-client|from '\\$lib/prototypes|from '\\$routes/prototypes|emoji-data-full|emoji-data-common" apps/web/src
npm --workspace @penthouse/web run build
```

Intent: protect initial load and chat boot. The goal is less eager weight, not smaller code for its own sake.

## Suggested Work Order

1. Fix or rewrite the stale `local-sync.spec.ts` imports so the E2E suite reflects the current runtime modules.
2. Audit local-first sync imports and SQL.js loading. Confirm whether the WASM path is lazy enough.
3. Resolve the `sync/queries.ts` and `sync/search.ts` duplication after deciding which path is canonical.
4. Audit emoji/emote data imports and remove or lazy-load unused/heavy paths.
5. Review `MediaComposer.svelte`, `messageFormat.ts`, and `settings.svelte.ts` against current rendered UI and remove only proven-dead files.
6. Review dependency candidates one by one with before/after typecheck/build/test proof.
7. Clean up push/socket/theme unused exports after confirming public component/store contracts.

## Required Validation

Minimum for any frontend cleanup PR:

```bash
npm --workspace @penthouse/web run typecheck
npm --workspace @penthouse/web run build
npm --workspace @penthouse/web run test
npm exec --yes knip -- --no-progress --workspace apps/web --workspace services/api --workspace packages/contracts
npm exec --yes jscpd -- --min-lines 30 --min-tokens 180 --reporters console --format typescript --ignore "**/node_modules/**" --ignore "**/dist/**" --ignore "**/.svelte-kit/**" services/api/src packages/contracts/src apps/web/src
git diff --name-only -- services/api packages/contracts
```

For sync, chat, media, push, or route-level changes, also run targeted browser proof:

```bash
npm --workspace @penthouse/web run test:e2e -- --project=chromium --reporter=list
```

If dependency removal changes `package-lock.json`, also run:

```bash
npm install
npm audit --json
npm run typecheck
```

## Deliverable Requested From Kimi

Return a concise report with:

- Files removed or retained, with reasoning.
- Dependencies removed or intentionally kept, with reasoning.
- Before/after `knip` and `jscpd` summaries.
- Bundle/build observations, especially SQL.js, emoji data, mediasoup, and prototype imports.
- Exact validation commands and results.
- Any frontend findings that require Codex/backend follow-up.

