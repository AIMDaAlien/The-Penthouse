# Continuation Prompt

Use this at the start of a fresh conversation to continue work on The Penthouse without dragging the full prior chat history along.

```text
You are continuing work in /Users/aim/Documents/The Penthouse.

Current branch:
- feat/invite-onboarding-controls-v1

First actions:
1. Run `git status --short` and inspect the worktree before making assumptions.
2. Do not commit or delete local agent-installer side effects unless the user explicitly asks.
3. Read the highest-signal project notes first:
   - docs/obsidian/00 - Knowledge Hub.md
   - docs/obsidian/13 - MVP Stability Plan v2.md
   - docs/superpowers/skills.md
4. If the task is design-related, also inspect the installed design skills and the current app UI before proposing anything.

Important current repo state:
- The app has already moved well past rebuild viability and basic deployment.
- Public rollout, signed Android APK flow, admin/operator basics, moderation, DMs, notification controls, media controls, session/device management, invite/onboarding controls, and ops hardening have all been implemented in earlier slices.
- The repo went through commit splitting and cleanup already.
- A repo cleanup pass archived old handoffs, corrected stale notes, and removed obvious dead code.

Recent functional slices that are considered materially in place:
- Public rebuild rollout at penthouse.blog with legacy APK preserved
- Android signing and release readiness
- Admin user-management UI
- Read-only server/operator management panels
- Notification controls
- Media controls and picker polish
- Balanced admin suite v1:
  - reversible hide/unhide moderation
  - member tombstones
  - admin moderation audit
  - richer operator diagnostics
- Direct Messages v1:
  - 1:1 DMs
  - first-send creation
  - mixed list
  - per-thread mute
  - admin visibility/moderation
- Session and device management v1
- Invite and onboarding controls v1
- Ops Hardening v2

Most likely next product direction:
- Visual app design / interface refinement
- Runtime proof and polish on real devices
- Selective cleanup only if it protects design work or reduces operational risk

Critical worktree caution:
- The skill installs created many untracked local directories such as:
  - .agents/skills/
  - .agent/
  - .claude/
  - .codebuddy/
  - .commandcode/
  - .continue/
  - .crush/
  - .factory/
  - .goose/
  - .junie/
  - .kilocode/
  - .kiro/
  - .kode/
  - .mcpjam/
  - .mux/
  - .neovate/
  - .openhands/
  - .pi/
  - .pochi/
  - .qoder/
  - .qwen/
  - .roo/
  - .trae/
  - .windsurf/
  - .zencoder/
  - skills/
  - skills-lock.json
- Treat these as local tooling artifacts unless the user explicitly asks to version them.
- Also note there are still local handoff prompt artifacts under antigravity/handoffs and docs/superpowers that may or may not be intended for git.

Installed external skills that are likely useful in the next session:
- requesting-code-review
- receiving-code-review
- systematic-debugging
- verification-before-completion
- executing-plans
- subagent-driven-development
- find-docs
- context7-cli
- context7-mcp
- ui-ux-pro-max
- ckm-design
- ckm-design-system
- ckm-ui-styling
- nodejs-backend-patterns
- code-architecture-review
- postgresql-code-review

Internal Penthouse-specific skills that were created locally under ~/.codex/skills:
- penthouse-release-operator
- penthouse-runtime-proof
- penthouse-obsidian-sync
- penthouse-admin-suite-review
- penthouse-commit-splitter

Use those skills when relevant, especially:
- find-docs for external library or platform accuracy
- systematic-debugging before proposing bug fixes
- requesting-code-review / receiving-code-review around risky changes
- ui-ux-pro-max and ckm-design-system when visual design starts
- nodejs-backend-patterns and postgresql-code-review for backend or schema changes
- penthouse-runtime-proof for real-device/live verification tasks
- penthouse-obsidian-sync after meaningful product or deployment changes

Behavior expectations for the next agent:
- Be pragmatic and protect the already-working app.
- Do not reopen already-settled product decisions unless a real bug or contradiction appears.
- Prefer targeted, high-signal work over widening scope.
- Before visual redesign, preserve the current working behaviors:
  - auth/session
  - DMs
  - moderation
  - push/notification controls
  - media handling
  - operator/admin tools
- If making design changes, keep the current behavior model intact while improving the interface.

If the user asks “what’s next,” bias toward:
- visual design
- real-device proof
- light cleanup that protects maintainability

If the user asks for implementation, do the work directly instead of only planning, unless a risky product decision truly needs clarification.
```
