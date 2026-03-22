Implement the first admin/operator server-management slice for The Penthouse rebuild. Use this prompt as the contract. Keep scope tight and practical.

Project context
- The Penthouse rebuild is now live publicly
- Mobile: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Shared contracts in `packages/contracts`
- The first admin user-management slice already exists
- This next slice is for admin/operator visibility, not remote control

What to build

1. Add a read-only admin server-management panel
- Admin-only
- Reachable from the existing settings/admin area
- Keep the UI simple, scan-friendly, and operational
- No destructive controls in this pass

2. Add a single admin summary endpoint if needed
- Prefer one additive admin endpoint rather than many tiny calls
- Suggested route:
  - `GET /api/v1/admin/operator/summary`
- Gate it the same way as the rest of the admin surface:
  - authenticated
  - full access required
  - admin only

3. Summary contents
- Include only safe read-only information
- Good target shape:
  - app:
    - name
    - checkedAt
    - databaseReachable
  - members:
    - total
    - active
    - banned
    - removed
    - admins
  - content:
    - chats
    - messages
    - uploads
    - uploadBytesTotal if easy
  - invite:
    - code
    - uses
    - maxUses
    - createdAt
  - push:
    - configured
    - androidTokens
    - iosTokens

4. Important safety rules
- Do not leak secrets
- Do not return filesystem paths
- Do not return raw env var values
- Configuration items should be exposed only as safe booleans or counts
- Keep queries straightforward and cheap

5. UI expectations
- Add a new admin-only settings panel for server management
- Keep the existing user-management panel intact
- Include:
  - loading state
  - error state
  - last refreshed / checked time
  - manual refresh button
- Make the panel readable on mobile without turning into a wall of debug text

6. Tests
- Backend:
  - admin can fetch operator summary
  - non-admin is rejected
  - response shape is correct
- Frontend:
  - admin can open the server panel
  - summary loads and renders
  - refresh action works
  - non-admin does not get the server panel mounted or reachable through normal UI

7. Keep scope tight
- no server restart controls
- no log tail UI
- no deployment controls
- no auth/chat redesign
- no push redesign
- no role editing
- no new analytics system

Likely files
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/admin.ts`
- `services/api/test/integration-auth.test.ts` or a new focused integration test file
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/AdminMemberManagement.vue`
- new component such as `apps/mobile/src/components/AdminServerManagement.vue`
- related frontend tests

Docs
- Update project memory concisely if this lands:
  - `docs/obsidian/00 - Knowledge Hub.md`
  - `docs/obsidian/13 - MVP Stability Plan v2.md`

Validation
- run relevant mobile tests
- run relevant backend tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`

Return
1. Root cause addressed
2. Files changed
3. Response shape / UI summary
4. Tests updated
5. Validation results
6. Any remaining operational risk or manual proof still worth doing
