# Antigravity Customizations: Multi-Model Delegation v1

Paste the two blocks below into Antigravity customizations rules/workflows.

## Model Routing Rules
```yaml
name: the-penthouse-routing-rules-v1
defaults:
  arbiter_model: codex
  evidence_required: false
  requires_human_signoff: false
  requires_human_in_loop: false
rules:
  - id: backend-realtime-data-infra
    when:
      category: [backend_api, realtime, data, infra]
    set:
      owner: codex
      reviewer: opus
      arbiter: codex

  - id: frontend-ui
    when:
      category: [frontend_ui]
    set:
      owner: gemini
      reviewer: codex
      arbiter: codex

  - id: frontend-arch-or-flutter-high-ambiguity
    when:
      category: [frontend_arch, migration_flutter]
      ambiguity: high
    set:
      owner: opus
      reviewer: codex
      arbiter: codex
      phase_handoff:
        planning_owner: opus
        implementation_owner: gemini

  - id: frontend-arch-or-flutter-default
    when:
      category: [frontend_arch, migration_flutter]
      ambiguity: [low, medium]
    set:
      owner: gemini
      reviewer: codex
      arbiter: codex

  - id: security
    when:
      category: [security]
    set:
      owner: codex
      reviewer: opus
      arbiter: codex
      requires_human_signoff: true

guards:
  - id: high-or-critical-risk
    when:
      risk: [high, critical]
    set:
      evidence_required: true
      requires_human_signoff: true
      arbiter: codex

  - id: recency-risk-blocker
    when:
      recency_risk: true
    set:
      evidence_required: true
      block_if_no_primary_docs: true

  - id: security-tag-signoff
    when:
      tags_any: [security, auth, crypto, permissions]
    set:
      requires_human_signoff: true

  - id: destructive-prod-ops
    when:
      tags_any: [destructive, prod_ops]
    set:
      requires_human_in_loop: true

arbitration:
  max_rebuttal_rounds: 1
  final_arbiter: codex
  checklist:
    - meets acceptance criteria
    - lower operational risk on unstable host
    - fewer moving parts
    - better rollback path
    - verified dependency behavior
```

## Workflow Stages
```yaml
name: the-penthouse-serial-gated-workflow-v1
execution_mode: serial_gated_flow
stages:
  - order: 1
    id: intake_gate
    required:
      - TaskEnvelope
    pass_if:
      - task envelope complete with category, risk, ambiguity

  - order: 2
    id: evidence_gate
    required:
      - ClaimEvidence
    pass_if:
      - recency and high-risk claims have primary sources

  - order: 3
    id: planning_gate
    required:
      - owner implementation plan
      - reviewer critique
    pass_if:
      - acceptance criteria are addressed
      - rollback path is present

  - order: 4
    id: execution_gate
    required:
      - implementation artifacts
    pass_if:
      - work follows approved plan

  - order: 5
    id: review_gate
    required:
      - review report
      - test evidence
    pass_if:
      - no blocking regressions

  - order: 6
    id: arbitration_gate
    required:
      - DecisionRecord (if disagreement exists)
    pass_if:
      - disagreements resolved by codex or human override

  - order: 7
    id: human_approval_gate
    applies_if:
      - risk in [high, critical]
      - category == security
      - tags_any includes destructive or prod_ops
    required:
      - explicit human signoff

  - order: 8
    id: closeout_gate
    required:
      - HandoffPacket
      - rollback notes for production-impact work
    pass_if:
      - packet stored and linked to task id
```

## Verify-First Evidence Rules
```yaml
source_priority:
  - official model docs
  - official API docs
  - official system/model cards
  - official changelogs
secondary_policy: third-party benchmark sites are secondary only
self_report_policy: self-calibration claims are provisional until primary evidence is attached
high_risk_policy: unverified claims cannot be sole basis for high-risk delegation
```
