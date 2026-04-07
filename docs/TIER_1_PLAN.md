# Tier 1 Implementation Plan — User Management & Search
**Target**: MVP alpha release (v2.1.0-alpha)

## What's Already on Main (v2.0.0-alpha)
✓ User profiles: display_name, bio, avatar_media_id, role, status
✓ Chat structure: channels, direct messages, members
✓ Read receipts: seenAt field on messages
✓ Message metadata: flexible record for future expansions (reactions, pins, etc.)
✓ GIF providers: giphy and klipy enums (integration TBD)

## What Tier 1 Adds
### Contracts (packages/contracts/src/api.ts)
- Add `timezone` (optional) to MemberDetail & AuthUser
- Add `lastSeenAt` to MemberDetail (for online/offline status)
- Extend MessageMetadata for: `pinnedAt`, `reactions` (map), `typingIndicators`
- Add UserSearchRequest/Response schemas
- Add ListUsersRequest/Response schemas
- Add UserDirectoryRequest/Response schemas

### Frontend (apps/web)
1. **User Directory Component**
   - Search bar (username + display name)
   - List all users with avatars, display names, online status
   - Click to view profile or start DM
   - Lazy-load pagination

2. **User Profile View**
   - Display name, avatar, bio, timezone (if set), last seen
   - Show mutual chat membership
   - Button to start DM

3. **Message History Search** (if time permits in alpha)
   - Search within chat by keyword
   - Filter by sender
   - Jump to message

### Backend (services/api)
1. **User Search Endpoint** `GET /api/v1/users/search?q=...`
   - Returns UserSearchResponse (max 50 results)
   - Search by username or displayName (case-insensitive prefix match)

2. **User Directory Endpoint** `GET /api/v1/users?offset=0&limit=50`
   - Returns ListUsersResponse with MemberDetail items
   - Pagination support

3. **User Profile Endpoint** `GET /api/v1/users/:userId`
   - Returns full MemberDetail + lastSeenAt

4. **Update Profile Endpoint** `PATCH /api/v1/auth/me`
   - Accepts: displayName, bio, timezone (all optional)
   - Updates user record

5. **Last Seen Tracking** (Socket.IO)
   - Update user.lastSeenAt on each socket event or periodic ping
   - Return lastSeenAt in any user response

## Files to Port vs Build from Scratch
| Component | Status | Notes |
|-----------|--------|-------|
| User profile DB schema | ✓ Port | Exists on main; add timezone column |
| Chat list | ✓ Port | Mostly works; verify in PWA context |
| Message sending | ✓ Port | Core Socket.IO flow is solid |
| User search UI | ⚠️ Build fresh | PWA context; ensure mobile-first |
| User directory UI | ⚠️ Build fresh | New feature for PWA |
| Search endpoints | ⚠️ Build fresh | New endpoints; Codex owns |
| User profiles endpoint | ⚠️ Build fresh | Codex owns |

## Handoff Strategy
1. **Claude** creates Tier 1 contracts + user directory UI
2. **Claude → Codex handoff** with specific prompt (see CODEX_TIER_1_PROMPT.md)
3. **Codex** implements all backend endpoints + timezone column
4. **Codex → Claude handoff** once endpoints are ready
5. **Claude** integrates endpoints into UI + testing on emulators

## Definition of Done (Tier 1)
- [ ] User search (by username/displayName) works
- [ ] User directory loads with pagination
- [ ] User profiles show timezone, last seen, bio
- [ ] Profile updates (displayName, bio, timezone) persist
- [ ] No console errors in PWA on Android
- [ ] TypeScript clean
- [ ] Tests pass (backend integration tests for new endpoints)
