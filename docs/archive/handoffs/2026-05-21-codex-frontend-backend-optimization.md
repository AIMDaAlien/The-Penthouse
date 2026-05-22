# Agent Handoff — Codex: Frontend Final Pass + Backend Optimization

**Date:** 2026-05-21
**From:** Kimi K2.6 (lead orchestrator)
**To:** Codex (backend optimizer + frontend final reviewer)
**Scope:** Double-check frontend for lingering issues, then deep backend optimization pass

---

## What Kimi Just Shipped

Two commits on `main`:

### Commit 1: `9e62696` — Surgical Bug Fixes
- **5 memory leaks fixed:** PTT listeners, chat timers, socket AFK tracking, MessageComposer typing timer, presence store (deleted)
- **2 broken reactivity bugs fixed:** GifPicker search (never updated), ChatListItem deriveds (`$derived` vs `$derived.by`)
- **12 dead files deleted:** 2 stores, 7 components, 3 utility files

### Commit 2: `a611143` — Performance Optimizations
- **Chat page props:** `EMPTY_MAP` constant, hoisted `orderedMessageIds` $derived, `chatType` from `rootChat?.type`
- **Emoji data split:** 599-line dataset → `emoji-data-common.ts` (100 entries) + `emoji-data-full.ts` (566 entries) + barrel re-export
- **Svelte 5 consistency:** `onMount` → `$effect` in 6 files
- **Avatar dedup:** inline SVG noise → `var(--tex)` CSS custom property

**Verification:** Web typecheck 0 errors, tests 21 pass, build clean. API tests 189 pass.

---

## Part A: Frontend Final Pass (Codex Review)

Kimi did a systematic audit but may have missed edge cases. Please review:

### A1. Check for Remaining Memory Leaks
Search for these patterns across `apps/web/src/`:
- `addEventListener` without matching `removeEventListener` (especially in `$effect` without cleanup return)
- `setTimeout`/`setInterval` without `clearTimeout`/`clearInterval` on unmount
- Module-level event listeners (outside `$effect` or `onMount`)
- `IntersectionObserver` without `.disconnect()`

**Files to prioritize:**
- `lib/components/MediaComposer.svelte` — file input, paste handlers
- `lib/components/AudioRecorder.svelte` — media stream, recorder cleanup
- `lib/components/ChatMembersModal.svelte` — modal lifecycle
- `routes/settings/+page.svelte` — form change handlers

### A2. Check for Remaining Dead Code
Run these checks:
```bash
cd apps/web/src
# Exports never imported
grep -r "export " lib/stores/ | grep -v ".svelte.ts:"
grep -r "export " lib/utils/ | grep -v ".test.ts:"
# Components never used in routes
for f in lib/components/*.svelte; do name=$(basename "$f" .svelte); grep -rq "$name" routes/ || echo "UNUSED: $f"; done
```

### A3. Check for Legacy Svelte 4 Patterns
- `$:` reactive statements that should be `$derived` or `$effect`
- `beforeUpdate` / `afterUpdate` usage
- `createEventDispatcher` (should use callback props in Svelte 5)

### A4. Bundle Size Quick Check
```bash
cd apps/web && npm run build
# Check precache size — should be ~52 entries, ~620 KiB
```
If precache is significantly larger, investigate what bloated it.

---

## Part B: Backend Optimization (Codex Primary Task)

**Leave frontend alone unless you find real bugs.** Focus on the API.

### B1. Dead Code Audit
```bash
cd services/api/src
# Exports never imported
for f in $(find . -name "*.ts" -not -path "*/node_modules/*"); do
  rel=${f#./}
  base=$(basename "$rel" .ts)
  # Skip index files and test utilities
  [[ "$base" == "index" ]] && continue
  [[ "$rel" == *test* ]] && continue
  grep -rq "from.*$base" . || grep -rq "import.*$base" . || echo "MAYBE DEAD: $rel"
done
```

**Known candidates to verify:**
- `utils/users.ts` — after `hashPassword`/`verifyPassword` removal, what's left? Is all of it used?
- `utils/security.ts` — `createRecoveryCode`, `createInviteCode`, `createTemporaryPassword` — are all used?
- Any orphaned migration files or schema modules?

### B2. Database Query Optimization
Review these patterns:
- **N+1 queries** in chat/message/list routes — any route that loads messages then queries per-message data?
- **Missing indexes** — check `src/db/schema.ts` for foreign keys without indexes, frequently filtered columns without indexes
- **Over-selecting** — any `select *` equivalent in Drizzle that fetches columns never used?

**Priority files:**
- `src/routes/chats.ts` — message list, chat list, search
- `src/routes/users.ts` — user list, presence queries
- `src/routes/messages.ts` — send, edit, delete, history

### B3. Route Handler Efficiency
- **Large JSON responses** — any route that serializes huge arrays without pagination?
- **Missing early returns** — any validation that happens AFTER DB queries?
- **Redundant auth checks** — any middleware double-checking what a preHandler already verified?

### B4. Socket Event Optimization
- **Event payload size** — any socket events carrying full objects when only IDs needed?
- **Broadcast scope** — any `io.emit()` that should be `to(room).emit()`?
- **Ack timeouts** — any socket handlers doing heavy work without ack deadline?

Review: `src/realtime/socket.ts`, `src/realtime/handlers/*.ts`

### B5. Test Quality
- **Slow tests** — any test taking >2s? Run with `npm test -- --reporter=spec` to see durations
- **Flaky tests** — any with race conditions, timing-dependent assertions?
- **Missing coverage** — any critical route without a test?

---

## Constraints

- **3-file rule** per change batch (code patches only; docs/tests/deletions don't count)
- **Must pass:** `npm --workspace @penthouse/api run typecheck` and `npm --workspace @penthouse/api run test`
- **Must pass:** `npm --workspace @penthouse/web run typecheck` and `npm --workspace @penthouse/web run build`
- **Don't touch:** `apps/web/src/lib/prototypes/` (already deleted), auth flow core logic, socket connection/auth core

---

## Current Test State

| Command | Status |
|---------|--------|
| `npm --workspace @penthouse/web run typecheck` | 0 errors |
| `npm --workspace @penthouse/web run test` | 21 pass |
| `npm --workspace @penthouse/web run build` | clean, 52 entries / 621 KiB |
| `npm --workspace @penthouse/api run typecheck` | 0 errors |
| `npm --workspace @penthouse/api run test` | 189 pass |

---

## Contact

If you find frontend bugs that need Kimi context (Svelte 5 runes, store architecture), pause and hand back with `docs/AGENT-HANDOFF-KIMI-*.md`.

Good hunting.
