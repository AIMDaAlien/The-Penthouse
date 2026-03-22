# Handoff Index

This folder keeps execution packets, review packets, and follow-on packets that were used during the rebuild.

Current naming groups:

- `OPENCODE_*`: implementation-facing packets for OpenCode/Codex-style backend or repo work
- `OPUS_*_REVIEW_*`: review packets or design-review packets for Opus
- `NEXT_STEP_AGENT_PACKET_*`: short routing packets for the next agent in a chain

Guidelines:

- keep dated handoffs in place when they still describe a shipped slice or a useful historical decision
- move superseded, phase-specific prompts that no longer reflect current repo reality into `archive/`
- treat `docs/obsidian/00 - Knowledge Hub.md` as the current project-memory map; handoffs are supporting material, not the source of truth

Archived material:

- `archive/2026-03-internal-rollout/` contains the older unversioned phase prompts from the internal-rollout era that are now historical only
- `archive/2026-03-feature-cycles/` contains the Mar 15-21 implementation, review, and routing packets for all shipped feature slices (notifications, user management, server management, media, DMs, admin suite, ops hardening, invites, session management, Android release, TrueNAS cutover)
