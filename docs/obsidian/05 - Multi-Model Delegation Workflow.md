---
tags: [penthouse, delegation, codex, opus, gemini, workflow]
created: 2026-03-05
---

# Multi-Model Delegation Workflow

This is the operating model used in Antigravity so ownership is explicit and disputes are deterministic.

## Role split

- Codex:
  Backend/API/data/infra/security owner, final arbiter.
- Opus:
  Complex decomposition, refactor planning, deep log/debug review.
- Gemini:
  Frontend UI implementation and visual polish.

## Routing defaults

- `backend_api`, `realtime`, `data`, `infra` -> owner `codex`, reviewer `opus`
- `frontend_ui` -> owner `gemini`, reviewer `codex`
- High-ambiguity `frontend_arch` or `migration_flutter`:
  plan owner `opus`, implementation owner `gemini`, reviewer `codex`
- Any `high/critical` risk:
  evidence required + human signoff + codex arbitration

## 8-stage serial gated workflow

1. Intake
2. Evidence
3. Planning
4. Execution
5. Review
6. Arbitration
7. Human approval
8. Closeout

## Required artifacts

- `TaskEnvelope`
- `RoutingDecision`
- `ClaimEvidence`
- `DecisionRecord` (if disagreement)
- `HandoffPacket`

Templates live in:
- `antigravity/templates/task-envelope.template.json`
- `antigravity/templates/routing-decision.template.json`
- `antigravity/templates/claim-evidence-registry.template.jsonl`
- `antigravity/templates/decision-record.template.md`
- `antigravity/templates/handoff-packet.template.json`

## Why this helps

- Prevents "everyone edits everything" chaos.
- Forces evidence before high-risk changes.
- Makes rollback and ownership clear before execution starts.
- Keeps stability priority above feature speed.
