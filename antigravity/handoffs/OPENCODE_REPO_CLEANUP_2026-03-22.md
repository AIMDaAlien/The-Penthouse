Implement a guarded repository cleanup pass for The Penthouse rebuild. Use this prompt as the contract. Take your time and optimize for quality over diff size.

This is a hygiene pass, not a feature pass.

Project context
- Public rebuild is already live
- Repo is a monorepo with mobile app, API, contracts, docs, and agent handoff material
- The worktree has a lot of accumulated history from rapid implementation cycles
- Cleanup should improve clarity and reduce drift without compromising functionality

Concrete targets

1. Handoff/document cleanup
- Audit `antigravity/handoffs/`
- Do not simply delete everything old
- Create a clean archive approach if needed, such as:
  - archive folder
  - index/readme
  - historical marker
- Update any stale obsidian notes that are now misleading
- Specifically review:
  - `docs/obsidian/14 - Opencode Handoff.md`
- If it is obsolete, either:
  - archive it
  - or rewrite/mark it as historical so it no longer pretends to be current guidance

2. Package/dependency hygiene
- Audit the mismatch between:
  - root `packageManager: pnpm@...`
  - npm-based workflow + `package-lock.json`
- Audit root-level dependency duplication/drift, especially Capacitor packages that appear both at root and in `apps/mobile`
- Make the package-manager story honest
- Remove or document dependency duplication only if it is clearly safe
- Do not break local Android builds

3. Logging/diagnostic hygiene
- Review mobile diagnostic logging in `apps/mobile/src/App.vue`
- If the current logs are too chatty, reduce noise in a safe way:
  - gate low-value logs behind an explicit dev/test guard
  - or centralize filtering
- Preserve logs that still matter for:
  - push token registration failures
  - realtime join/ack issues
  - session sync failures
- Also sweep for any remaining clearly sensitive-ish logging that should be redacted

4. Dead/redundant code sweep
- Remove only code that is clearly dead, redundant, or replaced
- Prefer a few high-confidence removals over a large speculative cleanup
- If you find a tempting cleanup that is risky or architectural, defer it and say so

Constraints
- no feature work
- no broad refactor
- no formatting-only churn
- no removal of docs/handoffs without preserving navigability/history
- no dependency upgrades unless they directly resolve the hygiene issue

Validation
- run focused tests for touched seams
- run relevant typechecks
- run `npm run validate` only if the touched footprint justifies it

Return
1. Root cause per cleanup category
2. Files changed
3. What was archived, rewritten, or removed
4. Validation results
5. Anything you intentionally left alone because cleanup risk outweighed benefit
