# HANDOFF → Codex: Registration Flow Improvements

**Priority**: HIGH (blocks proper registration testing)  
**Status**: User reported CAPTCHA not showing, password constraints hidden  
**Created**: 2026-04-06

---

## Problems Identified

### 1. CAPTCHA Widget Not Rendering
**What user sees**: "Please complete the captcha challenge" error but NO widget visible

**Possible causes**:
- ALTCHA CDN script not loading (`https://cdn.altcha.com/altcha.min.js`)
- Backend `POST /api/v1/altcha` endpoint not working correctly
- Widget JS error in browser console
- Widget not receiving valid challenge data

**What needs to happen**:
1. Verify ALTCHA CDN script loads
2. Test `POST /api/v1/altcha` endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/v1/altcha \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
3. Verify response structure matches schema
4. Debug browser console for widget JS errors

---

### 2. Password Requirements Not Visible
**Problem**: User doesn't know password constraints before entering

**Current**: "Password must be at least 10 characters" only shows AFTER submission with wrong input

**Needed**: Show constraints BEFORE user types:
```
Password (10-128 characters)
- At least 10 characters
- Maximum 128 characters
- No leading/trailing spaces
```

**Solution**: Add helper text under password field showing requirements

---

### 3. Username Availability Not Checked
**Problem**: User enters taken username, gets error without alternatives

**Current**: Just "Username is already taken"

**Needed**: 
1. **Availability check endpoint** (NEW)
   - `GET /api/v1/auth/username-available/:username`
   - Returns: `{ available: boolean }`
   - Check as user types (debounced)
   
2. **Suggestion endpoint** (NEW)
   - `POST /api/v1/auth/suggest-usernames`
   - Request: `{ desired: "alice" }`
   - Returns: `{ suggestions: ["alice123", "alice_2024", "alice.dev"] }`
   - Show when username is taken

---

### 4. Display Name Missing from Registration
**Problem**: Registration doesn't ask for display name

**Current flow**:
```
Username ✓ (immutable, unique, @mentions)
Password ✓
Register → auto-creates display name from username
```

**Needed**:
```
Display Name ✓ (mutable, can duplicate)
Username ✓ (immutable, unique)
Password ✓
Register → uses provided display name
```

**Why**: 
- Username is for uniqueness/mentions (like @alice)
- Display name is for profile/UI (like "Alice Smith")
- Users want readable names without username constraints

---

## Tasks for Codex

### Task 1: Fix ALTCHA Endpoint
**Status**: Already implemented, but possibly broken

**Check**:
1. Verify endpoint returns valid response:
   ```json
   {
     "algorithm": "SHA-256",
     "challenge": "abc123...",
     "salt": "xyz789...",
     "signature": "def456..."
   }
   ```
2. Verify all 4 fields present
3. Verify fields are non-empty strings
4. Test in browser: widget should render and solve

**Acceptance**:
- [ ] Endpoint responds with valid ALTCHA challenge
- [ ] Widget renders in browser
- [ ] User can solve challenge
- [ ] Solved token passes validation on register

---

### Task 2: Add Username Availability Check Endpoint
**Endpoint**: `GET /api/v1/auth/username-available/:username`

**No auth required** (public endpoint, not sensitive)

**Response**:
```json
{
  "available": true
}
```

Or:
```json
{
  "available": false
}
```

**Logic**:
1. Normalize username (lowercase, trim)
2. Check if exists in DB
3. Return result

**Error handling**:
```json
{
  "error": "Username validation failed"
}
```

**Constraints**:
- Only check usernames matching validation rules (3-32 chars, lowercase, no spaces)
- Reject invalid format immediately with `available: false`

---

### Task 3: Add Username Suggestion Endpoint
**Endpoint**: `POST /api/v1/auth/suggest-usernames`

**No auth required**

**Request**:
```json
{
  "desired": "alice"
}
```

**Response**:
```json
{
  "suggestions": [
    "alice123",
    "alice_2024",
    "alice.dev"
  ]
}
```

**Logic**:
1. Take desired username
2. Generate alternatives:
   - Add 2-4 digit suffix: `alice123`, `alice456`, `alice789`
   - Add underscore + year: `alice_2024`, `alice_2025`
   - Add dot + word: `alice.dev`, `alice.chat`
3. Check each against DB
4. Return 3-5 available suggestions

**Constraints**:
- All suggestions must pass username validation rules
- Only return truly available usernames
- Randomize order to avoid predictability

---

### Task 4: Update Registration Response
**Endpoint**: `POST /api/v1/auth/register` (existing, needs update)

**Current request**:
```json
{
  "username": "alice",
  "password": "secret123",
  "inviteCode": "PENTHOUSE-ALPHA",
  "captchaToken": "...",
  "acceptTestNotice": true,
  "testNoticeVersion": "alpha-v1"
}
```

**Needed change**: Add optional `displayName` field

**New request**:
```json
{
  "username": "alice",
  "displayName": "Alice Smith",
  "password": "secret123",
  "inviteCode": "PENTHOUSE-ALPHA",
  "captchaToken": "...",
  "acceptTestNotice": true,
  "testNoticeVersion": "alpha-v1"
}
```

**Logic**:
- If `displayName` provided: use it
- If not provided: use username (backward compatible)

**Update contract**:
```typescript
export const RegisterRequestSchema = z.object({
  username: UsernameSchema,
  displayName: DisplayNameSchema.optional(),  // NEW
  password: PasswordCreationSchema,
  inviteCode: InviteCodeSchema,
  captchaToken: CaptchaTokenSchema,
  acceptTestNotice: z.literal(true),
  testNoticeVersion: TestNoticeVersionSchema
});
```

---

## Frontend Changes (Claude's side)

Will update registration form to:

1. ✏️ Remove invite code field (users don't need it anymore)
2. ✏️ Add display name field (optional, for profile)
3. ✏️ Show password requirements helper text
4. ✏️ Add real-time username availability indicator
5. ✏️ Add "Suggest usernames" button when taken
6. ✏️ Show ALTCHA widget or debug message
7. ✏️ Better error messages (readable, actionable)

---

## Implementation Order

1. **Task 1 (ALTCHA fix)** — Must work first
2. **Task 2 (availability check)** — Frontend can start using this
3. **Task 3 (suggestions)** — Frontend shows alternative usernames
4. **Task 4 (display name)** — Registration accepts it

---

## Testing

For each endpoint:

```bash
# Test availability
curl http://localhost:3000/api/v1/auth/username-available/alice
# Should return: { "available": true } or { "available": false }

# Test suggestions
curl -X POST http://localhost:3000/api/v1/auth/suggest-usernames \
  -H "Content-Type: application/json" \
  -d '{"desired":"alice"}'
# Should return: { "suggestions": ["alice123", "alice_2024", "alice.dev"] }

# Test ALTCHA
curl -X POST http://localhost:3000/api/v1/altcha
# Should return valid challenge with all 4 fields
```

---

## Why This Matters

**Current registration sucks because**:
- CAPTCHA widget doesn't show (confusing)
- Users don't know password rules (enter wrong one, get error)
- "Username taken" offers no help (users stuck)
- No display name option (can't customize profile name)

**After these changes**:
- ✅ CAPTCHA works, user can verify identity
- ✅ Password requirements visible upfront
- ✅ Username checked in real-time with suggestions
- ✅ Users can set readable display name separate from username
- ✅ Registration UX is smooth and helpful

---

## Acceptance Criteria

- [ ] ALTCHA widget renders and works
- [ ] Username availability check returns correct result
- [ ] Username suggestions are valid and available
- [ ] Registration accepts optional displayName
- [ ] All endpoints return flat error strings (not nested)
- [ ] All tests still pass
- [ ] No TypeScript errors
- [ ] Tested in browser: full registration flow succeeds

---

## Notes for Codex

- **ALTCHA**: If endpoint exists but widget doesn't show, likely a JavaScript loading issue or bad response structure. Check browser Network tab and Console.
- **Availability check**: Can be fast (just DB lookup) or cached (users like snappy feedback).
- **Suggestions**: Trade-off between quality and speed. Simple approach: suffix + random number works fine.
- **Display name**: Separate from username is cleaner UX. Keep validation loose (1-40 chars, any case).

---

## Context

User is testing registration on emulator and found CAPTCHA widget missing. This handoff ensures registration is solid before moving to chat testing. All backend work is sequential and non-blocking on each other.

---

## Timeline

**Ideal**: All 4 tasks done by EOD  
**Realistic**: 2-3 hours total  
**Critical path**: Task 1 (ALTCHA) must work first; Tasks 2-4 can be parallel
