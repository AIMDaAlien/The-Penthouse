---
tags: [penthouse, checklist, mvp, execution]
created: 2026-03-05
---

# Copyable Rebuild Checklist

Use this if you want to repeat the same "stable first" rebuild pattern.

## Phase A - Foundation

- [ ] Create clear repo split (`app`, `api`, `contracts`, `infra`)
- [ ] Lock contract schemas before endpoint/UI coding
- [ ] Set up typecheck/lint/test gates
- [ ] Make local stack boot with one command

Exit:
- [ ] Contracts compile
- [ ] Validation scripts run and fail correctly on bad code

## Phase B - Identity

- [ ] Invite-only register
- [ ] Login/logout
- [ ] Refresh token rotation
- [ ] Deterministic auth errors

Exit:
- [ ] Expired/invalid tokens handled consistently
- [ ] Token replay/regression tests pass

## Phase C - Core Chat

- [ ] Chat list and message history
- [ ] Realtime send/receive
- [ ] Idempotent send via `clientMessageId`
- [ ] Basic media upload

Exit:
- [ ] No duplicate messages under reconnect/race tests
- [ ] Unauthorized chat access blocked

## Phase D - Reliability Layer

- [ ] Cache recent chats/messages locally
- [ ] Queue unsent messages while offline
- [ ] Retry with bounded backoff
- [ ] Reconnect room join and resync behavior

Exit:
- [ ] API restart drill passes
- [ ] Network drop drill passes
- [ ] Queue drains on recovery

## Phase E - Release Gate

- [ ] Smoke tests pass end-to-end
- [ ] Performance/error thresholds reviewed
- [ ] Rollback runbook tested once
- [ ] Internal-only release first

Exit:
- [ ] No critical open bugs
- [ ] Human approval logged for high-risk items

## Commands

```bash
npm run validate
npm run scenario:test
npm run release:gate
```

Optional with DB for integration coverage:

```bash
DATABASE_URL=postgresql://localhost:5432/penthouse_test \
JWT_SECRET=local-test-jwt-secret-long-enough \
  npm --workspace services/api run test
```
