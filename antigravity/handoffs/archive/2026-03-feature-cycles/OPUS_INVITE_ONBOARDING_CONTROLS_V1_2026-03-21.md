# Claude / Opus Implementation Prompt: Invite and Onboarding Controls v1

Use this as the implementation prompt, not just a review prompt. Take your time and optimize for qualitative results over speed.

Implement Invite and Onboarding Controls v1 for The Penthouse rebuild. Keep scope disciplined and practical.

Project context
- The Penthouse rebuild is live publicly
- Mobile: Vue 3 + Vite + Capacitor
- Backend: Fastify + PostgreSQL
- Existing onboarding/admin state already includes:
  - invite-only registration using one master invite code
  - admin can view the master invite
  - admin can rotate the master invite
  - admin can view basic operator summary
- User-management UI already exists
- Server-management UI already exists

What this slice should do
- move onboarding beyond a single global invite code
- let admins manage multiple invite codes intentionally
- add a simple registration mode control
- make the onboarding state more legible in both admin UI and member registration UX

Build this exact slice

1. Registration policy
- Add a simple global registration mode with these values:
  - `invite_only`
  - `closed`
- Default should remain `invite_only`
- Behavior:
  - `invite_only`: active invite required
  - `closed`: all new registration attempts rejected with a clear message
- Do not add open registration in this pass

2. Invite model
- Expand invites beyond the single master code
- Support multiple invite codes with:
  - id
  - code
  - label
  - max uses
  - current uses
  - created at
  - optional expires at
  - revoked at
- Keep codes normalized consistently with existing auth constraints
- Preserve the current “master” concept only if it still helps bootstrapping or compatibility
- The main user-facing/admin-facing model should be “active invites,” not “everything revolves around one master code”

3. Backend/admin endpoints
- Add admin-authenticated routes for:
  - list invites
  - create invite
  - revoke invite
  - optionally restore/unrevoke invite if it fits cleanly
  - get/update registration mode
- Keep the API simple and explicit
- Registration should validate against any active, non-expired, non-revoked, non-exhausted invite

4. Admin UI
- Extend the existing admin member/onboarding surface rather than creating a whole new admin app
- Add:
  - current registration mode display/control
  - invite list
  - create invite form
  - revoke action
  - clear labels and status indicators:
    - active
    - exhausted
    - expired
    - revoked
- Preserve the current practical admin tone
- Do not redesign the whole settings area

5. Registration UX
- Make the auth/register surface reflect onboarding reality more clearly:
  - if mode is `closed`, show a clear “registration is currently closed” state
  - if mode is `invite_only`, keep invite input and make the message clearer
- Do not fetch admin-only data into the unauthenticated client unnecessarily
- Use the smallest clean mechanism for exposing public onboarding state
  - for example a small public auth-config endpoint if needed

6. Keep scope tight
- no waitlist
- no email invites
- no magic links
- no invite sharing analytics
- no role-specific invites
- no community-growth platform features
- no major auth redesign

Likely files
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/auth.ts`
- `services/api/src/routes/admin.ts`
- relevant migration file(s)
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/components/AuthPanel.vue`
- `apps/mobile/src/components/AdminMemberManagement.vue`
- relevant tests

Behavior expectations
- admins can create multiple invites intentionally
- revoked/exhausted/expired invites fail cleanly at register time
- registration mode is explicit, not implicit
- onboarding copy becomes clearer without turning into a redesign

Tests
- Backend:
  - register succeeds with a valid active invite
  - revoked invite fails
  - exhausted invite fails
  - expired invite fails
  - closed registration mode fails even with an invite if that is the chosen policy
    - or document the chosen precedence explicitly and test it
  - admin can list/create/revoke invites
  - non-admin cannot manage invites or onboarding mode
- Frontend:
  - admin invite list renders
  - create/revoke flows work
  - registration mode control works
  - auth panel reflects `invite_only` vs `closed`
- Manual proof still worth doing:
  - create two invites with different labels
  - register with one
  - revoke the other
  - switch to closed mode and confirm new registration is blocked

Docs
- Update project memory briefly if this lands:
  - `docs/obsidian/00 - Knowledge Hub.md`
  - `docs/obsidian/07 - User Management Basics.md`
  - `docs/obsidian/13 - MVP Stability Plan v2.md`

Validation
- run relevant mobile tests
- run relevant backend tests
- run `npm --workspace apps/mobile run build`
- run `npm run validate`

Return
1. Root cause addressed
2. Files changed
3. New API / contract shapes
4. Tests updated
5. Validation results
6. Any remaining runtime risk or manual proof still worth doing
