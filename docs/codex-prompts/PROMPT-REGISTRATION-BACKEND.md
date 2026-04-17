# PROMPT: Registration Backend Improvements

Copy and send this to Codex when ready.

---

User reported 4 critical registration issues that need backend fixes:

1. **CAPTCHA widget invisible** - Form shows error "Please complete the captcha challenge" but no widget visible
2. **No username availability check** - Users can't tell if username is taken before submitting
3. **No username suggestions** - When username taken, user has no alternatives
4. **Display name missing** - Registration should accept optional `displayName` field

## Frontend status
✅ Registration form updated with:
- Password constraints shown (10-128 chars, no leading/trailing spaces) with visual indicators
- Optional display name field (1-40 chars)
- Better CAPTCHA section layout with verification feedback
- DisplayName field added to RegisterRequestSchema (optional)

Frontend is ready. Needs 4 backend endpoints/fixes:

---

## Task 1: Fix ALTCHA Endpoint (CRITICAL)
**Current issue**: Widget shows error but no challenge appears

**Debug steps**:
```bash
curl -X POST http://localhost:3000/api/v1/altcha \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Verify response has all 4 fields**:
```json
{
  "algorithm": "SHA-256",
  "challenge": "...",
  "salt": "...",
  "signature": "..."
}
```

Check:
- All 4 fields present and non-empty
- Browser Network tab: `POST /api/v1/altcha` succeeding
- Browser Console: ALTCHA widget JS loading, no JS errors

**Acceptance**: Widget renders, user can solve challenge, solved token validates on register

---

## Task 2: Username Availability Check
**Endpoint**: `GET /api/v1/auth/username-available/:username`

**Response**:
```json
{ "available": true }
// or
{ "available": false }
```

**Logic**:
- Normalize username (lowercase, trim)
- Check if exists in DB
- Reject invalid format (< 3 chars, etc.) with `available: false`

**Acceptance**: Returns correct boolean for any input

---

## Task 3: Username Suggestions
**Endpoint**: `POST /api/v1/auth/suggest-usernames`

**Request**:
```json
{ "desired": "alice" }
```

**Response**:
```json
{ "suggestions": ["alice123", "alice_2024", "alice.dev"] }
```

**Logic**:
- Generate 3-5 alternatives (suffix, underscore+year, dot+word)
- Check each against DB
- Return only available usernames
- All must pass validation

**Acceptance**: Returns array of 3-5 valid, available suggestions

---

## Task 4: Handle displayName in Registration
**Endpoint**: `POST /api/v1/auth/register` (update existing)

**Frontend now sends**:
```json
{
  "username": "alice",
  "displayName": "Alice Smith",
  "password": "...",
  "inviteCode": "PENTHOUSE-ALPHA",
  "captchaToken": "...",
  "acceptTestNotice": true,
  "testNoticeVersion": "alpha-v1"
}
```

**Logic**:
- If `displayName` provided: use it (trim whitespace)
- If not provided: use username (backward compatible)
- Validate: 1-40 characters
- Store in `users.display_name`

**Acceptance**: Registration accepts optional displayName, stores correctly

---

## Testing
```bash
# Availability
curl http://localhost:3000/api/v1/auth/username-available/alice
# Should return: { "available": true } or { "available": false }

# Suggestions
curl -X POST http://localhost:3000/api/v1/auth/suggest-usernames \
  -H "Content-Type: application/json" \
  -d '{"desired":"alice"}'
# Should return: { "suggestions": ["alice123", "alice_2024", ...] }

# ALTCHA
curl -X POST http://localhost:3000/api/v1/altcha
# Should return valid challenge with all 4 fields
```

---

## Priority
1. Fix ALTCHA (first - blocks everything)
2. Username available (frontend needs this)
3. Username suggestions (nice UX, parallel with #2)
4. DisplayName support (easy, parallel with #2-3)

Estimated: 2-3 hours total. All work is on `services/api/` and database layer only.
