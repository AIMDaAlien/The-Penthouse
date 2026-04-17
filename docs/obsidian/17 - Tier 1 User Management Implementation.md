---
tags: [penthouse, pwa, tier-1, user-management, implementation]
created: 2026-04-05
---

# Tier 1: User Management Implementation

## What is Tier 1

**Goal**: Establish user discovery and profile management before moving to chat/messaging features.

**Why this order**: You need to know who's in the community and manage your presence before you can chat effectively.

## What's implemented

### 1. Authentication (Refactored)
- **Login**: Username + password → JWT + refresh token
- **Register**: Username + password + **ALTCHA captcha token** (was: invite code)
- **Logout**: Clear tokens, disconnect socket
- **Session persistence**: Memory-based (httpOnly cookie for security)

**File**: `apps/web/src/routes/auth/+page.svelte`

**New design**:
- Logo: Gelasio serif (elegant, refined)
- Dark theme: #12121C background, #7777C2 accent (periwinkle)
- Glassmorphic card with backdrop blur

### 2. User Directory
Browse all users with search and pagination.

**Features**:
- List all users (20 per page)
- Search by username
- View user count per page
- Pagination controls (next/previous)
- Online/offline status badges
- Click user to view full profile

**File**: `apps/web/src/routes/users/+page.svelte`

**How it works**:
```typescript
// Load users (paginated)
const users = await api.users.list({ offset: 0, limit: 20 });

// Search users
const results = await api.users.search('alice', limit: 10);

// Display online status
const isOnline = new Date() - new Date(user.lastSeenAt) < 5 * 60 * 1000;
```

**Status badges**:
- 🟢 Green: Online now (< 5 min inactive)
- 🟡 Yellow: Away (5–60 min inactive)
- ⚪ Gray: Offline (> 60 min inactive)

### 3. User Profile View
See a user's public profile.

**What you see**:
- Avatar (with initials fallback)
- Username
- Display name
- Bio (up to 160 chars)
- Timezone
- Last seen time ("2 minutes ago", "Online now", etc.)

**File**: `apps/web/src/routes/users/[id]/+page.svelte`

### 4. User Profile Edit (Own Profile Only)
Edit your own profile with live validation.

**Fields**:
- Display name (1–40 chars)
- Bio (0–160 chars)
- Timezone (0–50 chars, optional)

**Validation**:
- Real-time field validation
- Error messages below each field
- Submit button disabled if errors exist
- Success message after save

**File**: `apps/web/src/routes/users/[id]/+page.svelte` (edit mode)

### 5. Contract Schemas (Shared Types)

All request/response shapes are in `packages/contracts/src/api.ts`:

**New schemas**:
```typescript
UserSearchRequestSchema
UserSearchResponseSchema
ListUsersRequestSchema
ListUsersResponseSchema
MemberDetailSchema  // Extended with timezone, lastSeenAt
```

**Changes to existing**:
```typescript
RegisterRequestSchema {
  - inviteCode: InviteCodeSchema,
  + captchaToken: CaptchaTokenSchema,  // Proof-of-work token
}

MemberDetailSchema {
  + timezone?: string,        // User's timezone
  + lastSeenAt?: string,      // ISO timestamp of last activity
}
```

## What's pending (blocked by backend)

### 1. ALTCHA Challenge Endpoint
**Status**: Awaiting Codex implementation

**Needs**: `POST /api/v1/altcha`

**What it does**:
1. Frontend requests a challenge: `POST /api/v1/altcha`
2. Backend returns:
   ```json
   {
     "algorithm": "SHA-256",
     "challenge": "abc123...",
     "salt": "xyz789...",
     "signature": "def456..."
   }
   ```
3. ALTCHA widget on frontend solves the challenge (proof-of-work)
4. Widget returns a token in response
5. Frontend sends token with registration request

**Current workaround**: Using placeholder token `'PENDING_BACKEND_IMPLEMENTATION'` to allow testing without the endpoint.

**Where documented**: 
- Handoff note in `packages/contracts/src/api.ts` (~line 108)
- Full spec in docs (Codex notes)

### 2. Error Response Standardization
**Status**: Awaiting Codex implementation

**Problem**: Frontend receives `[object Object]` error messages.

**Root cause**: Backend returns nested error objects instead of flat strings.

**Example**:
```json
// WRONG (what we get now)
{
  "error": {
    "code": 400,
    "details": { "field": "username", ... }
  }
}
→ Frontend shows: "[object Object]" ❌

// CORRECT (what we need)
{
  "error": "Username is already taken"
}
→ Frontend shows: "Username is already taken" ✓
```

**Where documented**:
- `docs/codex-prompts/ERROR_RESPONSE_STANDARDIZATION.md` (comprehensive guide)
- Blocks meaningful Android emulator testing

### 3. Remove inviteCode from registration
**Status**: Temporary workaround in place

**Current**: Frontend sends `inviteCode: 'PLACEHOLDER'` because backend still validates it.

**When ready**: Codex removes inviteCode validation, frontend removes the placeholder.

**Impact**: Non-blocking; registration works with placeholder.

## API endpoints used

### Frontend → Backend

All calls go through `apps/web/src/lib/services/api.ts`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login` | POST | Login with username + password |
| `/api/v1/auth/register` | POST | Register new account |
| `/api/v1/users/search` | GET | Search users by username |
| `/api/v1/users` | GET | List all users (paginated) |
| `/api/v1/users/:userId` | GET | Get one user's profile |
| `/api/v1/auth/me` | PATCH | Update own profile |
| `/api/v1/altcha` | POST | **PENDING** Get ALTCHA challenge |

### Socket.IO Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `presence` | Server → Client | `{ userId, status, lastSeenAt }` | User came online/offline |
| `chat.updated` | Server → Client | `{ chat, ... }` | Chat changed (members, name, etc.) |
| `message.new` | Server → Client | `{ message, ... }` | New message in subscribed chat |

## Testing status

### ✅ What works
- TypeScript compiles clean (0 errors, 0 warnings)
- All 74 tests pass
- User directory loads
- User search works
- Profile view works
- Profile edit works (for own profile)
- Online status calculation correct
- Login/logout flow works
- Socket connects on login

### 🔄 What's partial
- ALTCHA widget: Commented out (backend endpoint missing)
- Error messages: Shows `[object Object]` (backend issue)
- Registration: Uses placeholder captchaToken (waiting for backend)

### 📋 What needs testing
- Android emulator: User directory UI on mobile
- Android emulator: Profile editing on mobile
- Android emulator: Real ALTCHA flow (once endpoint exists)
- Android emulator: Error message display (once backend fixed)
- Offline support: Service Worker caching
- Socket reconnection: After network drop
- Pagination: Works at scale

## Browser console check

When you load the app, check the browser console:

```
✅ No red errors
✅ No TypeScript type issues
✅ No missing imports
🟡 One warning: ALTCHA script failed to load (expected, no endpoint yet)
```

## How to test right now

1. **Start the dev server**:
   ```bash
   cd "path/to/THE PENTHOUSE OPTIMIZED"
   npm run dev
   ```

2. **Open in browser**:
   ```
   http://localhost:5173/auth
   ```

3. **Try login**:
   - Username: `aimtest` (test account)
   - Password: (ask Codex what test account password is)
   - Should login and redirect to chat list

4. **Try user directory**:
   - Click "Find People" button in header
   - See list of users
   - Search by typing a username
   - Click a user to see their profile

5. **Try profile edit** (if logged in as your account):
   - Go to your profile (Users → click your name)
   - Click "Edit Profile"
   - Change display name or bio
   - Click save
   - See updated profile

## Files touched

**Frontend**:
- `apps/web/src/routes/auth/+page.svelte` (auth flow)
- `apps/web/src/routes/+page.svelte` (added "Find People" button)
- `apps/web/src/routes/users/+page.svelte` (directory + search)
- `apps/web/src/routes/users/[id]/+page.svelte` (profile view/edit)
- `apps/web/src/lib/services/api.ts` (user API methods)
- `apps/web/src/routes/+layout.svelte` (design tokens)

**Contracts**:
- `packages/contracts/src/api.ts` (schemas + handoff notes)

**Backend tests** (updated for new schema):
- `services/api/test/auth.test.ts` (register tests)

## Code quality

- **TypeScript**: Strict mode, 0 errors
- **Linting**: No unused variables, clean imports
- **Tests**: 74 passing, 0 failing
- **No console errors**: Development mode clean

## Next steps (after blockers unblock)

1. **Codex**: Implement ALTCHA endpoint
2. **Codex**: Fix error responses
3. **Claude**: Test on Android emulator
4. **Claude**: Collect feedback
5. **Claude**: Polish Tier 1 based on feedback

## Decision log

### Why SvelteKit instead of Vue?
- **Vue**: Mature, large ecosystem, harder to deploy PWA
- **SvelteKit**: Purpose-built for PWA, smaller bundle, simpler file-based routing, modern TypeScript-first

### Why Nanostores instead of Pinia?
- **Pinia**: Powerful, but verbose with Vue setup
- **Nanostores**: Lightweight, works with Svelte 5 runes, minimal boilerplate

### Why native fetch instead of axios?
- **axios**: Heavier (~16KB), not needed for simple REST
- **fetch**: Native, built-in, enough for our use case

### Why no app framework (Tailwind, Material)?
- **Custom CSS**: Smaller bundle, exact control over design system, matches v2.0.0 visual identity
- **CSS variables**: Easy theme switching, consistent spacing/colors

### Why placeholder token for ALTCHA?
- **Unblock testing**: Can't test registration without it
- **Temporary**: Removed once backend endpoint exists
- **Safe**: Placeholder doesn't pass real ALTCHA validation (backend would reject it anyway)

## Terminology

| Term | Meaning |
|------|---------|
| **Tier 1** | User management + search (current focus) |
| **Tier 2** | Typing indicators, read receipts, pinning |
| **Tier 3** | GIF picker, stickers, reactions |
| **PWA** | Progressive Web App (installable website) |
| **Service Worker** | Background process that caches files for offline |
| **Nanostores** | Lightweight state management library |
| **Zod** | TypeScript schema validation library |
| **Socket.IO** | Real-time two-way communication |
| **lastSeenAt** | Timestamp of user's last activity |
