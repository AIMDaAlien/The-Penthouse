Implement Ops Hardening v2 for The Penthouse rebuild. Use this prompt as the contract. Take your time and optimize for qualitative, truthful results over speed.

Project context
- The Penthouse rebuild is live publicly
- Backend: Fastify + PostgreSQL
- Mobile/admin client: Vue 3 + Vite + Capacitor
- Existing read-only operator panel already shows:
  - app checkedAt
  - member counts
  - content counts
  - realtime counts
  - moderation counts
  - one invite summary
  - push token preference counts
- Existing operator panel is intentionally read-only

Build this exact slice

1. Build / deploy metadata
- Extend the operator summary with a truthful build/runtime section
- Include, if available:
  - process startedAt
  - uptimeSeconds or equivalent
  - app version / package version
  - optional deploy/build identifier from env if present
  - optional deployedAt from env if present
- If a value is not available, expose it as null / unavailable rather than inventing it

2. Uploads / storage diagnostics
- Add honest uploads/storage visibility such as:
  - uploads directory total bytes on disk
  - uploads file count if practical
  - most recent upload timestamp if practical
- Keep this read-only
- Avoid expensive recursive scans on every request if there is a cleaner cached or bounded approach
- If filesystem access fails, surface a truthful unavailable state rather than crashing the summary

3. Push runtime diagnostics
- Add process-level push diagnostics that reflect actual send behavior, for example:
  - successful push sends since process start
  - failed push sends since process start
  - stale/unregistered tokens removed since process start
  - last push failure timestamp if practical
- These must be clearly labeled as process-local / since-start if that is what they are
- Do not claim global historical truth if the counters are in-memory only

4. Error / health diagnostics
- Add a small operator-facing error summary that is honest and bounded, for example:
  - 5xx response count since process start
  - last 5xx timestamp if practical
  - maybe a small breakdown by route group if cheap and clear
- Do not add a log viewer
- Do not expose stack traces or secrets

5. Backup status
- Only add backup status if it is grounded in a real source
- Recommended approach:
  - optional env like `BACKUP_STATUS_PATH`
  - if present, read a small JSON status file with fields such as:
    - lastSuccessfulBackupAt
    - status
    - target
  - if missing or unreadable, show backup status as `unconfigured` or `unavailable`
- Do not invent a fake backup heartbeat

6. Contracts and UI
- Extend `AdminOperatorSummarySchema` carefully so new sections are clearly named
- Update the operator panel UI in a way that keeps:
  - clarity
  - read-only discipline
  - honesty about unknown/unconfigured states
- Favor a few strong cards over metric overload

7. Keep scope tight
- no restart/deploy buttons
- no raw logs panel
- no shell execution
- no backup trigger button
- no cron scheduler implementation
- no remote server control

Likely files
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/admin.ts`
- maybe `services/api/src/app.ts`
- maybe a small new runtime diagnostics utility
- maybe env/config files if needed for optional metadata
- `apps/mobile/src/services/http.ts`
- `apps/mobile/src/components/AdminServerManagement.vue`
- relevant tests

Behavior expectations
- every new metric should have a clear source and meaning
- single-process / since-start counters should be labeled as such
- missing backup configuration should render as an honest unavailable state
- the panel should remain readable on mobile

Tests
- Backend:
  - operator summary shape includes new fields
  - backup status behaves correctly for configured / missing / unreadable states if implemented via file
  - push/error counters do not expose sensitive data
- Frontend:
  - operator panel renders new sections
  - unavailable/unconfigured states render clearly
  - refresh still works
- Manual proof still worth doing:
  - verify build/deploy metadata on the live stack
  - verify uploads/storage numbers are believable
  - force one push failure and confirm the counter moves
  - verify backup status rendering against a real status file if configured

Docs
- Update project memory briefly if this lands:
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
3. New API / contract shapes
4. Tests updated
5. Validation results
6. Any remaining runtime risk or manual proof still worth doing
