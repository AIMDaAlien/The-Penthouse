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

## Current execution override (2026-03-22)

This is the current operating override for the active stabilization + visual-exploration cycle. It does not replace the base Antigravity policy.

- Codex:
  - backend
  - contracts
  - tests
  - release-gate work
  - final arbiter
- Opus:
  - bounded design-review partner for Gemini-led visual exploration
  - deep decomposition / review when a frontend slice needs it
- Gemini:
  - explicitly re-enabled for member-facing `frontend_ui` exploration
  - current visual-exploration entry packet:
    - `antigravity/handoffs/GEMINI_EDITORIAL_LUXURY_WAVE1_2026-03-22.md`
  - first wave limited to app shell exploration only
