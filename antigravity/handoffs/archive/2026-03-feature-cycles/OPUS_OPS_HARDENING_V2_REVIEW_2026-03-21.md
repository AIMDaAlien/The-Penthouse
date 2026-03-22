# Claude / Opus Review Prompt: Ops Hardening v2

Use this as a bounded post-implementation review prompt for the newly landed Ops Hardening v2 slice in The Penthouse rebuild.

Claude Opus 4.6, do a bounded review of the new Ops Hardening v2 work for The Penthouse rebuild.

Review target
- This slice extends the existing read-only operator summary
- It may add:
  - build / deploy metadata
  - process uptime / started-at
  - uploads storage stats
  - push send/failure cleanup counters
  - 5xx error counters
  - optional backup status via a real status source
- This review is about operator truthfulness, safety, and usefulness

What to review

1. Truthfulness of metrics
- Are the new metrics actually grounded in real data?
- Are process-local counters labeled honestly if they are only valid since process start?
- Are unknown / unavailable / unconfigured states represented honestly?
- Call out anything that looks authoritative but is actually a weak guess

2. Safety
- Confirm the panel remains read-only
- Confirm no secrets leak:
  - no tokens
  - no raw file paths unless intentionally harmless
  - no stack traces
  - no connection strings
- Confirm no dangerous operator controls were added

3. Operational usefulness
- Are the new sections actually useful for a self-hosted operator?
- Do the uploads / build / backup / push / error surfaces answer real questions?
- Call out anything noisy, redundant, or misleading

4. Failure behavior
- If filesystem or backup status sources fail, does the summary degrade cleanly?
- If metrics are unavailable, does the panel stay useful without pretending everything is fine?

5. Scope discipline
- Call out drift into:
  - deploy tooling
  - restart controls
  - log-viewer bloat
  - fake observability
  - broad infra redesign

Do not do
- no product strategy expansion
- no visual redesign critique
- no unrelated auth/member review

Files/seams to review
- `packages/contracts/src/api.ts`
- `packages/contracts/openapi.v1.yaml`
- `services/api/src/routes/admin.ts`
- any new runtime diagnostics / config helpers
- `apps/mobile/src/components/AdminServerManagement.vue`
- relevant tests

Return
1. Findings first, ordered by severity
2. Any missing acceptance checks
3. Any misleading metric or stale-state risk
4. Brief verdict: safe for real operator use, or not yet
