# Claude Opus 4.6 Prompt: User Management UI Review

Do a bounded review of the first admin-facing user-management UI slice for The Penthouse rebuild after implementation lands.

Project context
- The Penthouse rebuild
- Mobile-first Vue 3 + Vite + Capacitor app
- Backend/admin APIs for user management already exist
- This review is about correctness, permissions, and safe admin behavior, not broad redesign

What to review

1. Admin-only access
- Is the admin entry point actually restricted?
- Could a normal member reach or partially use the admin UI by stale state or hidden navigation bugs?

2. Action correctness
- Are remove / ban / temp-password actions wired to the correct targets?
- Are destructive actions clearly confirmed?
- Does the UI handle immediate state updates correctly after an action?
- Could stale lists or cached state mislead the admin after a change?

3. Invite flow correctness
- Does invite rotation behave clearly and safely?
- Could the UI show an old invite code after rotation?
- Is the “current invite” state trustworthy after refresh/reopen?

4. Risky regressions
- Look for:
  - permission leaks
  - stale-state bugs
  - destructive action mis-targeting
  - temp-password display mistakes
  - admin self-action mistakes
  - regressions to the existing member/self-service flows

Do not do
- no new product redesign
- no server-management dashboard review
- no DMs
- no push review
- no speculative architecture rewrite

Useful seams
- `apps/mobile/src/App.vue`
- `apps/mobile/src/components/*`
- `apps/mobile/src/services/http.ts`
- `services/api/src/routes/admin.ts`
- `packages/contracts/src/api.ts`

Return
1. Findings first, ordered by severity
2. Any missing acceptance checks
3. Whether the slice is safe for real admin use yet
4. Smallest follow-up list only
