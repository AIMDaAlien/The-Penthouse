# Repo Cleanup And Hygiene Pass

## Summary

Run a guarded cleanup round focused on repository hygiene, redundancy removal, and low-risk optimization. This is not a feature round and not a redesign round.

The tree already contains a lot of active work, so the goal is:

1. remove or archive genuinely stale material
2. normalize obvious repo inconsistencies
3. reduce noisy or redundant code paths
4. preserve behavior and avoid speculative cleanup

This should be handled as a checks-and-balances sequence:

1. `Opencode` implements the cleanup pass carefully
2. `Claude Opus` reviews the landed changes for accidental breakage, stale-reference risk, and false-confidence cleanup

## Concrete cleanup targets

### 1. Handoff/documentation sprawl

Observed:
- `antigravity/handoffs/` now contains many dated prompt files from short-lived implementation cycles
- at least one obsidian note is clearly stale:
  - `docs/obsidian/14 - Opencode Handoff.md`
  - it still describes an old internal-only / pre-public-rollout state

Desired outcome:
- keep current useful historical record
- archive or clearly mark stale one-off handoffs instead of leaving everything mixed together
- do not break references casually

### 2. Package/dependency hygiene

Observed:
- root `package.json` says `packageManager: pnpm@9.15.0`
- actual workflow and lockfile are npm-based (`package-lock.json`, npm scripts used everywhere)
- root package also carries `@capacitor/android` while the mobile app has its own `@capacitor/android` dependency on a different major version

Desired outcome:
- choose a single honest package-manager story
- remove or justify root-level dependency duplication
- clean up obvious dependency metadata drift without destabilizing builds

### 3. Diagnostic/logging hygiene

Observed:
- mobile diagnostics in `App.vue` are very chatty in tests and likely noisy in ordinary runtime
- operator/push logging was already tightened recently, but broader logging hygiene may still have easy wins

Desired outcome:
- keep useful diagnostics
- reduce noisy or redundant client-side logging where it no longer pays for itself
- do not remove logs that are still important to support realtime/push debugging

### 4. Low-risk dead/redundant code sweep

Desired outcome:
- remove obviously dead branches, stale helpers, or duplicate utility paths if they are proven unused
- avoid broad “cleanup” edits that only make the diff bigger without improving clarity

## Scope rules

- no new product features
- no backend contract redesign
- no UI redesign
- no deleting historical docs unless they are first archived or replaced cleanly
- no mass formatting churn
- no “cleanup” that changes runtime semantics without direct test proof

## Validation expectations

- run focused tests for any touched seam
- run typechecks for touched workspaces
- if docs/hand-offs are reorganized, confirm references still resolve cleanly

## Deliverables

Return:
1. cleanup categories addressed
2. files changed
3. what was archived vs. removed vs. retained
4. validation results
5. any intentionally deferred cleanup that looked tempting but risky
