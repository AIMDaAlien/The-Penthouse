# HANDOFF → Codex: ALTCHA Challenge Endpoint

**Priority**: HIGH (blocks registration testing)  
**Blocking**: User management Tier 1 emulator testing  
**Assigned to**: Codex (GPT-5.4)  
**Created**: 2026-04-05

---

## What needs to be done

Implement a new backend endpoint that generates ALTCHA proof-of-work challenges for client-side verification during registration.

## Endpoint specification

### Request
```
POST /api/v1/altcha
Content-Type: application/json
Authorization: (not required, public endpoint)
```

**Request body**: Empty `{}`

### Response (success)
```json
HTTP 200 OK
{
  "algorithm": "SHA-256",
  "challenge": "abc123def456ghi789jkl...",
  "salt": "xyz789...",
  "signature": "def456ghi789..."
}
```

**Fields**:
- `algorithm`: String, one of `"SHA-1"`, `"SHA-256"`, `"SHA-512"` (recommend SHA-256)
- `challenge`: Random hex string, min 1 char
- `salt`: Random hex string, min 1 char
- `signature`: The HMAC signature, min 1 char

### Response (error)
```json
HTTP 500 Internal Server Error
{
  "error": "Failed to generate ALTCHA challenge"
}
```

**Note**: All errors must be flat strings (see ERROR_RESPONSE_STANDARDIZATION.md).

---

## Schema reference

The response shape is defined in `packages/contracts/src/api.ts`:

```typescript
export const AltchaChallengeSchema = z.object({
  algorithm: z.enum(['SHA-1', 'SHA-256', 'SHA-512']),
  challenge: z.string().min(1),
  maxnumber: z.number().int().positive().optional(),
  salt: z.string().min(1),
  signature: z.string().min(1)
});
```

You don't need to validate the request body (it's empty), but validate the response before returning.

---

## How the frontend uses this

### 1. Frontend requests a challenge:
```typescript
const response = await fetch('http://localhost:3000/api/v1/altcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const challenge = await response.json();
// challenge = { algorithm, challenge, salt, signature }
```

### 2. Frontend passes challenge to ALTCHA widget:
```html
<altcha-widget
  challengeurl="http://localhost:3000/api/v1/altcha"
  :challenge="challenge"
></altcha-widget>
```

### 3. Widget solves the challenge (browser-side, proof-of-work):
```typescript
// Widget verifies: SHA-256(challenge + nonce) < signature threshold
// If valid, emits: detail.payload = JSON.stringify({ challenge, nonce, number, algorithm, salt, signature })
```

### 4. Frontend sends solved token with registration:
```typescript
session = await auth.register({
  username: 'alice',
  password: 'secret123',
  captchaToken: detail.payload,  // ← The solved proof-of-work
  inviteCode: 'PLACEHOLDER',     // ← Temporary, remove after this task
  acceptTestNotice: true,
  testNoticeVersion: 'alpha-v1'
});
```

### 5. Backend validates the solved proof:
Currently, the register endpoint accepts `captchaToken` but doesn't validate it (placeholder). You may want to verify it in a follow-up, but for now it just needs to accept it without error.

---

## What's in place (from frontend)

- ✅ ALTCHA CDN script loaded in `apps/web/app.html`
- ✅ Widget element ready (commented out, will uncomment once endpoint exists)
- ✅ Contract schema defined
- ✅ Frontend code ready to call the endpoint
- ✅ Test account ready to use for registration

---

## Implementation notes

### Where to put the code
**File**: `services/api/src/routes/[new altcha.ts]`

Register it in `services/api/src/app.ts`:
```typescript
import altchaRoute from './routes/altcha.js';
app.register(altchaRoute);
```

### ALTCHA library recommendation

Use the official ALTCHA Node.js library:
```bash
npm install altcha
```

Then in your route:
```typescript
import { generateChallenge } from 'altcha';

export default async function altchaRoute(app) {
  app.post('/api/v1/altcha', async (req, reply) => {
    try {
      const challenge = await generateChallenge({
        // Options here (algorithm, maxAttempts, etc)
      });
      reply.code(200).send(challenge);
    } catch (err) {
      reply.code(500).send({
        error: 'Failed to generate ALTCHA challenge'  // ← Flat string!
      });
    }
  });
}
```

Check ALTCHA docs for available options: https://github.com/altcha-ai/altcha

### HMAC secret management

The ALTCHA library typically needs a secret key for signing. Store it in `.env`:
```
ALTCHA_HMAC_SECRET=your-secret-key-here
```

Load it:
```typescript
const secret = process.env.ALTCHA_HMAC_SECRET;
if (!secret) throw new Error('ALTCHA_HMAC_SECRET not set');

const challenge = await generateChallenge({ hmacKey: secret });
```

### Testing the endpoint

Once implemented, test locally:
```bash
curl -X POST http://localhost:3000/api/v1/altcha \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return:
```json
{
  "algorithm": "SHA-256",
  "challenge": "abc123...",
  "salt": "xyz789...",
  "signature": "def456...",
  "maxnumber": 1000000
}
```

---

## Acceptance criteria

- [ ] Endpoint exists at `POST /api/v1/altcha`
- [ ] Returns valid ALTCHA challenge (all 4 required fields)
- [ ] Challenge is randomly generated (different each request)
- [ ] Response validates against `AltchaChallengeSchema`
- [ ] Error responses are flat strings (no nested objects)
- [ ] Frontend widget renders and works
- [ ] Frontend can complete registration with solved ALTCHA token
- [ ] `npm run test` still passes
- [ ] No TypeScript errors in backend

---

## What happens next (Claude's work)

Once this endpoint is live:

1. **Claude** uncomments the ALTCHA widget in `apps/web/src/routes/auth/+page.svelte` (lines 160–167)
2. **Claude** removes the placeholder token code
3. **Claude** tests registration on Android emulator
4. **Claude** collects feedback

---

## Dependencies

**Frontend** is ready and waiting. No frontend changes needed from Claude until this is done.

**Error standardization** (separate task) should also be done, but doesn't block this endpoint specifically.

---

## Notes for Codex

- This is a stateless endpoint (no DB calls needed)
- No authentication required (public registration endpoint)
- Keep it fast (just crypto, no I/O)
- ALTCHA library handles all the crypto; you just call `generateChallenge()`
- Remember: **all error responses must be flat strings** (see ERROR_RESPONSE_STANDARDIZATION.md)

---

## Context for reference

**Frontend state**: User management Tier 1 is otherwise complete. This is the last blocker for emulator testing.

**User story**: User wants to see a working ALTCHA widget on the registration form during Android emulator testing.

**Success**: Endpoint exists, widget renders, user can register with proof-of-work CAPTCHA instead of invite codes.
