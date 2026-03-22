# Invite and Onboarding Controls v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single master invite code with multi-invite management, add a registration mode toggle, and make the registration UX reflect onboarding state.

**Architecture:** New `server_settings` table for registration mode. Restructured `signup_invites` with UUID PK, label, and no more `system_key`. Registration validates against any active invite when mode is `invite_only`, rejects all when `closed`. Public auth config endpoint exposes registration mode to unauthenticated clients.

**Tech Stack:** Fastify + PostgreSQL (backend), Vue 3 (mobile), Zod contracts, node:test + Fastify inject (integration tests), Vitest (frontend tests)

**Scope notes:**

- **Unrevoke/restore:** Intentionally deferred. Revoke is a one-way action for v1. Admin can create a new invite instead. Keeps the model simple and the audit trail clean.
- **OpenAPI spec:** `packages/contracts/openapi.v1.yaml` is not currently kept in sync with every endpoint. Skipping for this pass — the Zod contracts are the source of truth.

---

## File Map

### Create
- `services/api/src/db/migrations/013_invite_onboarding.sql` — schema migration
- `services/api/src/utils/settings.ts` — server settings read/write helpers
- `services/api/test/integration-invites.test.ts` — integration tests for invite CRUD + registration mode
- `apps/mobile/src/components/AdminInviteManagement.vue` — admin invite list + create + revoke + registration mode UI
- `apps/mobile/src/components/AdminInviteManagement.test.ts` — frontend unit tests

### Modify
- `packages/contracts/src/api.ts` — new Zod schemas + types for invites, registration mode, auth config
- `services/api/src/routes/admin.ts` — replace master invite endpoints with multi-invite CRUD + registration mode
- `services/api/src/routes/auth.ts` — registration checks mode + validates any active invite
- `services/api/test/helpers.ts` — cleanup() adapts to new schema (no more system_key)
- `apps/mobile/src/services/http.ts` — new API client functions
- `apps/mobile/src/components/AuthPanel.vue` — reflect closed vs invite_only mode
- `apps/mobile/src/App.vue` — add AdminInviteManagement tab
- `apps/mobile/src/App.test.ts` — mock new http functions
- `services/api/test/integration-auth.test.ts` — update existing tests that reference master invite

---

### Task 1: Database Migration

**Files:**
- Create: `services/api/src/db/migrations/013_invite_onboarding.sql`

- [ ] **Step 1: Write the migration**

```sql
-- server_settings table
CREATE TABLE IF NOT EXISTS server_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO server_settings (key, value)
VALUES ('registration_mode', 'invite_only')
ON CONFLICT (key) DO NOTHING;

-- Restructure signup_invites: add id and label, swap PK
ALTER TABLE signup_invites
ADD COLUMN IF NOT EXISTS id UUID;

-- Backfill existing rows with UUIDs
UPDATE signup_invites SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE signup_invites
ALTER COLUMN id SET NOT NULL,
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE signup_invites
ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '';

-- Update label for existing alpha invite
UPDATE signup_invites SET label = 'Alpha invite' WHERE code = 'PENTHOUSE-ALPHA';

-- Swap PK from code to id (safely look up actual constraint name)
DO $$
DECLARE
  pk_name TEXT;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'signup_invites'::regclass
    AND contype = 'p';
  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE signup_invites DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;

ALTER TABLE signup_invites ADD PRIMARY KEY (id);

-- code must remain unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'signup_invites_code_unique'
  ) THEN
    ALTER TABLE signup_invites
    ADD CONSTRAINT signup_invites_code_unique UNIQUE (code);
  END IF;
END $$;

-- Drop system_key column and its constraint
ALTER TABLE signup_invites DROP CONSTRAINT IF EXISTS signup_invites_system_key_unique;
ALTER TABLE signup_invites DROP COLUMN IF EXISTS system_key;
```

- [ ] **Step 2: Verify migration runs**

Run: `cd services/api && npx tsx src/db/migrate.ts`
Expected: Migration 013 applies without errors.

- [ ] **Step 3: Commit**

```bash
git add services/api/src/db/migrations/013_invite_onboarding.sql
git commit -m "feat: add server_settings table and restructure signup_invites for multi-invite"
```

---

### Task 2: Server Settings Utility

**Files:**
- Create: `services/api/src/utils/settings.ts`

- [ ] **Step 1: Write the settings utility**

```typescript
import type { Pool, PoolClient } from 'pg';

export type RegistrationMode = 'invite_only' | 'closed';

const VALID_REGISTRATION_MODES: readonly string[] = ['invite_only', 'closed'];

export async function getRegistrationMode(db: Pool | PoolClient): Promise<RegistrationMode> {
  const result = await db.query(
    `SELECT value FROM server_settings WHERE key = 'registration_mode'`
  );
  const value = result.rows[0]?.value;
  if (VALID_REGISTRATION_MODES.includes(value)) return value as RegistrationMode;
  return 'invite_only';
}

export async function setRegistrationMode(db: Pool | PoolClient, mode: RegistrationMode): Promise<void> {
  await db.query(
    `INSERT INTO server_settings (key, value, updated_at)
     VALUES ('registration_mode', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [mode]
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/utils/settings.ts
git commit -m "feat: add server settings utility for registration mode"
```

---

### Task 3: Contracts — New Zod Schemas

**Files:**
- Modify: `packages/contracts/src/api.ts`

- [ ] **Step 1: Add new schemas and types**

Add after `ModerationActionSchema`:

```typescript
export const RegistrationModeSchema = z.enum(['invite_only', 'closed']);
```

Add after `AdminInviteResponseSchema`:

```typescript
export const AdminInviteDetailSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  uses: z.number().int().nonnegative(),
  maxUses: z.number().int().positive(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string()
});

export const CreateInviteRequestSchema = z.object({
  label: z.string().trim().min(1).max(100),
  maxUses: z.number().int().min(1).max(999999).default(999999),
  expiresAt: z.string().nullable().optional()
});

export const RegistrationModeResponseSchema = z.object({
  registrationMode: RegistrationModeSchema
});

export const UpdateRegistrationModeRequestSchema = z.object({
  registrationMode: RegistrationModeSchema
});

export const AuthConfigResponseSchema = z.object({
  registrationMode: RegistrationModeSchema
});
```

Add corresponding type exports:

```typescript
export type RegistrationMode = z.infer<typeof RegistrationModeSchema>;
export type AdminInviteDetail = z.infer<typeof AdminInviteDetailSchema>;
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;
export type RegistrationModeResponse = z.infer<typeof RegistrationModeResponseSchema>;
export type UpdateRegistrationModeRequest = z.infer<typeof UpdateRegistrationModeRequestSchema>;
export type AuthConfigResponse = z.infer<typeof AuthConfigResponseSchema>;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run --workspace packages/contracts typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/api.ts
git commit -m "feat: add Zod schemas for multi-invite and registration mode"
```

---

### Task 4: Backend — Admin Invite CRUD + Registration Mode Endpoints

**Files:**
- Modify: `services/api/src/routes/admin.ts`

- [ ] **Step 1: Replace master invite endpoints with multi-invite CRUD**

Remove: `getMasterInvite()` function, `GET /api/v1/admin/invite`, `POST /api/v1/admin/invite/rotate`

Add imports:
```typescript
import {
  AdminInviteDetailSchema,
  CreateInviteRequestSchema,
  RegistrationModeResponseSchema,
  UpdateRegistrationModeRequestSchema
} from '@penthouse/contracts';
import { createInviteCode } from '../utils/security.js';
import { getRegistrationMode, setRegistrationMode } from '../utils/settings.js';
```

Add new endpoints:

```typescript
// GET /api/v1/admin/invites — list all invites
app.get('/api/v1/admin/invites', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
  const forbidden = ensureAdmin(request, reply);
  if (forbidden) return forbidden;

  const result = await pool.query(
    `SELECT id, code, label, max_uses, uses, expires_at, revoked_at, created_at
     FROM signup_invites
     ORDER BY created_at DESC`
  );

  return result.rows.map((row: any) => AdminInviteDetailSchema.parse({
    id: row.id,
    code: row.code,
    label: row.label,
    uses: Number(row.uses),
    maxUses: Number(row.max_uses),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  }));
});

// POST /api/v1/admin/invites — create new invite
app.post('/api/v1/admin/invites', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
  const forbidden = ensureAdmin(request, reply);
  if (forbidden) return forbidden;

  const parsed = CreateInviteRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

  const code = createInviteCode();
  const { label, maxUses, expiresAt } = parsed.data;

  const result = await pool.query(
    `INSERT INTO signup_invites (id, code, label, max_uses, expires_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     RETURNING id, code, label, max_uses, uses, expires_at, revoked_at, created_at`,
    [code, label, maxUses, expiresAt ?? null]
  );

  const row = result.rows[0];
  return reply.status(201).send(AdminInviteDetailSchema.parse({
    id: row.id,
    code: row.code,
    label: row.label,
    uses: Number(row.uses),
    maxUses: Number(row.max_uses),
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  }));
});

// POST /api/v1/admin/invites/:inviteId/revoke — revoke an invite
app.post('/api/v1/admin/invites/:inviteId/revoke', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
  const forbidden = ensureAdmin(request, reply);
  if (forbidden) return forbidden;

  const { inviteId } = request.params as { inviteId: string };
  const result = await pool.query(
    `UPDATE signup_invites
     SET revoked_at = NOW()
     WHERE id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [inviteId]
  );

  if (!result.rowCount) {
    return reply.status(404).send({ error: 'Invite not found or already revoked' });
  }

  return reply.status(204).send();
});

// GET /api/v1/admin/registration-mode
app.get('/api/v1/admin/registration-mode', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
  const forbidden = ensureAdmin(request, reply);
  if (forbidden) return forbidden;

  const registrationMode = await getRegistrationMode(pool);
  return RegistrationModeResponseSchema.parse({ registrationMode });
});

// PUT /api/v1/admin/registration-mode
app.put('/api/v1/admin/registration-mode', { preHandler: [app.authenticate, app.requireFullAccess] }, async (request, reply) => {
  const forbidden = ensureAdmin(request, reply);
  if (forbidden) return forbidden;

  const parsed = UpdateRegistrationModeRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

  await setRegistrationMode(pool, parsed.data.registrationMode);
  return RegistrationModeResponseSchema.parse({ registrationMode: parsed.data.registrationMode });
});
```

- [ ] **Step 2: Update operator summary to use new invite list instead of master invite**

In the operator summary endpoint, replace the single `invite` field with an `invites` object that counts active/total invites. Update `getMasterInvite()` references. For backward compat with the existing `AdminOperatorSummarySchema`, update the invite field to show the first active invite's stats (or zeros if none).

Actually, to keep scope minimal: keep the `invite` field in operator summary but source it from the first active invite row instead of the master invite. Remove the `getMasterInvite()` function.

```typescript
// Replace getMasterInvite() call in operator summary with:
const firstActiveInvite = await pool.query(
  `SELECT code, uses, max_uses, created_at
   FROM signup_invites
   WHERE revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > NOW())
   ORDER BY created_at ASC
   LIMIT 1`
);
const invite = firstActiveInvite.rows[0] as { code: string; uses: number; max_uses: number; created_at: string } | undefined;
```

- [ ] **Step 3: Add public auth config endpoint to auth routes**

In `services/api/src/routes/auth.ts`, add:

```typescript
import { getRegistrationMode } from '../utils/settings.js';

// Inside registerAuthRoutes, add:
app.get('/api/v1/auth/config', async () => {
  const registrationMode = await getRegistrationMode(pool);
  return { registrationMode };
});
```

- [ ] **Step 4: Run typecheck**

Run: `npm run --workspace services/api typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/routes/admin.ts services/api/src/routes/auth.ts
git commit -m "feat: add multi-invite CRUD, registration mode endpoints, and public auth config"
```

---

### Task 5: Backend — Registration Validates Mode + Any Active Invite

**Files:**
- Modify: `services/api/src/routes/auth.ts`

- [ ] **Step 1: Update registration to check mode first, then validate any active invite**

In the `POST /api/v1/auth/register` handler, after request validation and test notice check, before the DB transaction:

```typescript
// Check registration mode first
const registrationMode = await getRegistrationMode(pool);
if (registrationMode === 'closed') {
  return reply.status(403).send({ error: 'Registration is currently closed' });
}
```

Inside the transaction, replace the master-only invite lookup:

```typescript
// OLD: WHERE code = $1 AND system_key = $2
// NEW: validate against any active invite by code
const invite = await client.query(
  `SELECT id, code, max_uses, uses, expires_at, revoked_at
   FROM signup_invites
   WHERE code = $1
   FOR UPDATE`,
  [inviteCode]
);
```

Remove the `MASTER_INVITE_SYSTEM_KEY` constant from auth.ts since it's no longer used there.

- [ ] **Step 2: Run typecheck**

Run: `npm run --workspace services/api typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add services/api/src/routes/auth.ts
git commit -m "feat: registration checks mode then validates any active invite"
```

---

### Task 6: Test Helper Updates

**Files:**
- Modify: `services/api/test/helpers.ts`

- [ ] **Step 1: Update cleanup() to work with new schema**

The cleanup function currently references `system_key`. Update it to work without:

```typescript
// Replace the signup_invites cleanup lines with:
await client.query(`DELETE FROM signup_invites`);
await client.query(
  `INSERT INTO signup_invites(id, code, label, max_uses, uses)
   VALUES (gen_random_uuid(), 'PENTHOUSE-ALPHA', 'Test invite', 999999, 0)`
);

// Also reset server_settings to invite_only
await client.query(
  `INSERT INTO server_settings (key, value, updated_at)
   VALUES ('registration_mode', 'invite_only', NOW())
   ON CONFLICT (key) DO UPDATE SET value = 'invite_only', updated_at = NOW()`
);
```

- [ ] **Step 2: Run existing integration tests to verify nothing breaks**

Run: `cd services/api && npx tsx --test test/integration-auth.test.ts`
Expected: All existing auth tests pass (some may need minor updates — see Task 8).

- [ ] **Step 3: Commit**

```bash
git add services/api/test/helpers.ts
git commit -m "fix: update test helpers for multi-invite schema"
```

---

### Task 7: Integration Tests — Invite CRUD + Registration Mode

**Files:**
- Create: `services/api/test/integration-invites.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const SKIP = !process.env.DATABASE_URL ? 'DATABASE_URL not set — skipping integration tests' : undefined;

async function promoteAdmin(username: string) {
  const { pool } = await import('./helpers.js');
  await pool.query(`UPDATE users SET role = 'admin' WHERE username = $1`, [username]);
}

describe('[integration] invite management', { skip: SKIP, concurrency: false }, () => {
  let app: any;

  beforeEach(async () => {
    process.env.JWT_SECRET ??= 'integration-test-jwt-secret-long-enough';
    const helpers = await import('./helpers.js');
    await helpers.migrate();
    await helpers.cleanup();
    const result = await helpers.buildTestApp();
    app = result.app;
  });

  afterEach(async () => {
    await app?.close();
    const helpers = await import('./helpers.js');
    await helpers.cleanup();
  });

  test('admin can list invites', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'invite_admin');
    await promoteAdmin('invite_admin');

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(res.statusCode, 200);
    const invites = JSON.parse(res.payload);
    assert.ok(invites.length >= 1);
    assert.ok(invites.some((inv: any) => inv.code === 'PENTHOUSE-ALPHA'));
  });

  test('admin can create a new invite with label and max uses', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'create_inv_admin');
    await promoteAdmin('create_inv_admin');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Friends batch', maxUses: 5 }
    });
    assert.equal(res.statusCode, 201);
    const created = JSON.parse(res.payload);
    assert.equal(created.label, 'Friends batch');
    assert.equal(created.maxUses, 5);
    assert.equal(created.uses, 0);
    assert.ok(created.id);
    assert.ok(created.code);
  });

  test('register succeeds with a newly created invite', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'reg_inv_admin');
    await promoteAdmin('reg_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Test batch', maxUses: 1 }
    });
    const invite = JSON.parse(createRes.payload);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'invited_user',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 201);
  });

  test('revoked invite fails at registration', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'revoke_inv_admin');
    await promoteAdmin('revoke_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Revokable', maxUses: 10 }
    });
    const invite = JSON.parse(createRes.payload);

    const revokeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/invites/${invite.id}/revoke`,
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(revokeRes.statusCode, 204);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'revoked_user',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 400);
  });

  test('exhausted invite fails at registration', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'exhaust_inv_admin');
    await promoteAdmin('exhaust_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Single use', maxUses: 1 }
    });
    const invite = JSON.parse(createRes.payload);

    // Use it once
    const firstReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'exhaust_first',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(firstReg.statusCode, 201);

    // Second use should fail
    const secondReg = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'exhaust_second',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(secondReg.statusCode, 400);
  });

  test('expired invite fails at registration', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const admin = await registerUser(app, 'expire_inv_admin');
    await promoteAdmin('expire_inv_admin');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(admin.accessToken),
      payload: { label: 'Expiring', maxUses: 10, expiresAt: new Date(Date.now() - 86400_000).toISOString() }
    });
    assert.equal(createRes.statusCode, 201);
    const invite = JSON.parse(createRes.payload);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'expired_user',
        password: 'supersecurepassword',
        inviteCode: invite.code,
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 400);
  });

  test('closed registration mode rejects even with a valid invite', async () => {
    const { registerUser, authHeaders, pool } = await import('./helpers.js');
    const admin = await registerUser(app, 'closed_admin');
    await promoteAdmin('closed_admin');

    // Switch to closed
    const modeRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken),
      payload: { registrationMode: 'closed' }
    });
    assert.equal(modeRes.statusCode, 200);

    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'closed_user',
        password: 'supersecurepassword',
        inviteCode: 'PENTHOUSE-ALPHA',
        acceptTestNotice: true,
        testNoticeVersion: 'alpha-v1'
      }
    });
    assert.equal(regRes.statusCode, 403);
    assert.match(regRes.payload, /closed/i);
  });

  test('public auth config exposes registration mode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/config'
    });
    assert.equal(res.statusCode, 200);
    const config = JSON.parse(res.payload);
    assert.equal(config.registrationMode, 'invite_only');
  });

  test('non-admin cannot manage invites', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const member = await registerUser(app, 'nonadmin_inv');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/invites',
      headers: authHeaders(member.accessToken)
    });
    assert.equal(listRes.statusCode, 403);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: authHeaders(member.accessToken),
      payload: { label: 'Sneaky', maxUses: 1 }
    });
    assert.equal(createRes.statusCode, 403);
  });

  test('admin can get and update registration mode', async () => {
    const { registerUser, authHeaders } = await import('./helpers.js');
    const admin = await registerUser(app, 'mode_admin');
    await promoteAdmin('mode_admin');

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(getRes.statusCode, 200);
    assert.equal(JSON.parse(getRes.payload).registrationMode, 'invite_only');

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken),
      payload: { registrationMode: 'closed' }
    });
    assert.equal(putRes.statusCode, 200);
    assert.equal(JSON.parse(putRes.payload).registrationMode, 'closed');

    // Verify persistence
    const getRes2 = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/registration-mode',
      headers: authHeaders(admin.accessToken)
    });
    assert.equal(JSON.parse(getRes2.payload).registrationMode, 'closed');
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `cd services/api && npx tsx --test test/integration-invites.test.ts`
Expected: All tests pass (or skip if DATABASE_URL not set).

- [ ] **Step 3: Commit**

```bash
git add services/api/test/integration-invites.test.ts
git commit -m "test: add integration tests for invite CRUD and registration mode"
```

---

### Task 8: Update Existing Integration Tests

**Files:**
- Modify: `services/api/test/integration-auth.test.ts`

- [ ] **Step 1: Update tests that reference master invite**

The test "configured bootstrap username becomes admin and invite rotation replaces the master code" needs updating:
- Remove the `GET /api/v1/admin/invite` check (endpoint removed)
- Remove the `POST /api/v1/admin/invite/rotate` check (endpoint removed)
- Keep the admin bootstrap assertion
- The old invite registration check stays (PENTHOUSE-ALPHA still exists as a regular invite)

Update the operator summary test: the `invite.code` assertion may now return the first active invite or empty. Adjust assertion to check shape rather than specific value.

- [ ] **Step 2: Run all integration tests**

Run: `cd services/api && npx tsx --test test/integration-auth.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/api/test/integration-auth.test.ts
git commit -m "fix: update auth integration tests for multi-invite schema"
```

---

### Task 9: Mobile HTTP Service — New API Functions

**Files:**
- Modify: `apps/mobile/src/services/http.ts`

- [ ] **Step 1: Add new API functions and update imports**

Add new imports from contracts:
```typescript
import type {
  AdminInviteDetail,
  AuthConfigResponse,
  CreateInviteRequest,
  RegistrationModeResponse,
  UpdateRegistrationModeRequest
} from '@penthouse/contracts';
```

Replace `getAdminInvite` and `rotateAdminInvite` with:

```typescript
export async function getAuthConfig(): Promise<AuthConfigResponse> {
  const response = await http.get<AuthConfigResponse>('/api/v1/auth/config');
  return response.data;
}

export async function getAdminInvites(): Promise<AdminInviteDetail[]> {
  const response = await http.get<AdminInviteDetail[]>('/api/v1/admin/invites');
  return response.data;
}

export async function createAdminInvite(data: CreateInviteRequest): Promise<AdminInviteDetail> {
  const response = await http.post<AdminInviteDetail>('/api/v1/admin/invites', data);
  return response.data;
}

export async function revokeAdminInvite(inviteId: string): Promise<void> {
  await http.post(`/api/v1/admin/invites/${inviteId}/revoke`);
}

export async function getRegistrationMode(): Promise<RegistrationModeResponse> {
  const response = await http.get<RegistrationModeResponse>('/api/v1/admin/registration-mode');
  return response.data;
}

export async function updateRegistrationMode(data: UpdateRegistrationModeRequest): Promise<RegistrationModeResponse> {
  const response = await http.put<RegistrationModeResponse>('/api/v1/admin/registration-mode', data);
  return response.data;
}
```

Remove: `getAdminInvite`, `rotateAdminInvite` functions.

- [ ] **Step 2: Run typecheck**

Run: `npm run --workspace apps/mobile typecheck`
Expected: PASS (after fixing references in AdminMemberManagement.vue — next task)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/http.ts
git commit -m "feat: add invite management and registration mode API functions"
```

---

### Task 10: Admin UI — Invite Management Component

**Files:**
- Create: `apps/mobile/src/components/AdminInviteManagement.vue`

- [ ] **Step 1: Build the admin invite management component**

This component includes:
- Registration mode display and toggle (invite_only / closed)
- Invite list with status indicators (active, exhausted, expired, revoked)
- Create invite form (label + optional max uses)
- Revoke button per invite

Follow the existing admin component patterns from `AdminMemberManagement.vue` and `AdminModerationManagement.vue` for styling and layout.

Key behaviors:
- Load invites and registration mode on mount
- Create invite: POST, refresh list
- Revoke invite: POST with confirmation, refresh list
- Toggle mode: PUT with confirmation (especially for switching to closed)

Status logic per invite:
- `revokedAt` set → "revoked"
- `expiresAt` in the past → "expired"
- `uses >= maxUses` → "exhausted"
- otherwise → "active"

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/AdminInviteManagement.vue
git commit -m "feat: add AdminInviteManagement component"
```

---

### Task 11: Update AdminMemberManagement — Remove Old Invite Section

**Files:**
- Modify: `apps/mobile/src/components/AdminMemberManagement.vue`

- [ ] **Step 1: Remove the master invite section**

Remove:
- The entire `invite-card` section from template (lines 10-44)
- `invite` ref, `loadingInvite`, `rotatingInvite`, `inviteError`, `inviteSuccess` refs
- `loadInvite()`, `handleRotateInvite()` functions
- `getAdminInvite`, `rotateAdminInvite` imports from http
- `AdminInviteResponse` type import
- The `loadInvite()` call from `onMounted`
- Related CSS (`.invite-card`, `.invite-head`, `.invite-meta-grid`, `.invite-meta-pill`, `.invite-created-pill`)

The component now only manages members (search, list, remove/ban/temp-password).

- [ ] **Step 2: Run typecheck**

Run: `npm run --workspace apps/mobile typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/AdminMemberManagement.vue
git commit -m "refactor: remove old master invite section from member management"
```

---

### Task 12: Wire AdminInviteManagement into App.vue

**Files:**
- Modify: `apps/mobile/src/App.vue`

- [ ] **Step 1: Add the Invites tab for admins**

Import the component:
```typescript
import AdminInviteManagement from './components/AdminInviteManagement.vue';
```

Add a new tab button in the admin settings tabs area (after "User Management", before "Server Management"):
```html
<button class="small-btn" :class="{ secondary: settingsPanel !== 'invites' }" @click="settingsPanel = 'invites'">
  Invites
</button>
```

Add the component rendering:
```html
<AdminInviteManagement
  v-else-if="settingsPanel === 'invites' && session.user.role === 'admin'"
/>
```

- [ ] **Step 2: Run typecheck**

Run: `npm run --workspace apps/mobile typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/App.vue
git commit -m "feat: wire AdminInviteManagement tab into admin settings"
```

---

### Task 13: AuthPanel — Reflect Registration Mode

**Files:**
- Modify: `apps/mobile/src/components/AuthPanel.vue`

- [ ] **Step 1: Add registration mode awareness**

Add a prop for registration mode:
```typescript
const props = defineProps<{
  error: string;
  loading: boolean;
  registrationMode?: 'invite_only' | 'closed';
}>();
```

In the template, when mode is `register`:
- If `registrationMode === 'closed'`: show a clear message "Registration is currently closed" instead of the form fields. Hide the invite input and submit button.
- If `registrationMode === 'invite_only'` (or undefined for backward compat): show the existing invite code form as-is.

```html
<div v-if="mode === 'register' && props.registrationMode === 'closed'" class="registration-closed-notice">
  <p>Registration is currently closed.</p>
  <p class="small">Check back later or contact an admin for access.</p>
</div>
```

- [ ] **Step 2: Pass registrationMode from App.vue**

In `App.vue`, fetch auth config on app load (before auth check) and pass it to `AuthPanel`:
```typescript
import { getAuthConfig } from './services/http';

const registrationMode = ref<'invite_only' | 'closed'>('invite_only');

// In onMounted or initialization:
getAuthConfig().then(config => {
  registrationMode.value = config.registrationMode;
}).catch(() => {
  // Fallback to invite_only if config fetch fails
});
```

```html
<AuthPanel
  :error="authError"
  :loading="authLoading"
  :registrationMode="registrationMode"
  @login="handleLogin"
  @register="handleRegister"
  @reset-password="handleResetPassword"
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/AuthPanel.vue apps/mobile/src/App.vue
git commit -m "feat: AuthPanel reflects registration mode (invite_only vs closed)"
```

---

### Task 14: Frontend Unit Tests

**Files:**
- Create: `apps/mobile/src/components/AdminInviteManagement.test.ts`
- Modify: `apps/mobile/src/App.test.ts`

- [ ] **Step 1: Write AdminInviteManagement tests**

Test:
- Invite list renders with correct status chips (active, revoked, exhausted)
- Create invite form submits and refreshes list
- Revoke action calls API and refreshes
- Registration mode toggle works

- [ ] **Step 2: Update App.test.ts mocks**

Add mocks for new http functions:
```typescript
getAuthConfig: vi.fn(() => Promise.resolve({ registrationMode: 'invite_only' })),
getAdminInvites: vi.fn(() => Promise.resolve([])),
createAdminInvite: vi.fn(() => Promise.resolve({ id: 'inv-1', code: 'TEST-CODE', label: 'Test', uses: 0, maxUses: 10, expiresAt: null, revokedAt: null, createdAt: new Date().toISOString() })),
revokeAdminInvite: vi.fn(() => Promise.resolve()),
getRegistrationMode: vi.fn(() => Promise.resolve({ registrationMode: 'invite_only' })),
updateRegistrationMode: vi.fn(() => Promise.resolve({ registrationMode: 'closed' })),
```

Remove mocks for removed functions: `getAdminInvite`, `rotateAdminInvite`.

- [ ] **Step 3: Run frontend tests**

Run: `npm run --workspace apps/mobile test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/AdminInviteManagement.test.ts apps/mobile/src/App.test.ts
git commit -m "test: add invite management tests and update App.test.ts mocks"
```

---

### Task 15: Validation

- [ ] **Step 1: Run full typecheck**

Run: `npm run validate`
Expected: All workspaces typecheck and test successfully.

- [ ] **Step 2: Run mobile build**

Run: `npm --workspace apps/mobile run build`
Expected: Build completes without errors.

- [ ] **Step 3: Final commit if any cleanup needed**

---

### Task 16: Documentation Updates

**Files:**
- Modify: `docs/obsidian/00 - Knowledge Hub.md`
- Modify: `docs/obsidian/07 - User Management Basics.md`
- Modify: `docs/obsidian/13 - MVP Stability Plan v2.md`

- [ ] **Step 1: Add brief notes about invite and onboarding controls**

Note that registration now supports multiple invites and a registration mode toggle (invite_only / closed). The admin UI has an Invites tab for managing codes.

- [ ] **Step 2: Commit**

```bash
git add docs/obsidian/
git commit -m "docs: update obsidian notes for invite and onboarding controls v1"
```
