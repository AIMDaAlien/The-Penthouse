# Opencode Prompt: User Management UI Slice

Implement the first admin-facing user-management UI slice for The Penthouse rebuild.

Project
- The Penthouse rebuild
- Mobile-first Vue 3 + Vite + Capacitor app
- Active line is effectively `origin/rebuild` even if the local branch says `main`

Important current truth
- The backend/admin APIs already exist for the core user-management actions.
- Do **not** redesign backend semantics in this pass unless you hit a true blocker.
- This slice should consume the existing backend/admin surface.

Existing backend/admin APIs
- `GET /api/v1/admin/invite`
- `POST /api/v1/admin/invite/rotate`
- `GET /api/v1/admin/members`
- `POST /api/v1/admin/members/:memberId/remove`
- `POST /api/v1/admin/members/:memberId/ban`
- `POST /api/v1/admin/members/:memberId/temp-password`

Existing member/self-service APIs
- `GET /api/v1/me`
- `PATCH /api/v1/me/profile`
- `POST /api/v1/me/password`
- `POST /api/v1/me/recovery-code/rotate`

Goal
Add a practical, bounded admin member-management screen using the existing API surface.

What to build

1. Admin entry point
- Add a clearly admin-only way to reach the user-management screen.
- Keep it simple and obvious.
- If the current app already has a settings/profile area, prefer attaching the admin entry there.

2. Member management screen
- Show a searchable member list using the existing admin members endpoint.
- Show at least:
  - username
  - display name if present
  - role
  - status
- Make active / removed / banned states easy to distinguish.

3. Invite management
- Show the current invite code and basic metadata.
- Add a rotate-invite action.
- Make rotation feel deliberate, not accidental.

4. Member actions
- For each eligible member, support:
  - remove
  - ban
  - temporary password issuance
- Use clear confirmation for destructive actions.
- Show the temporary password response in a way an admin can actually use immediately.
- Reflect action results in the UI without requiring a full app restart.

5. Scope discipline
- No new backend features unless a true blocker appears.
- No server-management dashboard.
- No DMs.
- No broad navigation redesign.
- No role-editing/admin-promotion flow unless you discover the existing UI would be unusable without it.

Likely seams
- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/*`
- `apps/mobile/src/services/http.ts`
- `packages/contracts/src/api.ts`
- `services/api/src/routes/admin.ts`

Design guidance
- Preserve the established in-app visual language.
- Favor a compact, clear admin tool over a fancy one.
- This should feel functional and trustworthy, not experimental.

Validation
- relevant mobile tests
- `npm --workspace apps/mobile run build`
- `npm run validate` if shared seams or contracts change

Return
1. Root cause / what was missing
2. Files changed
3. Tests added or updated
4. Validation results
5. Any remaining runtime risk or manual proof still needed
