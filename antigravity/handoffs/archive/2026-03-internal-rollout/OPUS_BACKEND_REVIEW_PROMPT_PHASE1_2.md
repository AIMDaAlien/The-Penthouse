# Opus Review Prompt: Backend Phase 1/2 (Test-Notice Gating)

Review the recent backend-only changes for MVP Stability Plan v2.

## Review Scope

- Contracts/OpenAPI updates for:
  - register acknowledgement fields
  - auth user notice-gating fields
  - notice acknowledgement endpoint schema
- API/auth behavior:
  - register requires current notice version
  - protected routes gated when notice not accepted
  - acknowledgement endpoint idempotency and safety
- Realtime auth behavior under notice-gated users
- Regression risk on existing auth/session flows

## Explicit Focus

1. State correctness:
   - accepted version vs required version transitions
   - behavior after version bump
2. Gate correctness:
   - `/api/v1/me` allowed
   - full-access routes blocked until ack
3. Edge cases:
   - refresh/login payload consistency
   - stale token + stale notice interactions
4. Operational safety:
   - additive migration safety
   - rollback viability

## Output Rules

- Findings only, severity-ordered (`P1`, `P2`, `P3`)
- Include file+line references
- Include “No finding” confirmations for major risk areas checked
- Do not propose broad redesign beyond this scope
