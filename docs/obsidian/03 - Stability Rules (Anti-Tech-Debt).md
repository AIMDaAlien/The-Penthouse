---
tags: [penthouse, tech-debt, quality-gates, reliability]
created: 2026-03-05
---

# Stability Rules (Anti-Tech-Debt)

These are non-negotiable rules we adopted to avoid repeating the old "slop spiral."

## Core rules

1. No feature coding before contract definitions exist.
2. No endpoint merge without tests for success and failure paths.
3. No schema change without migration and rollback note.
4. No temporary shortcuts in auth/session logic.
5. No silent retries; retries must be bounded and visible.
6. No new dependency without clear maintenance reason.
7. No high-risk change without human approval + rollback path.
8. No release if critical smoke tests fail.

## Required gates for each significant task

1. Intake gate (`TaskEnvelope`)
2. Evidence gate (`ClaimEvidence`)
3. Planning gate (owner plan + reviewer critique)
4. Execution gate
5. Review gate
6. Arbitration gate (`DecisionRecord` when needed)
7. Human approval gate (high risk/security/prod impact)
8. Closeout gate (`HandoffPacket` + rollback notes)

See also: [[05 - Multi-Model Delegation Workflow]]

## Daily validation commands

```bash
npm run validate
npm run scenario:test
```

## Why these rules matter on unstable bare metal

- Fewer moving parts means fewer random failures.
- Strong tests catch regressions before deployment.
- Rollback notes reduce downtime when something goes wrong.
- Explicit ownership avoids model conflict and duplicated work.
