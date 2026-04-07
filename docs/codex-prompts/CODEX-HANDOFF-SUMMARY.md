# Codex Handoff Summary — PWA Migration Tier 1

**Date**: 2026-04-05  
**From**: Claude (Frontend)  
**To**: Codex (Backend)  
**Status**: User management Tier 1 complete, 2 tasks blocking emulator testing  
**Priority**: Both tasks HIGH

---

## Executive Summary

Frontend is ready for Android emulator testing. **Two backend tasks** are blocking:

1. **ALTCHA Challenge Endpoint** – User can't see captcha widget
2. **Error Response Standardization** – User can't see why operations fail

Both need to be completed before meaningful testing can happen.

---

## Task 1: ALTCHA Challenge Endpoint

**File**: `docs/codex-prompts/HANDOFF-ALTCHA-ENDPOINT.md` (detailed spec)

### What
Implement `POST /api/v1/altcha` to generate proof-of-work challenges for registration captcha.

### Impact
- ALTCHA widget will render and work
- Users can complete registration with real proof-of-work CAPTCHA
- Unblocks registration testing on emulator

### Expected effort
- **Effort**: ~1–2 hours (library does crypto, you just call it)
- **Complexity**: Low (stateless, no DB calls, crypto library handles everything)
- **Blocker for**: Registration flow testing

### Deliverable
```json
POST /api/v1/altcha
Response:
{
  "algorithm": "SHA-256",
  "challenge": "abc123...",
  "salt": "xyz789...",
  "signature": "def456..."
}
```

### Implementation path
1. Install `npm install altcha`
2. Create `services/api/src/routes/altcha.ts`
3. Use `generateChallenge()` from library
4. Store HMAC secret in `.env`
5. Test with curl
6. Run `npm run test` (should all pass)

---

## Task 2: Error Response Standardization

**File**: `docs/codex-prompts/HANDOFF-ERROR-STANDARDIZATION.md` (detailed spec)

### What
Audit all error responses across all routes and ensure they return flat `error` string fields instead of nested objects.

### Current problem
Frontend receives `[object Object]` when backend returns nested error objects → user can't see error messages → can't debug.

### Impact
- All error messages will be readable
- User can see why registration/login/profile operations fail
- Unblocks meaningful emulator testing

### Expected effort
- **Effort**: ~2–3 hours (audit + fixes)
- **Complexity**: Medium (many places to fix, pattern-based fixes)
- **Blocker for**: All emulator testing (can't see failures)

### Deliverable
```json
// Before (wrong):
{
  "error": { "code": 400, "message": "Username validation failed" }
}

// After (correct):
{
  "error": "Username is already taken"
}
```

### Implementation path
1. Search for all `res.status().json()` calls with errors
2. Flatten nested objects to `{ error: "string" }`
3. Use human-readable messages (not error codes)
4. Handle Zod validation errors (flatten field errors)
5. Check global error handler in `src/app.ts`
6. Run `npm run test` (all should pass)

---

## Task 3: Remove inviteCode (non-blocking)

**Status**: Can be done AFTER testing, or deferred to Tier 2

**What**: Remove `inviteCode` validation from registration (frontend currently sends placeholder).

**Effort**: ~30 minutes

**When**: After error standardization is done and testing is complete

**Note**: Not blocking anything; registration works with placeholder.

---

## Current blockers visualization

```
┌─────────────────────────────────────┐
│   Android Emulator Testing Ready    │
│   ✅ User directory                 │
│   ✅ User profiles                  │
│   ✅ Profile editing                │
│   ✅ Online status                  │
│   ✅ Design system                  │
├─────────────────────────────────────┤
│         BLOCKED BY:                 │
│   ❌ ALTCHA widget hidden           │ ← TASK 1
│   ❌ Error messages show [object]   │ ← TASK 2
├─────────────────────────────────────┤
│    User Management Tier 1           │
│        (can't test yet)             │
└─────────────────────────────────────┘
```

---

## What Claude is doing (frontend side)

✅ **Completed**:
- SvelteKit PWA structure
- Authentication page (login + register)
- User directory with search
- User profiles (view + edit)
- All TypeScript types and schemas
- Design system (Gelasio logo, dark theme)
- Documentation (4 Obsidian notes + handoff docs)

⏸️ **Waiting for backend**:
- Uncomment ALTCHA widget (Task 1)
- Test registration on emulator (Tasks 1 + 2)
- Test error messages (Task 2)
- Polish based on feedback

---

## For Codex: Reading order

1. **Start with**: `HANDOFF-ALTCHA-ENDPOINT.md` (smaller task, unblocks widget)
2. **Then**: `HANDOFF-ERROR-STANDARDIZATION.md` (larger but needed for testing)
3. **Reference**: `ERROR_RESPONSE_STANDARDIZATION.md` (detailed spec from original request)
4. **Context**: `docs/obsidian/15 - PWA Migration (SvelteKit).md` (what changed, why)

---

## Verification checklist

After you implement Task 1 (ALTCHA):
- [ ] Frontend widget renders on registration form
- [ ] User can complete CAPTCHA challenge in browser
- [ ] Registration succeeds with real ALTCHA token
- [ ] `npm run test` passes

After you implement Task 2 (Error standardization):
- [ ] Frontend shows readable error messages (not `[object Object]`)
- [ ] All error responses are flat `{ error: "string" }`
- [ ] `npm run test` passes
- [ ] TypeScript: 0 errors

---

## When you're done

1. Push changes to `pwa` branch
2. Claude will:
   - Uncomment ALTCHA widget
   - Remove placeholder token code
   - Test on Android emulator
   - Provide feedback if needed

---

## Questions for Codex?

See the detailed handoff docs:
- `docs/codex-prompts/HANDOFF-ALTCHA-ENDPOINT.md`
- `docs/codex-prompts/HANDOFF-ERROR-STANDARDIZATION.md`

Or ask Claude in the next session.

---

## Timeline

**Ideal**: Both tasks done by EOD so Claude can test on emulator tomorrow  
**Realistic**: Task 1 (1–2h) + Task 2 (2–3h) = ~3–5 hours total  
**Non-urgent**: Task 3 can wait until after testing

---

## Success metrics

✅ **Task 1 complete when**:
- Endpoint exists and returns valid ALTCHA challenge
- Frontend widget renders without errors
- Frontend can solve challenge and register

✅ **Task 2 complete when**:
- All error responses are flat strings
- Frontend shows readable messages (not `[object Object]`)
- All tests still pass

✅ **Overall success when**:
- Claude can test user management Tier 1 on Android emulator
- Claude sees readable errors if something fails
- Claude can register new account with real CAPTCHA

---

## Handoff history

**From Claude**: ✅ Tier 1 user management complete  
→ **To Codex**: 2 backend blockers  
→ **Back to Claude**: Emulator testing and Tier 2 planning
