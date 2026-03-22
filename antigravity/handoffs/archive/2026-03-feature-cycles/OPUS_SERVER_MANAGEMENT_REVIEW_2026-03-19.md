Claude Opus 4.6, do a bounded review of the first admin/operator server-management slice for The Penthouse rebuild after implementation lands.

Review target
- The rebuild is now the live public app
- The first admin user-management slice already exists
- A new admin-only server/operator panel has been added
- This review is about safety, clarity, and operator usefulness, not broad redesign

What to review

1. Admin gating and exposure
- Confirm the server-management panel is only reachable by admins in the UI
- Confirm the backend endpoint is properly gated:
  - authenticated
  - full access required
  - admin only
- Call out any mount/render ambiguity similar to the earlier broad `v-else` admin-panel issue

2. Secret leakage and operator safety
- Confirm the summary does not leak:
  - raw env vars
  - filesystem paths
  - secrets
  - private tokens
- Configuration readiness should be presented only as safe booleans/counts

3. Query and runtime sanity
- Check whether the summary queries are simple and believable for routine admin use
- Call out any expensive or fragile query pattern that could become a problem
- Watch for stale-state or misleading timestamp behavior

4. Product/operator clarity
- The panel should help an admin answer:
  - is the backend healthy?
  - are members/accounts broadly in order?
  - is invite state visible?
  - is push configured and do device tokens exist?
- Call out confusing labels, misleading stats, or information that looks authoritative but is not

5. Scope discipline
- Call out any accidental drift into remote-control tooling, log viewers, or analytics bloat
- This slice should stay read-only and operational

Do not do
- no broad mobile UX redesign
- no push redesign
- no server-restart tooling
- no infra redesign
- no speculative dashboard strategy

Files/seams to review
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/admin.ts`
- relevant backend tests
- `apps/mobile/src/App.vue`
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/components/AdminServerManagement.vue`
- relevant frontend tests

Return
1. Findings first, ordered by severity
2. Any missing acceptance checks
3. Any secret-leak or stale-state risk
4. Brief verdict: safe for real admin/operator use, or not yet
