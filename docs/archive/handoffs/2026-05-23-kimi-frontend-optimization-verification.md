# Frontend Optimization — Second-Round Verification Report

Date: 2026-05-23
Scope: Verify all Phase 1–3 changes, hunt edge cases, document additional findings

---

## Verification Performed

### 1. Zero stale references to removed files

Searched entire `apps/web/src/` for any imports or references to all 8 removed files:

| Removed file | Stale references found |
|--------------|------------------------|
| `build-logo-gallery.mjs` | None ✅ |
| `MediaComposer.svelte` | None ✅ |
| `MediaComposer.utils.ts` | None ✅ |
| `MediaComposer.utils.test.ts` | None ✅ |
| `settings.svelte.ts` | None ✅ |
| `sync/queries.ts` | None ✅ |
| `emoji-data-common.ts` | None ✅ |
| `messageFormat.ts` | None ✅ |

Also verified no references in:
- `vite.config.ts`, `svelte.config.js`, `vitest.config.ts` ✅
- `package.json` scripts ✅
- E2E test files ✅
- `.svelte-kit/` build output (after fresh purge + rebuild) ✅

### 2. All consumers of modified files verified

| Modified file | Consumers checked | Status |
|---------------|-------------------|--------|
| `push/subscribe.ts` (removed aliases) | `PushPermissionBanner.svelte`, `PushSettings.svelte` | Both import `subscribeToPush`/`unsubscribeFromPush` directly. Aliases were unused. ✅ |
| `themes.ts` (removed `tokensFor`) | All Svelte components | Zero imports of `tokensFor`. Theme consumers access `theme.dark`/`theme.light` directly. ✅ |
| `emoji-data.ts` (deduplicated) | `EmotePicker.svelte`, `EmojiEmoteAutocomplete.svelte` | Both import `searchNativeEmoji` and `NATIVE_EMOJI`. `NATIVE_EMOJI` now points to full dataset. First 60 displayed emojis unchanged (common was a subset of full). Search now queries 591 unique entries instead of 702 with 111 duplicates — behavior improved. ✅ |

### 3. Dependency removal verified

| Removed dep | Runtime impact | Status |
|-------------|----------------|--------|
| `@types/dompurify` | `dompurify` v3.4.2 ships its own types. `MarkdownText.svelte` imports `DOMPurify` — typecheck passes. ✅ |
| `@testing-library/svelte` | Zero usage in any test. Vitest config doesn't reference it. Tests pass. ✅ |
| `playwright-lighthouse` | Zero script/test references. ✅ |
| `web-vitals` | Zero source imports. ✅ |

`npm install` executed: **removed 183 transitive packages**, 0 vulnerabilities. `package-lock.json` updated (-2,791 net lines).

### 4. Full validation after `npm install`

```bash
npm --workspace @penthouse/web run typecheck   # 0 errors, 0 warnings ✅
npm --workspace @penthouse/web run build       # SSR 256 / client 307 modules ✅
npm --workspace @penthouse/web run test        # 4/4 passed ✅
npm exec --yes jscpd -- ...                    # 0 clones, 0% duplication ✅
```

---

## Additional Findings (Second Round)

### Finding A: `lib/utils/emotes.ts` — genuinely unused

Knip correctly flagged this file. **It is NOT imported anywhere.**

However, the same logic exists inlined in `MarkdownText.svelte`:

```svelte
<!-- MarkdownText.svelte lines 21-28 -->
function replaceEmotes(raw: string): string {
    if (!emotes.length) return raw;
    const emoteMap = new Map(emotes.map((e) => [e.name, e.url]));
    return raw.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
        const url = emoteMap.get(name);
        if (!url) return match;
        return `<img src="${escapeHtml(url)}" alt=":${escapeHtml(name)}:" class="inline-emote" width="20" height="20" loading="lazy" />`;
    });
}
```

Compare with `lib/utils/emotes.ts`:
```typescript
export function replaceEmotesInText(text: string, emotes: Array<{ name: string; url: string }>): string {
    if (!emotes.length) return text;
    const emoteMap = new Map(emotes.map((e) => [e.name, e.url]));
    return text.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
        const url = emoteMap.get(name);
        if (!url) return match;
        return `<img src="${escapeHtml(url)}" alt=":${escapeHtml(name)}:" class="inline-emote" width="20" height="20" />`;
    });
}
```

**Difference:** `MarkdownText.svelte` adds `loading="lazy"`. Otherwise identical.

**Assessment:** `lib/utils/emotes.ts` is dead code. The emote replacement logic is duplicated inline in `MarkdownText.svelte`. Either:
- Remove `lib/utils/emotes.ts` and leave the inline logic as-is, OR
- Refactor `MarkdownText.svelte` to import from `lib/utils/emotes.ts` (and add `loading="lazy"` to the utility).

**Recommendation:** Leave for now. This is a small refactor opportunity, not a cleanup requirement. The inline version has the superior implementation (`loading="lazy"`).

### Finding B: `shouldSuppressPush` — unwired push suppression logic

`lib/push/payload.ts` exports `shouldSuppressPush(payload, currentChatId)` which determines whether to suppress a push notification when:
- The scope is `dm_only` and the chat is not a DM
- The user is currently viewing the chat that received the message

The service worker (`service-worker.ts`) imports `parsePushPayload`, `buildNotificationTitle`, `buildNotificationBody` from the same file but **does NOT import `shouldSuppressPush`**. Push notifications are currently always shown regardless of scope or current chat.

**Assessment:** This is a missing feature, not dead code in the traditional sense. The function is part of a designed push privacy system but the service worker hasn't been wired to use it. Removing it would discard intentionally-designed logic.

**Recommendation:** Leave in place. If push suppression is desired, the service worker should be updated to call `shouldSuppressPush` before `showNotification`.

### Finding C: `listLocalMessages` in `sync/search.ts` — genuinely unused

Exported from `sync/search.ts` but never imported by any file. Not referenced by E2E tests either (they import `searchLocalMessages` instead).

**Assessment:** Safe to remove, but it's a harmless exported function that might be part of the intended local-first sync API surface. `searchLocalMessages` is the actively-used variant.

**Recommendation:** Leave for now. Low value removal.

### Finding D: Socket store action helpers — unwired convenience exports

`lib/stores/socket.svelte.ts` exports three convenience wrappers that are not imported anywhere:
- `updatePresence(state, note?)` — wraps `socketStore.setPresence()`
- `sendMessage(payload)` — wraps `socketStore.emit('message.send', payload)`
- `joinPresence()` — wraps `socketStore.emit('presence.join', {})`

All components that use these actions call `socketStore.emit()` or `socketStore.setPresence()` directly.

**Assessment:** These are thin, recreatable wrappers. They don't enable any functionality that isn't already accessible. However, they define a cleaner public API than raw `emit()` calls.

**Recommendation:** Leave for now. They provide a discoverable API surface for future component work.

---

## Edge Cases Checked

| Edge case | Checked | Result |
|-----------|---------|--------|
| SvelteKit alias resolution (`$lib/`, `$utils/`, etc.) | ✅ | All aliases resolve correctly after removals |
| Emoji picker default display (60 items) | ✅ | First 60 items identical between old common and new full dataset |
| Emoji search behavior | ✅ | Now searches 591 unique entries instead of 702 with duplicates — same or better results |
| Service worker build | ✅ | `service-worker.mjs` generated successfully (20.08 KB) |
| PWA precache entries | ✅ | 53 entries (621.74 KiB), consistent with before |
| `sql-wasm` lazy loading | ✅ | Still loaded only in Web Worker, not on initial boot |
| Transitive dependency breakage | ✅ | `npm install` removed 183 packages, 0 vulnerabilities, all tests pass |
| `.svelte-kit` stale artifacts | ✅ | Purged and rebuilt — no stale references in fresh output |
| `data-density` CSS attribute | ✅ | Zero CSS references to `data-density` — removing `settings.svelte.ts` safe |

---

## Conclusion

All Phase 1–3 changes are **verified safe and correct**. No regressions detected. No stale references found. Build, typecheck, and tests all pass after `npm install`.

The only additional cleanup opportunities discovered are:
1. `lib/utils/emotes.ts` — dead, duplicated in `MarkdownText.svelte`
2. `shouldSuppressPush` — unwired feature in service worker
3. `listLocalMessages` — unused export
4. Three socket store convenience wrappers — unused exports

None of these are urgent or high-value. The current state is clean and ready for the next phase of work.
