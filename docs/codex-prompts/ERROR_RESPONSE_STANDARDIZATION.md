# Codex Task: Standardize API Error Responses

**Status**: Handoff ready in `docs/codex-prompts/HANDOFF-ERROR-STANDARDIZATION.md`

## Problem
Frontend receives `[object Object]` errors when backend returns error responses with nested objects instead of readable strings.

**Example of bad response:**
```json
{
  "error": {
    "code": 400,
    "details": {...}
  }
}
```

**Frontend receives:** `[object Object]` ❌

**Example of good response:**
```json
{
  "error": "Username is already taken"
}
```

**Frontend receives:** `Username is already taken` ✓

---

## Task: Audit and Fix All Error Responses

### Rules
1. **All error responses MUST have a flat `error` string field**
   - ✓ `{ error: "User not found" }`
   - ✓ `{ error: "Invalid password" }`
   - ✗ `{ error: { message: "..." } }`
   - ✗ `{ statusCode: 400, message: "..." }`

2. **Error messages should be:**
   - Human-readable (not "ERR_INVALID_TOKEN" or error codes)
   - Specific (not "Something went wrong")
   - Actionable when possible ("Password must be at least 10 characters" vs "Invalid password")

3. **Preserve status codes and error type info, but in separate fields**
   ```json
   {
     "statusCode": 400,
     "error": "Username is already taken"
   }
   ```

4. **Never nest error details**
   - ✗ `{ error: { message: "...", code: 123 } }`
   - ✓ `{ error: "message...", errorCode: 123 }` (if needed)

---

## Files to Audit

Search through all route handlers in `services/api/src/routes/`:
- `auth.ts` — login, register, refresh, password reset
- `chats.ts` — chat operations
- `members.ts` — profile, members
- `media.ts` — uploads
- `admin.ts` — admin operations
- `health.ts` — health checks
- `users.ts` — user search, directory (newly added by Tier 1)

Also check:
- `src/app.ts` — global error handler
- Any middleware that throws errors

---

## Common Error Scenarios (Make These Readable)

**Authentication:**
- "Invalid username or password" (not "Auth failed")
- "Username is already taken"
- "Password must be at least 10 characters"
- "Refresh token expired, please log in again"

**Validation:**
- "Display name is required"
- "Bio cannot exceed 160 characters"
- "Username may only contain letters, numbers, ".", "_" and "-""

**Not Found:**
- "User not found"
- "Chat not found"
- "Message not found"

**Permissions:**
- "You don't have permission to perform this action"
- "You are not a member of this chat"

**Rate Limiting:**
- "Too many login attempts. Please try again in 5 minutes"

---

## Frontend Error Handler (Reference)

The frontend does this:
```typescript
if (!res.ok) {
  const body = await res.json().catch(() => ({ error: res.statusText }));
  throw new ApiError(res.status, body.error ?? res.statusText);
}

// Then shows to user:
error = err instanceof Error ? err.message : 'Something went wrong.';
```

**If `body.error` is an object**, `.message` returns `[object Object]`.

So every endpoint MUST return `{ error: "string message" }`.

---

## Implementation Steps

1. **Search for error patterns:**
   ```bash
   grep -r "throw\|res.status\|res.code" services/api/src/routes/
   grep -r "res.json({ error:" services/api/src/routes/
   ```

2. **For each error response, check:**
   - Is `error` a string? (not an object)
   - Is the message human-readable?
   - Is the message specific?

3. **Fix examples:**

   **Before:**
   ```typescript
   res.status(401).json({ error: { name: 'UnauthorizedError', message: 'No token' } });
   ```

   **After:**
   ```typescript
   res.status(401).json({ error: 'Authorization token is missing or invalid' });
   ```

4. **Test:**
   - All 400, 401, 403, 404, 500 responses should have readable `error` strings
   - Run `npm run test` to verify no tests break
   - Manually test on emulator: invalid login → error message should be readable

---

## Acceptance Criteria

- [x] Detailed handoff doc created (`HANDOFF-ERROR-STANDARDIZATION.md`)
- [x] Implementation approach documented
- [ ] All error responses have a flat `error` string field
- [ ] No errors contain `[object Object]` when displayed in frontend
- [ ] All error messages are human-readable (not codes)
- [ ] `npm run test` passes
- [ ] Manually tested on Android emulator: errors display correctly
- [ ] No breaking changes to error status codes or response shapes (only improve readability)

---

## Notes

- This is **NOT** a breaking change if you keep status codes consistent
- Frontend only reads the `error` string field, so internal structure doesn't matter
- Prioritize: auth routes first (most visible to users), then chats, then admin
