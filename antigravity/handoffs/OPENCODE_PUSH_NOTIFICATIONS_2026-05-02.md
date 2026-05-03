# Codex Handoff — Push Notifications Backend (Phase 1)

**Date:** 2026-05-02
**From:** Claude (Sonnet/Opus, owns `apps/web/`)
**To:** Codex (GPT-5.4, owns `services/api/`, `infra/`, `packages/contracts/`)
**Branch:** `main`
**Target version:** v2.1.0-alpha.2 (push notifications)
**Plan reference:** in-conversation plan locked 2026-05-02 (TodoWrite tasks 1–9)

---

## Why this work

Current SvelteKit PWA at `apps/web/` has zero push code. The legacy v2.0 line had FCM-for-Android proven, but the v2.1 web rebuild needs a fresh, standards-based Web Push pipeline.

Decisions locked with Aim (do not redesign without checking back):

- **Transport: VAPID Web Push** — self-hosted, no Google account in the loop. Same code path serves Chrome (FCM-under-the-hood), Firefox (Mozilla autopush), Safari (APNs).
- **Permission timing:** soft banner on first chat-list view (Claude's job — frontend).
- **Scope:** default = DM + @mention. Per-chat configurable: off / mentions / all.
- **DND:** server-authoritative quiet hours with **IANA timezone** stored, plus client-side filter as defense-in-depth. Per-chat DND-override flag.
- **Payload privacy:** toggleable in Settings, default = metadata-only. Frontend will send the choice to the backend; backend send pipeline must respect it.

---

## Your scope — three tasks, all under 3-file rule

### Task 1 — VAPID key infra + env scaffolding

**Files (max 3):**
- `services/api/.env.example`
- `infra/.env.example`
- `infra/docker-compose.yml`

**Do:**
1. Add three env vars (use placeholder values in `.env.example`, real ones go in untracked `.env`):
   ```
   VAPID_PUBLIC_KEY=<base64url ECDSA P-256 public key>
   VAPID_PRIVATE_KEY=<base64url ECDSA P-256 private key>
   VAPID_SUBJECT=mailto:admin@<your-domain>
   ```
2. Generate the actual keypair locally with:
   ```bash
   npx web-push generate-vapid-keys --json
   ```
   Store the real values in your local `.env` and the Unraid stack `.env` (NOT in `.env.example`). Coordinate with Aim on putting them into the deployed Unraid environment.
3. Pass the three env vars through to the API container in `infra/docker-compose.yml` (under `services.api.environment`).
4. Public key must be exposed to the frontend at build time — add `PUBLIC_VAPID_PUBLIC_KEY` to `apps/web/.env.example` as well (this one can be the same value as `VAPID_PUBLIC_KEY`; the SvelteKit `PUBLIC_` prefix makes it client-readable). **This is a fourth file** — if 3-file rule blocks it, split into a follow-up task and flag.

**Acceptance:**
- `cd services/api && npm run dev` starts without "missing VAPID_PUBLIC_KEY" warnings (assumes you've also added env reading in task 2 below — coordinate the two tasks).
- `docker compose config` shows the three vars wired into the api service.

---

### Task 2 — Push subscription schema + endpoints + contracts

**Files (max 3):**
- `services/api/src/db/migrations/NNNN_push_notifications.sql` (new migration, NNNN = next number)
- `services/api/src/routes/push.ts` (new route file — register in your existing route loader)
- `packages/contracts/src/push.ts` (new schema file — re-export from contracts barrel)

**Schema (in the migration):**

```sql
CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

CREATE TABLE notification_prefs (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  scope_default TEXT NOT NULL DEFAULT 'dm_and_mention'
    CHECK (scope_default IN ('off', 'dm_only', 'dm_and_mention', 'all')),
  payload_privacy TEXT NOT NULL DEFAULT 'metadata'
    CHECK (payload_privacy IN ('metadata', 'full')),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,                  -- e.g. '22:00:00'
  quiet_hours_end TIME,                    -- e.g. '07:00:00'
  quiet_hours_tz TEXT,                     -- IANA: 'America/New_York'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_notification_overrides (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  scope TEXT NOT NULL
    CHECK (scope IN ('off', 'mentions_only', 'all')),
  dnd_override BOOLEAN NOT NULL DEFAULT false,  -- true = bypass quiet hours
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);
```

> **Confirm before applying:** verify the actual table name for chats in your current schema (`chats` vs `conversations` vs `rooms` — adjust the FK accordingly). Same for `users`.

**Endpoints in `routes/push.ts`:**

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/push/subscribe` | `{endpoint, keys: {p256dh, auth}, userAgent?}` | 201 |
| DELETE | `/push/subscribe` | `{endpoint}` | 204 |
| GET | `/push/preferences` | — | full prefs object |
| PATCH | `/push/preferences` | partial prefs | updated prefs |
| GET | `/push/chats/:chatId` | — | `{scope, dnd_override}` |
| PATCH | `/push/chats/:chatId` | `{scope?, dnd_override?}` | updated override |
| DELETE | `/push/chats/:chatId` | — | 204 (revert to default) |

All require authenticated session (use existing auth middleware). Validate IANA TZ on PATCH `/preferences` — if unknown TZ, 400.

**Contracts (`packages/contracts/src/push.ts`):**

Zod schemas for all request/response shapes. Export `PushSubscription`, `NotificationPrefs`, `ChatNotificationOverride`, plus the `Scope` and `PayloadPrivacy` enums. Frontend will import these.

**Acceptance:**
- Migration runs clean against a fresh DB.
- All seven endpoints respond correctly with smoke tests.
- `cd packages/contracts && npm run build` succeeds.

---

### Task 3 — Push send pipeline + DND + scope filter

**Files (max 3):**
- `services/api/src/lib/push/send.ts`
- `services/api/src/lib/push/dnd.ts`
- `services/api/src/lib/push/scope.ts`

(If you need a fourth file to wire the trigger into the existing message-send flow, that's a follow-up task — flag it.)

**`send.ts`:**
- Use `web-push` npm package. Initialize once with VAPID env vars.
- Public function: `sendPushToUser(userId, payload)`.
- Loops over user's subscriptions, sends via `webpush.sendNotification(sub, JSON.stringify(payload))`.
- **On 410 Gone or 404:** delete the subscription row (it's expired/revoked).
- **On 429 or 5xx:** log and continue, don't block other subs.
- Encrypted payload happens automatically inside `web-push`, you just pass the JSON.

**`dnd.ts`:**
- Function: `isInQuietHours(prefs: NotificationPrefs, now: Date = new Date()): boolean`.
- If `!prefs.quiet_hours_enabled` → return false.
- Compute "current time in user's IANA TZ" using `Intl.DateTimeFormat('en-US', {timeZone: prefs.quiet_hours_tz, hour12: false, ...})` and parse the hour/minute. **Do not use luxon unless already a dep** — Intl is sufficient.
- Handle wrap-around: `start=22:00, end=07:00` means quiet hours span midnight. The check is: `(now >= start) || (now < end)` for wrap, `(now >= start) && (now < end)` for non-wrap.
- **Edge case:** if TZ string is invalid, `Intl.DateTimeFormat` throws — catch and return false (fail open, do not silently muzzle pushes).

**`scope.ts`:**
- Function: `shouldSendPush(args: {userId, chatId, isMention, isDm}): Promise<boolean>`.
- Steps:
  1. Load user's `notification_prefs`. If `!enabled` → false.
  2. Load `chat_notification_overrides` row for (userId, chatId). If exists, use override's `scope`. Else use `scope_default`.
  3. Apply scope:
     - `off` → false
     - `dm_only` → `isDm`
     - `mentions_only` → `isMention`
     - `dm_and_mention` → `isDm || isMention`
     - `all` → true
  4. Check existing chat mute (your existing chat-mute table) — if muted AND no `dnd_override`, false.
  5. Check `isInQuietHours(prefs)` — if quiet AND no `dnd_override`, false.
  6. Otherwise true.

**Hook into message send:**

In your existing message-send handler, after the message is persisted and broadcast via Socket.IO, for each recipient:
```ts
if (await shouldSendPush({userId, chatId, isMention, isDm})) {
  const payload = buildPayload(message, recipientPrefs.payload_privacy);
  await sendPushToUser(userId, payload);
}
```

**Payload shape (must match the frontend service worker's parser — coordinate the contract):**
```ts
type PushPayload = {
  v: 1;                       // schema version
  type: 'message';
  chatId: string;
  messageId: string;
  // metadata mode: only senderName + chatName
  // full mode: also `body` and `senderAvatar`
  senderName: string;
  chatName: string;
  body?: string;              // omitted in metadata mode
  senderAvatar?: string;      // omitted in metadata mode
};
```

**Acceptance:**
- Manual test: subscribe a browser, send a DM from another account, push arrives within 2s.
- Quiet hours test: set quiet 00:00–23:59 in your TZ, send DM, push does NOT arrive.
- Per-chat off override: set chat to `off`, send DM, push does NOT arrive.

---

## Coordination notes

- **Do not touch `apps/web/`** — Claude owns it. Frontend tasks 4–9 wait on your three.
- **Once tasks 1–3 land on `main`:** post a one-liner in this same packet (append a "DONE" section at the bottom) so Claude knows to start the frontend work.
- **Schema deviations:** if you discover a constraint that requires changing the schema (e.g., `chats` is named `conversations` in the current DB), fix it in your migration and note the change in the DONE section. Do not silently rename Zod fields — coordinate.
- **Failures or scope creep:** stop and update this packet with a "BLOCKERS" section. Don't ship a half-baked attempt.

---

## Out of scope for this packet

- Frontend SW, banner, Settings UI, per-chat menu (Claude's tasks 4–9).
- iOS APNs key (browser handles APNs invisibly via VAPID — no Apple Developer enrollment needed for Web Push).
- Notification batching ("5 new messages") — explicitly deferred per Aim's pick of v1 simplicity.
- Backfill: existing users start with default `notification_prefs` lazily on first push interaction.

---

## DONE / BLOCKERS

(Codex appends here when work lands or stalls.)

### DONE - 2026-05-03 Codex foundation slice

- Implemented VAPID env schema support plus Web Push foundation tables, contracts, and `/api/v1/push/...` endpoints in the working tree. Commit SHA pending.
- Schema deviation from original packet: `users.id` and `chats.id` are UUIDs in the live schema, so `push_subscriptions.user_id`, `notification_prefs.user_id`, and `chat_notification_overrides.{user_id,chat_id}` use UUID FKs instead of BIGINT.
- Endpoint convention deviation from packet shorthand: routes are under `/api/v1/push/...`.
- Added focused contract and integration coverage for subscription register/update/delete, preference defaults/update/invalid timezone, chat override defaults/update/delete, auth, and membership checks.
- Verified `packages/contracts` build, API typecheck, API test suite, focused DB-backed integration push test, clean migration through `027_push_notifications.sql`, and production Compose config.
- Unraid env vars Aim needs to set before live browser push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

### DONE - 2026-05-03 Codex send-pipeline slice

- Implemented the backend Web Push sender with VAPID initialization, DND checks, scope filtering, payload privacy, and stale subscription cleanup on `404`/`410`. Commit SHA pending.
- Wired Web Push sends after persisted chat messages and poll messages while leaving the legacy FCM sender untouched.
- Added the `web-push` API workspace dependency and focused tests for payload contracts, DND windows, scope behavior, metadata/full payloads, quiet hours, per-chat off overrides, and stale subscription removal.
- Verified `packages/contracts` build, API typecheck, full API test suite, and focused DB-backed push integration tests with a mocked Web Push sender.
- Remaining live proof: Claude still needs to land the frontend service worker/subscription UI, then the deployed Unraid API needs real `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` before browser delivery can be validated.
