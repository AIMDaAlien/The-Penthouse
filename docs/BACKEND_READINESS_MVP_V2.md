# Backend Readiness Report: MVP Stability Plan v2 (Phase 1/2)

Date: 2026-03-12  
Owner: Codex

## Scope Completed

- Added server-enforced, versioned test-account acknowledgement.
- Added acknowledgement persistence fields on users:
  - `test_notice_accepted_version`
  - `test_notice_accepted_at`
- Added protected-route gating for users who have not accepted the current notice version.
- Added acknowledgement endpoint:
  - `POST /api/v1/me/test-notice/ack`
- Extended auth/session payload shape with:
  - `mustAcceptTestNotice`
  - `requiredTestNoticeVersion`
  - `acceptedTestNoticeVersion`
- Added backend observability logs for:
  - notice-gated full-access blocks
  - successful test notice acknowledgement
  - chat read-state updates
- Updated OpenAPI and contracts to match new request/response shapes.
- Expanded automated coverage for schema and integration notice flows.

## Validation Status

- `npm run validate`: PASS
- `npm run scenario:test`: PASS
- Strict release gate with DB (`npm run release:gate -- --require-db`): BLOCKED by local environment
  - Failure reason: Docker daemon unavailable (`Cannot connect to Docker daemon`)
  - Not a code-level failure in unit/schema tests.

## Rollback Notes

This change is additive at the DB layer (new nullable columns + index), so rollback is low-risk.

### Fast rollback option (no schema rollback)

If users are unexpectedly blocked by notice gating:

1. Keep deployed code.
2. Set `TEST_ACCOUNT_NOTICE_VERSION` to the previously accepted version (for example `alpha-v1`).
3. Restart API.

This immediately clears `mustAcceptTestNotice` for users already on that version.

### Behavior rollback option (code rollback)

If gating itself must be disabled quickly:

1. Revert to the previous app build where `requireFullAccess` did not enforce test notice acknowledgement.
2. Redeploy API.

No destructive DB rollback is required because migration `007` is additive.

## Known Follow-up (Phase 3 Owner: Opus)

- Implement the member-facing acknowledgement UX (register + post-login gate).
- Complete UI recovery and notification UX hardening before alpha opening.
