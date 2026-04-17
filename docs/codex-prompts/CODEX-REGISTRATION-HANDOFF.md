# Codex: Registration Flow Complete Handoff

**From**: Claude  
**To**: Codex (GPT-5.4)  
**Date**: 2026-04-06  
**Priority**: HIGH (blocks user testing)  
**Status**: User reported CAPTCHA widget missing, form needs backend features

---

## What User Found (Testing)

1. **CAPTCHA widget invisible** - Form shows "Please complete the captcha challenge" error but no widget visible
2. **Password requirements hidden** - Users don't know constraints before entering
3. **No username availability check** - "Username taken" offers no alternatives
4. **No display name field** - Registration doesn't ask for user's profile name

---

## What Claude Did (Frontend)

### Updated Registration Form
✅ **Display name field added** (optional, 1-40 chars)
✅ **Password requirements shown** with visual indicators:
   - 10-128 character range (shows progress)
   - No leading/trailing spaces check
   - Color-coded: green when met, gray when not

✅ **Removed invite code field** (simplifies form)

✅ **Better CAPTCHA section**:
   - Dedicated "Verify you're human" section
   - Shows "✓ CAPTCHA verified" when complete
   - Clear error messaging

✅ **Updated contracts**:
   - Added optional `displayName` to `RegisterRequestSchema`
   - If not provided, defaults to username
   - Backend can accept it or ignore it

### Contract Change
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

**Status**: TypeScript ✅, Tests ✅ (74/74 passing)

---

## What Codex Must Do (Backend)

### CRITICAL: Fix ALTCHA Endpoint

**Current issue**: Widget shows error but no challenge widget appears

**Debug steps**:
1. Test endpoint directly:
   ```bash
   curl -X POST http://localhost:3000/api/v1/altcha \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

2. Verify response has all 4 fields:
   ```json
   {
     "algorithm": "SHA-256",
     "challenge": "...",
     "salt": "...",
     "signature": "..."
   }
   ```

3. Check browser Network tab:
   - Is the `POST /api/v1/altcha` request succeeding?
   - Is response valid JSON?

4. Check browser Console:
   - Is ALTCHA widget JS loading from CDN?
   - Any JavaScript errors?

**If working**: Widget should render and user can solve challenge  
**If broken**: Fix endpoint response structure

---

### HIGH PRIORITY: Username Availability Check

**New endpoint**: `GET /api/v1/auth/username-available/:username`

```bash
# Test it
curl http://localhost:3000/api/v1/auth/username-available/alice
# Response: { "available": true } or { "available": false }
```

**Specs**:
- No auth required (public endpoint)
- Returns boolean `available`
- Normalize input (lowercase, trim)
- Reject invalid format (< 3 chars, etc.) with `available: false`

**Frontend will use**:
- Check availability as user types
- Show error if taken
- Offer suggestions

---

### HIGH PRIORITY: Username Suggestions

**New endpoint**: `POST /api/v1/auth/suggest-usernames`

```bash
curl -X POST http://localhost:3000/api/v1/auth/suggest-usernames \
  -H "Content-Type: application/json" \
  -d '{"desired":"alice"}'
# Response: { "suggestions": ["alice123", "alice_2024", "alice.dev"] }
```

**Specs**:
- No auth required
- Request: `{ desired: string }`
- Response: `{ suggestions: string[] }`
- Generate 3-5 alternatives (suffix, underscore+year, dot+word)
- Only return available usernames
- All must pass validation rules

---

### MEDIUM PRIORITY: Handle displayName in Registration

**Update endpoint**: `POST /api/v1/auth/register`

**Frontend now sends**:
```json
{
  "username": "alice",
  "displayName": "Alice Smith",  // NEW (optional)
  "password": "...",
  "inviteCode": "PENTHOUSE-ALPHA",
  "captchaToken": "...",
  "acceptTestNotice": true,
  "testNoticeVersion": "alpha-v1"
}
```

**Backend logic**:
- If `displayName` provided: use it (trim whitespace)
- If not provided: use username (backward compatible)
- Validate: 1-40 characters
- Store in `users.display_name` or equivalent

**No schema change needed** - already optional in contracts

---

## Testing Checklist (for Codex)

### ALTCHA Endpoint
- [ ] Direct curl request returns valid challenge
- [ ] Response has all 4 fields (algorithm, challenge, salt, signature)
- [ ] Fields are non-empty strings
- [ ] Browser can load ALTCHA widget from CDN
- [ ] Widget receives challenge and renders
- [ ] User can solve and widget emits payload

### Availability Check
- [ ] Available username returns `{ "available": true }`
- [ ] Taken username returns `{ "available": false }`
- [ ] Invalid format (too short) returns `{ "available": false }`
- [ ] No 500 errors on edge cases

### Suggestions
- [ ] Request with desired username returns array of suggestions
- [ ] Suggestions are all available
- [ ] Suggestions pass validation rules
- [ ] Empty array if no alternatives possible (rare)

### Registration
- [ ] Registration accepts optional `displayName`
- [ ] If provided, user profile has that display name
- [ ] If not provided, display name defaults to username
- [ ] User can set display name immediately after register

---

## Frontend's Waiting On

Frontend registration form is **ready to test** but needs:

1. ✋ ALTCHA endpoint working (widget won't render without it)
2. ✋ Username availability check (for real-time feedback)
3. ✋ Username suggestions (when username taken)
4. ✋ Backend accepting `displayName` in register

Once these are live, full registration flow works end-to-end.

---

## Implementation Order

**Critical path**:
1. **Fix ALTCHA** (first - blocks everything)
2. **Add availability check** (frontend needs this)
3. **Add suggestions** (nice-to-have but expected UX)
4. **Handle displayName** (easy, just accept and store it)

**Estimated effort**:
- ALTCHA debug: 30-60 min (depends on root cause)
- Availability: 30 min (simple DB query)
- Suggestions: 1 hour (logic for variants)
- displayName: 15 min (just store it)

**Total**: 2-3 hours, can parallelize #2-4 while debugging #1

---

## Acceptance Criteria

✅ ALTCHA widget renders and user can solve challenge  
✅ `/auth/username-available` endpoint exists and works  
✅ `/auth/suggest-usernames` endpoint exists and works  
✅ Registration accepts optional `displayName` field  
✅ All error responses return flat strings (not nested objects)  
✅ All tests still pass  
✅ No TypeScript errors  
✅ Tested in browser: registration flow succeeds

---

## Context for Codex

- **Why**: User is testing registration on emulator, found CAPTCHA broken
- **Where**: Frontend ready at `/auth` route with new form
- **When**: Needed before emulator testing can continue
- **What blocks**: Everything - can't register without working auth

All frontend infrastructure ready. Just needs backend endpoints.

---

## Detailed Specs

See separate docs for complete specs:
- `HANDOFF-REGISTRATION-IMPROVEMENTS.md` (comprehensive backend task breakdown)
- `HANDOFF-ALTCHA-ENDPOINT.md` (original ALTCHA spec if needed)

This is the summary handoff. Reference those for detailed requirements.

---

## Quick Summary

**Frontend**: ✅ Registration form improved with password hints, display name field, better CAPTCHA UX  
**Backend**: ⏳ Needs ALTCHA fix + 3 new endpoints (availability, suggestions, displayName support)  
**Timeline**: 2-3 hours for full implementation  
**Blocks**: User testing on emulator

Let me know when endpoints are live and I'll finish the registration flow testing.
