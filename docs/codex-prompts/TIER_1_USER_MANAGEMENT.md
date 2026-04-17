# Codex Task: Tier 1 User Management & Search Backend

## Context
The Penthouse is moving from v2.0.0-alpha (Vue + Capacitor) to v2.1.0-alpha (SvelteKit PWA).
Claude is building the frontend user directory and profile views. Your job: implement all backend endpoints and database changes to support user search, profiles, and lastSeenAt tracking.

**You own**: `services/api/` only. Do NOT edit `apps/web/` or frontend routes.
**Claude is doing**: User directory UI, profile UI, integrating your endpoints.

---

## Database Changes

### 1. Add `timezone` column to `users` table
File: `services/api/src/db/migrations/016_user_timezone.sql`

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Optional: indexes for search performance (already covered by username index)
```

**Rationale**: Optional timezone field for user profile display. Max length ~50 chars (e.g., "America/New_York").

### 2. Add `last_seen_at` tracking
File: `services/api/src/db/migrations/017_user_last_seen.sql`

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Update last_seen_at on every user activity
-- (handled in routes, not DB-level trigger for simplicity)
```

---

## Contract Changes

### Update `packages/contracts/src/api.ts`

**1. Extend MemberDetail to include lastSeenAt and timezone:**
```typescript
export const MemberDetailSchema = MemberSummarySchema.extend({
  bio: z.string().nullable(),
  timezone: z.string().nullable().optional(),
  lastSeenAt: z.string().nullable().optional()
});
```

**2. Update AuthUserSchema to include timezone:**
```typescript
export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  timezone: z.string().nullable().optional(),
  role: UserRoleSchema,
  mustChangePassword: z.boolean(),
  mustAcceptTestNotice: z.boolean(),
  requiredTestNoticeVersion: z.string(),
  acceptedTestNoticeVersion: z.string().nullable()
});
```

**3. Add new schemas for user search:**
```typescript
export const UserSearchRequestSchema = z.object({
  q: z.string().min(1).max(100),  // query: username or displayName
  limit: z.number().int().min(1).max(50).default(20).optional()
});

export const UserSearchResponseSchema = z.object({
  results: z.array(MemberDetailSchema)
});

export const ListUsersRequestSchema = z.object({
  offset: z.number().int().nonnegative().default(0).optional(),
  limit: z.number().int().min(1).max(50).default(20).optional()
});

export const ListUsersResponseSchema = z.object({
  users: z.array(MemberDetailSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative()
});

export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(160).optional(),
  timezone: z.string().max(50).optional()
});
```

**4. Export types:**
```typescript
export type UserSearchRequest = z.infer<typeof UserSearchRequestSchema>;
export type UserSearchResponse = z.infer<typeof UserSearchResponseSchema>;
export type ListUsersRequest = z.infer<typeof ListUsersRequestSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
```

---

## New API Endpoints

### 1. Search Users
**Endpoint:** `GET /api/v1/users/search?q=alice&limit=20`

**Logic:**
- Query: `SELECT * FROM users WHERE username ILIKE $1 || '%' OR display_name ILIKE $1 || '%' ORDER BY username ASC LIMIT ?`
- Return up to `limit` results as `UserSearchResponse`
- Handle empty query gracefully (return empty array, don't 400)
- Case-insensitive prefix match

**Response:** 200 OK with UserSearchResponse

### 2. List All Users (Directory)
**Endpoint:** `GET /api/v1/users?offset=0&limit=20`

**Logic:**
- Paginated user list for the directory
- Query: `SELECT * FROM users WHERE status = 'active' ORDER BY display_name ASC LIMIT ? OFFSET ?`
- Return `ListUsersResponse` with total count
- Default limit 20, max limit 50

**Response:** 200 OK with ListUsersResponse

### 3. Get User Profile
**Endpoint:** `GET /api/v1/users/:userId`

**Logic:**
- Return single MemberDetail for the given userId
- Include timezone, bio, lastSeenAt
- Return 404 if user not found or status != 'active'

**Response:** 200 OK with MemberDetail

### 4. Update Current User Profile
**Endpoint:** `PATCH /api/v1/auth/me`

**Logic:**
- Authenticated route (require JWT)
- Accept UpdateProfileRequest (displayName, bio, timezone all optional)
- Validate each field if provided
- Update users table
- Return updated AuthUser

**Response:** 200 OK with AuthUser

---

## Activity Tracking: Update `lastSeenAt`

**Where:** Implement in a middleware or route handler that updates `last_seen_at` on every authenticated request.

**Options:**
1. **Middleware approach** (preferred): Create a middleware that updates `last_seen_at` after route handler, but doesn't block on slowness
2. **Per-route approach**: Add `await updateLastSeen(userId)` at end of each public route handler

**Example query:**
```sql
UPDATE users SET last_seen_at = NOW() WHERE id = $1;
```

**Avoid:** Don't update on EVERY message send (too expensive). Instead, update on:
- `/api/v1/chats` (list chats)
- `/api/v1/chats/:id/messages` (load messages)
- `/api/v1/users/search` (user search)
- Socket.IO message.new event listener (emit it, but update lastSeenAt server-side)

Make the update fire asynchronously (don't await) to avoid blocking.

---

## File Structure (New Files)

```
services/api/
├── src/db/migrations/
│   ├── 016_user_timezone.sql
│   └── 017_user_last_seen.sql
├── src/routes/
│   ├── users.ts          ← NEW: search, list, get profile
│   └── auth.ts           ← MODIFY: add PATCH /api/v1/auth/me
└── src/utils/
    └── activity.ts       ← NEW: updateLastSeen helper
```

---

## Testing Expectations

- Integration tests for new endpoints in `services/api/test/integration-users.test.ts`
- Test cases:
  - Search by username (prefix match)
  - Search by display name (prefix match)
  - List users pagination (offset/limit)
  - Get user profile (200 and 404)
  - Update profile (valid fields, 401 if not authenticated)
  - Timezone field persists and returns correctly

Run: `npm run test --workspace=services/api`

---

## Handoff to Claude

Once all endpoints are implemented and tested:
1. Send the exact endpoint URLs and response shapes
2. Confirm timezone field is optional and defaults to null
3. Confirm lastSeenAt updates are async (non-blocking)
4. Share any error responses that might differ from standard format

Claude will then:
- Build user directory UI that consumes these endpoints
- Integrate profile views
- Test on Android emulators
- Report any contract mismatches back to you

---

## MVP Scope Reminder

**Tier 1 is user search + directory only.** Typing indicators, reactions, and GIF pickers are Tier 2+.
Keep this focused. No side quests.

---

## Questions for Clarification

- Should timezone be validated against a standard list (e.g., IANA timezone database) or free-form text?
- Should search be case-sensitive or case-insensitive? (Recommend: case-insensitive)
- Should banned/removed users appear in search results? (Recommend: no, filter to status='active')
