# Antigravity Delegation Package (The Penthouse)

This package implements the Multi-Model Delegation Spec Sheet v1 with runnable routing rules and scenario checks.

## Files

- `policy/delegation-policy.v1.json`
  - Canonical machine-readable policy (locked decisions, routing rules, guards, workflow gates).
- `customizations.md`
  - Paste-ready blocks for Antigravity customizations (`Model Routing Rules`, `Workflow Stages`, `Verify-First Evidence Rules`).
- `templates/task-envelope.template.json`
- `templates/routing-decision.template.json`
- `templates/handoff-packet.template.json`
- `templates/decision-record.template.md`
- `templates/claim-evidence-registry.template.jsonl`
- `scenarios/test-cases.json`
  - Seven scenarios from the approved plan.
- `scripts/route-task.mjs`
  - Routes a task envelope to owner/reviewer/arbiter and applies blockers/guards.
- `scripts/run-scenarios.mjs`
  - Validates policy behavior against the seven scenarios.

## Commands

```bash
# Route one task envelope
node antigravity/scripts/route-task.mjs antigravity/templates/task-envelope.template.json

# Run all scenario checks
node antigravity/scripts/run-scenarios.mjs
```

## Routing Guarantees

- `backend_api|realtime|data|infra` => owner `codex`, reviewer `opus`, arbiter `codex`
- `frontend_ui` => owner `gemini`, reviewer `codex`, arbiter `codex`
- `frontend_arch|migration_flutter` + high ambiguity => planning `opus`, implementation `gemini`, reviewer `codex`
- `security` => owner `codex`, reviewer `opus`, human sign-off required
- `risk=high|critical` => evidence required + human sign-off required
- `recency_risk=true` without primary docs => blocked
- `custom_crypto|novel_crypto|security_primitive` => blocked, no solo model owner

## Notes

- This package is policy-first and stability-first for a small private circle on unstable bare-metal hosting.
- High-risk tasks are intentionally slower due to mandatory evidence and human approval gates.
