# Feature Parity Audit — The Penthouse v4 vs v3 (Incumbent)

**Audit date:** 2026-05-08
**Auditor:** Kimi K2.6
**Basis:** Full codebase scan + ADRs + contracts + handoff docs + actual implementation files
**Incumbent reference:** v2.1.0-alpha.1 (29 migrations, raw `pg`, Socket.IO, SvelteKit PWA)

---

## Shipped in v4 — Working End-to-End

### Authentication & Identity
| Feature | Backend Route | Frontend | Notes |
|---|---|---|---|
| Register with invite code | `POST /api/v1/auth/register` | `/auth` | Altcha challenge, auto-joins general channel |
| Login | `POST /api/v1/auth/login` | `/auth` | |
| Token refresh + rotation | `POST /api/v1/auth/refresh` | `api.ts` auto-refresh | Rotation with `rotatedToTokenHash` audit |
| Logout + session revoke | `POST /api/v1/auth/logout` | Settings | Revokes refresh token + session device |
| Password change | `PATCH /api/v1/auth/password` | Settings | |
| Password reset (recovery code) | `POST /api/v1/auth/reset-password` | `/auth` | |
| Get/update profile | `GET/PATCH /api/v1/auth/me` | Settings | `displayName`, `bio`, `timezone`, `avatarUploadId` |
| Test notice acceptance | Handled at registration | `/auth` | |

### Users & Directory
| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| User list (paginated) | `GET /api/v1/users` | User directory | |
| User search by display name | `GET /api/v1/users/search` | User directory | |
| Presence (online/offline) | `presence.update`, `presence.sync` | User directory | Green dot + "Online" text |
| Last seen timestamps | `users.lastSeenAt` | User directory | Relative time formatting |

### Messaging Core
| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| DM creation (idempotent) | `POST /api/v1/chats/dm` | User directory | `direct_chats` ordering constraint |
| Chat list with unread counts | `GET /api/v1/chats` | Home page | Includes `archivedAt`, `counterpartAvatarUrl` |
| Message pagination | `GET /api/v1/chats/:id/messages?before=` | Chat page | 50-msg cursor, scroll-position preservation |
| Send text/image/video/audio/gif/file | `message.send` (socket) + `POST /chats/:id/messages` | Composer | All `MessageTypeSchema` values accepted |
| Message editing | `PATCH /api/v1/messages/:id` + `message.edit` (socket) | Chat page | Prompt-based edit, emits `message.edited` |
| Message soft-delete | `DELETE /api/v1/messages/:id` + `message.delete` (socket) | Chat page | `messageDeletions` tombstone table |
| Reply-to messages | `replyToMessageId` + `replyToSnapshot` | Composer + Bubble | |
| Reactions (add/remove) | `message.react/unreact` (socket) + `POST /messages/:id/reactions` | Chat page | Optimistic UI |
| Read receipts | `POST /api/v1/chats/:id/read` + `message.read` (socket) | Chat page | IntersectionObserver, `throughMessageId` semantics |
| Typing indicators | `typing.start/stop` → `typing.update` | Chat page | 3s auto-timeout |
| Message deduplication | `clientMessageId` unique constraint | Outbox store | |
| Outbox / offline queue | — | `outbox.svelte.ts` | Retries on reconnect |
| Mentions | `@username` regex parsing + `mentionedUserIds` in metadata | — | Backend push routing only; no frontend highlight |

### Realtime (Socket.IO)
| Event | Direction | Status |
|---|---|---|
| `chat.join` / `chat.leave` | C→S | ✅ |
| `typing.start` / `typing.stop` | C→S | ✅ |
| `message.send` / `message.ack` | C→S / S→C | ✅ |
| `message.edit` | C→S | ✅ |
| `message.delete` | C→S | ✅ |
| `message.react` / `message.unreact` | C→S | ✅ |
| `message.read` | C→S | ✅ |
| `presence.update` / `presence.sync` | C→S / S→C | ✅ |
| `message.new` / `message.edited` / `message.deleted` | S→C | ✅ |
| `reaction.add` / `reaction.remove` | S→C | ✅ |
| `typing.update` | S→C | ✅ |
| `chat.sync_required` | S→C | ✅ (schema exists, wired) |
| `message.moderated` | S→C | ✅ emitted, but **frontend does NOT handle it** |

### Push Notifications
| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| VAPID key distribution | `GET /api/v1/push/vapid-key` | Push subscription flow | |
| Subscribe/unsubscribe | `POST/DELETE /api/v1/push/subscribe` | Service worker | |
| Global notification prefs | `GET/PATCH /api/v1/notifications/preferences` | PushSettings component | Scope + privacy + quiet hours |
| Per-chat overrides | `GET/PATCH /api/v1/notifications/overrides/:chatId` | PushSettings component | `scope`, `dndOverride` |
| Scope filtering | `shouldNotifyByScope` in `push/send.ts` | — | `off`, `dm_only`, `dm_and_mention`, `mentions_only`, `all` |
| Payload privacy levels | `buildPayload` in `push/send.ts` | — | `private`, `metadata`, `full` |
| Quiet hours enforcement | `isInsideQuietHours` | — | Overnight-aware, timezone-aware |
| Delivery tracking | `pushNotifications` table | — | Success/failure logging |
| Stale subscription cleanup | 410/404 auto-delete | — | |

### Media
| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| Multipart upload | `POST /api/v1/media/upload` | Composer | UUID filename, local disk storage |
| File serving | `GET /api/v1/media/:id` | MessageBubble | Path traversal guard |
| Image/video preview | — | Composer + Bubble | |

### Admin & Moderation
| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| Operator summary dashboard | `GET /api/v1/admin/summary` | — | DB/socket/upload stats (some fields stubbed) |
| Member list (with role/status) | `GET /api/v1/admin/members` | — | |
| Invite list/create | `GET/POST /api/v1/admin/invites` | — | |
| Message moderation hide/unhide | `POST /api/v1/admin/moderate/:messageId` | — | `messageModerationEvents` audit trail |
| Admin route guard | `requireAdmin` hook | — | Auto-applied to `/admin/*` |

### PWA & Infrastructure
| Feature | Status | Notes |
|---|---|---|
| Service worker | ✅ | Custom for push + notification routing |
| `manifest.webmanifest` | ✅ | |
| `offline.html` | ✅ | |
| Workbox precache | ✅ | Mentioned in ADR |
| Health checks | `GET /api/v1/health`, `GET /health` | DB connectivity check |
| Rate limiting | `rateLimit.ts` middleware | 5/login, 3/register per 15min |
| Structured logging | Fastify pino | |
| Integration tests | 4 test files, all green | auth, chats, admin, push |

---

## Partial / Scaffolded

| Feature | What's There | What's Missing | Notes |
|---|---|---|---|
| **Mentions** | `@username` regex parsing in `createMessage`; `mentionedUserIds` stored in `metadata`; `shouldNotifyByScope` checks mentions for push | No `message_mentions` table; no frontend mention highlighting/autocomplete; no `@username` click-to-profile | Parsing is production-grade; UI layer not built |
| **Admin summary** | Real DB counts for users, chats, messages, uploads, push sends, moderation events | Hardcoded zeros for `androidTokens`, `iosTokens`, `notificationsDisabled`, `quietHoursEnabled`, `previewsDisabled`, `staleTokensRemoved`, `serverErrorCount`, `routeGroups`; backup status is `"unconfigured"` | Stub fields need real queries |
| **Message edit history** | `messageEdits` table exists; rows inserted on edit | No API endpoint to fetch edit history; no frontend edit history UI | Incumbent had no edit audit; this is actually a v4 improvement |
| **Audio messages** | `AudioRecorder.svelte` component; backend accepts `audio` type | No dedicated audio player UI; no waveform visualization | Functional but minimal |
| **Reactions REST** | `POST /api/v1/messages/:id/reactions` exists | No `DELETE` REST endpoint for unreact (only socket) | Minor asymmetry |
| **`chat.joined` ack** | Emitted by server | Frontend doesn't consume it | Harmless |

---

## Missing vs v3 — Known Incumbent Features with Zero Implementation

### Critical Gaps (contracts/schemas exist, tables often missing)

| Feature | Contract Exists? | DB Table Exists? | Backend Route | Socket Event | Frontend |
|---|---|---|---|---|---|
| **Polls** | ✅ `CreatePollRequestSchema`, `VotePollRequestSchema`, `PollDataSchema`, `ServerPollVotedEventSchema` | ❌ **NO** — `polls`, `poll_options`, `poll_votes` missing from `schema.ts` | ❌ None | ❌ No `poll.vote` handler | ❌ No poll builder/display |
| **Pinned messages** | ✅ `PinnedMessageSchema`, `PinMessageRequestSchema`, `ServerMessagePinned/UnpinnedEventSchema` | ❌ **NO** — `pinnedMessages` missing from `schema.ts` | ❌ None | ❌ No `message.pin/unpin` handlers | ❌ No pin UI |
| **Starred messages** | ✅ `StarredMessageEntrySchema`, `StarredMessagesResponseSchema` | ❌ **NO** — `starredMessages` missing from `schema.ts` | ❌ None | — | ❌ No stars UI |
| **Archive chat** | ✅ `ArchiveChatResponseSchema`, `archivedAt` in `ChatSummarySchema` | ✅ `chatMembers.archivedAt` | ❌ No `POST /chats/:id/archive` or `/unarchive` | — | ❌ No archive toggle |
| **Session management** | ✅ `SessionSummarySchema`, `RevokeOtherSessionsResponseSchema` | ✅ `sessionDevices`, `refreshTokens` | ❌ No `GET /sessions`, `POST /sessions/revoke-others`, `DELETE /sessions/:id` | — | ❌ No session UI |
| **Channel creation** | — (implicit) | ✅ `chats` table supports `type: 'channel'` | ❌ No `POST /chats/channel` or member-add/remove | — | ❌ No channel creation UI |
| **GIF search** | ✅ `GifResultSchema`, `GifSearchResponseSchema`, `GifProviderSchema` | N/A | ❌ No GIF search endpoint | — | ❌ No GIF picker |
| **Message search** | — | `searchVector` placeholder in doc only | ❌ No search endpoint | — | ❌ No search UI |
| **Link unfurling / URL previews** | ❌ No schema | ❌ No table | ❌ No implementation | — | ❌ No preview rendering |
| **Registration mode update** | ✅ `UpdateRegistrationModeRequestSchema` | ✅ `serverSettings` | ❌ No `PATCH` endpoint (only `GET /auth/config`) | — | — |
| **Admin temp password** | ✅ `AdminTempPasswordResponseSchema` | — | ❌ No route | — | — |
| **Test notice ack endpoint** | ✅ `TestNoticeAckRequestSchema` / `ResponseSchema` | — | ❌ No dedicated endpoint (only during registration) | — | — |
| **Message moderation visibility on client** | ✅ `hidden` field on `MessageSchema`, `message.moderated` event | ✅ `messageModerationEvents` | ✅ Admin moderate route | ✅ Emits `message.moderated` | ❌ **Frontend does NOT handle `message.moderated` events** — moderated messages remain visible |
| **`message.read` socket event on REST mark-read** | — | — | `POST /chats/:id/read` updates DB | ❌ Does NOT emit `message.read` to room | Listens for `message.read` |

### Schema Drift
The actual `services/api/src/db/schema.ts` (274 lines) is a **subset** of the proposed schema in `docs/kimi-rebuild/02-data-model.md`. Tables that exist in the design doc but were **never created in the actual migration**:
- `polls` / `poll_options` / `poll_votes`
- `pinnedMessages`
- `starredMessages`
- `deviceTokens` (intentionally dropped — FCM legacy)

---

## Unknown — Cannot Determine from Codebase

| Feature | Evidence | Assessment |
|---|---|---|
| **Stories / Status updates** | Mentioned in feature research swarm as "table stakes" from WhatsApp/Signal/Telegram | **No evidence** v3 had this |
| **Voice/video calls** | Mentioned in competitive analysis (Discord, Signal) | **No evidence** v3 had this |
| **Screen sharing** | Mentioned in competitive analysis | **No evidence** v3 had this |
| **Channels with bots / bot platform** | Mentioned in research swarm ("technical enablers") | **No evidence** v3 had this |
| **Server boosts / Nitro equivalent** | Discord reference in research | **No evidence** v3 had this |
| **e2e encryption** | Explicitly deferred in ADR: "Out of scope: e2e encryption" | **Not in v3 or v4** |
| **Message threads** | Mentioned as differentiator idea ("remix a message into new channel") | **No evidence** v3 had this |
| **Payments / business accounts** | WhatsApp reference in research | **No evidence** v3 had this |
| **Link previews (URL unfurling)** | No contract, no schema, no implementation | Unknown if v3 had this |
| **Custom themes / client mods** | Mentioned in research | **No evidence** v3 had this |
| **Federation / bridges** | Matrix reference in research | **No evidence** v3 had this |
| **Android native app features** | `AppDistributionResponseSchema` references legacy Android APK | v3 may have had Android app; v4 is PWA-only |
| **Operator diagnostics endpoint** | ADR asks: "Incumbent had `/operator/diagnostics`. Out of scope for MVP?" | Unknown what it contained |

---

## Summary Matrix

| Category | Count | Key Examples |
|---|---|---|
| **Shipped & solid** | ~35 features | Auth, DMs, messaging, reactions, read receipts, typing, push, media, admin moderation |
| **Partial / scaffolded** | ~9 features | Mentions (parsed but no UI), admin summary stubs, audio (minimal), edit history (stored but not exposed) |
| **Missing vs v3** | ~14 features | Polls, pins, stars, archive, sessions, channels, GIFs, search, link previews, registration mode update |
| **Schema drift (designed but not built)** | 4 tables | `polls`, `poll_options`, `poll_votes`, `pinnedMessages`, `starredMessages` |
| **Unknown** | ~12 features | Stories, calls, bots, payments, e2e, threads, federation |

---

## Recommended Priority Order to Close Gaps

1. **P0 — Schema fix**: Add `polls`, `poll_options`, `poll_votes`, `pinnedMessages`, `starredMessages` tables to `schema.ts` and generate migration
2. **P0 — Admin hardening**: Fill stub fields in `/admin/summary` (push token counts, error stats)
3. **P1 — Polls**: Backend routes + socket events + frontend builder
4. **P1 — Pins**: Backend routes + socket events + frontend pin banner
5. **P1 — Stars**: Backend routes + frontend starred messages view
6. **P1 — Archive**: Backend routes + frontend archive toggle
7. **P1 — Session management**: Backend routes + frontend "Active sessions" UI
8. **P2 — Channel creation & member management**: Backend routes + frontend group info
9. **P2 — GIF search**: Integrate Giphy/Klipy API + frontend picker
10. **P2 — Message search**: Add FTS migration + backend endpoint + frontend search
11. **P2 — Link unfurling**: New feature (may not have existed in v3)
12. **P2 — Frontend moderation visibility**: Handle `message.moderated` events to hide/show messages
