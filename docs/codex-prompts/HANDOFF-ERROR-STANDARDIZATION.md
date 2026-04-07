# HANDOFF → Codex: Error Response Standardization

**Priority**: HIGH (blocks meaningful testing)  
**Blocking**: User management Tier 1 emulator testing (can't see why operations fail)  
**Assigned to**: Codex (GPT-5.4)  
**Created**: 2026-04-05

---

## What needs to be done

Audit all backend error responses and ensure they return **flat `error` string fields** instead of nested objects.

**Current problem**: Frontend receives `[object Object]` when backend returns nested error objects.

**Solution**: Every error response must have the shape `{ error: "readable message" }`.

---

## The problem (user-facing)

When a user tries to register with an invalid username on the emulator:

**Current (broken)**:
```json
HTTP 400
{
  "error": {
    "code": 400,
    "message": "Username validation failed",
    "details": { "field": "username", ... }
  }
}
```

Frontend receives: **`[object Object]`** ❌ (confusing)

**Target (correct)**:
```json
HTTP 400
{
  "error": "Username may only use letters, numbers, ".", "_" and "-""
}
```

Frontend receives: **`"Username may only use letters, numbers, ".", "_" and "-""` ✓ (clear)

---

## How frontend consumes errors

```typescript
// apps/web/src/lib/services/api.ts
async function makeRequest(url, options) {
  const res = await fetch(url, options);
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    
    // Frontend expects body.error to be a STRING
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  
  return res.json();
}

// In UI:
try {
  await auth.register({ ... });
} catch (err) {
  // err instanceof ApiError
  error = err.message;  // ← Display this to user
  // If body.error was an object, err.message = "[object Object]" ❌
}
```

**Key point**: `body.error` MUST be a string. If it's an object, `.message` returns `"[object Object]"`.

---

## Scope: All error responses

### Files to audit

Audit error responses in these route files:

```
services/api/src/routes/
├── auth.ts           ← login, register, refresh, password reset, logout
├── chats.ts          ← message send, chat operations
├── members.ts        ← profile update, member operations
├── media.ts          ← file uploads
├── admin.ts          ← admin operations
├── users.ts          ← user search, directory (NEW)
└── health.ts         ← health check
```

Also check:
- `src/app.ts` — global error handler
- Any middleware that throws errors

---

## Rules for error responses

### ✅ CORRECT responses

**Rule 1: Flat `error` string field**
```json
{
  "error": "Username is already taken"
}
```

**Rule 2: Include status code if useful**
```json
{
  "statusCode": 400,
  "error": "Username is already taken"
}
```

**Rule 3: Simple, human-readable messages**
```json
{
  "error": "Password must be at least 10 characters"
}
```

**Rule 4: Actionable messages when possible**
```json
{
  "error": "Refresh token expired, please log in again"
}
```

### ❌ WRONG responses (these break frontend)

**Don't nest the error:**
```json
{
  "error": {
    "message": "Username is already taken",
    "code": "VALIDATION_ERROR"
  }
}
```
→ Frontend shows: `[object Object]`

**Don't return just a code:**
```json
{
  "code": 400,
  "message": "Username validation failed"
}
```
→ Frontend shows: `undefined` (no `.error` field)

**Don't obscure with generic messages:**
```json
{
  "error": "Something went wrong"
}
```
→ Frontend shows: `"Something went wrong"` (not helpful for debugging)

---

## Common scenarios to handle

### Authentication errors
- `"Invalid username or password"` (not "Auth failed")
- `"Username is already taken"`
- `"Password must be at least 10 characters"`
- `"Refresh token expired, please log in again"`
- `"Authorization token is missing or invalid"`

### Validation errors
- `"Display name is required"`
- `"Bio cannot exceed 160 characters"`
- `"Username may only contain letters, numbers, ".", "_" and "-""`
- `"Email is invalid"` (if applicable)

### Not found errors
- `"User not found"`
- `"Chat not found"`
- `"Message not found"`

### Permission errors
- `"You don't have permission to perform this action"`
- `"You are not a member of this chat"`

### Rate limiting
- `"Too many login attempts. Please try again in 5 minutes"`

### Server errors
- `"Failed to send message"` (not just `"Internal server error"`)
- `"Failed to upload file"`

---

## Implementation approach

### Step 1: Find all error responses

Search for error patterns:
```bash
grep -r "res.status\|res.code\|throw new Error\|res.json.*error" \
  services/api/src/routes/ \
  --include="*.ts"
```

### Step 2: Categorize by pattern

**Pattern A: Already flat** (no change needed)
```typescript
res.status(401).json({ error: 'Authorization token is missing' });
```

**Pattern B: Nested object** (needs fixing)
```typescript
res.status(400).json({ error: { code: 400, message: 'Invalid input' } });
```

**Pattern C: Wrong field names** (needs fixing)
```typescript
res.status(400).json({ statusCode: 400, message: 'Invalid input' });
```

**Pattern D: Thrown error object** (needs fixing)
```typescript
throw new ValidationError('Username validation failed', { field: 'username' });
// Later caught and returned as-is
```

### Step 3: Fix each pattern

**For Pattern B/C**: Flatten to `{ error: "string" }`
```typescript
// Before
res.status(400).json({ error: { code: 400, message: 'Invalid input' } });

// After
res.status(400).json({ error: 'Invalid input' });
```

**For Pattern D**: Extract the message
```typescript
// Before
catch (err) {
  res.status(400).json({ error: err });  // ← Error object
}

// After
catch (err) {
  const message = err instanceof Error ? err.message : 'Invalid input';
  res.status(400).json({ error: message });
}
```

### Step 4: Test

```bash
npm run test
```

All tests should still pass (or need updates if they check for old error format).

---

## Places to watch

### Zod validation errors

If using Zod `.safeParse()`, errors need to be flattened:

**Current (might be wrong):**
```typescript
const parsed = RegisterRequestSchema.safeParse(req.body);
if (!parsed.success) {
  const errors = parsed.error.flatten();
  res.status(400).json({ error: errors });  // ← Nested object
}
```

**Should be:**
```typescript
const parsed = RegisterRequestSchema.safeParse(req.body);
if (!parsed.success) {
  const errors = parsed.error.flatten();
  const firstError = Object.values(errors.fieldErrors)[0]?.[0] || 'Invalid request';
  res.status(400).json({ error: firstError });
}
```

Or use a helper function (recommended):
```typescript
function getFirstZodError(zodError) {
  const errors = zodError.flatten();
  const fieldErrors = Object.values(errors.fieldErrors).flat();
  const formErrors = errors.formErrors || [];
  return (fieldErrors[0] || formErrors[0] || 'Invalid request') as string;
}

// Usage:
if (!parsed.success) {
  const message = getFirstZodError(parsed.error);
  res.status(400).json({ error: message });
}
```

### Error middleware

Check `src/app.ts` for global error handlers:
```typescript
app.setErrorHandler((error, request, reply) => {
  // Make sure this returns { error: "string" }
});
```

---

## Before/after examples

### Example 1: Register validation
**Before:**
```typescript
// services/api/src/routes/auth.ts
const parsed = RegisterRequestSchema.safeParse(req.body);
if (!parsed.success) {
  const errors = parsed.error.flatten();
  return res.status(400).json({ errors });  // ❌ Returns nested object
}
```

**After:**
```typescript
const parsed = RegisterRequestSchema.safeParse(req.body);
if (!parsed.success) {
  const errors = parsed.error.flatten();
  const fieldErrors = Object.values(errors.fieldErrors).flat();
  const message = fieldErrors[0] || 'Registration validation failed';
  return res.status(400).json({ error: message });  // ✅ Flat string
}
```

### Example 2: User not found
**Before:**
```typescript
const user = await db.users.findById(userId);
if (!user) {
  res.status(404).json({ notFound: true, reason: 'User does not exist' });
}
```

**After:**
```typescript
const user = await db.users.findById(userId);
if (!user) {
  res.status(404).json({ error: 'User not found' });  // ✅ Flat string
}
```

### Example 3: Rate limiting
**Before:**
```typescript
if (tooManyAttempts) {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 300,
      attempts: currentAttempts
    }
  });
}
```

**After:**
```typescript
if (tooManyAttempts) {
  res.status(429).json({
    error: 'Too many login attempts. Please try again in 5 minutes'
  });
}
```

---

## Acceptance criteria

- [ ] All error responses have `error` field
- [ ] `error` field is always a string (never an object or array)
- [ ] Error messages are human-readable (not error codes)
- [ ] Error messages are specific (not "Something went wrong")
- [ ] All tests pass (`npm run test`)
- [ ] No TypeScript errors
- [ ] Tested in browser: error messages are readable (not `[object Object]`)
- [ ] Global error handler also returns flat strings

---

## Testing in frontend

Once backend is fixed, test in browser:

1. Go to http://localhost:5173/auth
2. Try invalid operations:
   - Register with short username (< 3 chars)
   - Register with weak password (< 10 chars)
   - Login with wrong password
3. Look at error message shown to user
4. Should see readable text, NOT `[object Object]`

Check browser dev tools → Network tab → error response:
```json
{
  "error": "Username must be at least 3 characters"
}
```

---

## Dependencies

**No frontend changes needed from Claude** until this is done.

Once this is complete, Claude can:
1. Test user directory on emulator
2. See readable error messages
3. Understand why operations failed

---

## Notes for Codex

- **Priority**: This unblocks emulator testing
- **Scope**: All error responses across all routes
- **Testing**: Run full test suite after changes
- **Frontend impact**: Frontend will immediately show better error messages
- **Breaking change?** No, just making errors more readable

---

## Reference doc

More detailed spec and examples in:
- `docs/codex-prompts/ERROR_RESPONSE_STANDARDIZATION.md` (comprehensive guide)

---

## User story

**As a** user testing the app on Android emulator  
**I want to** see readable error messages when something fails  
**So that** I can understand what went wrong and fix my input

**Current state**: Error messages show as `[object Object]` (breaks user testing)  
**Target state**: Error messages are readable English (unblocks testing)
