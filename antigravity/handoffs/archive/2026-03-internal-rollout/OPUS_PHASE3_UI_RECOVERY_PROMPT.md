# Opus Task Prompt: Phase 3 UI Recovery + Notification UX Hardening

You are receiving a scoped handoff for **The Penthouse**.

## Mission

Complete **Phase 3 only**:

- UI recovery to stable mobile baseline (no broad redesign)
- Notification UX hardening aligned to strict read visibility

## Hard Constraints

- Do **not** touch backend contracts, schemas, migrations, or API payload shapes.
- Keep the existing dark mode direction.
- Design direction lock:
  - periwinkle palette
  - Ubuntu-family typography
  - screenshot-led restoration toward main-branch feel
- No DMs, no admin UI, no push infrastructure in this task.
- Two-pass quality rule:
  1. implement
  2. self-review with severity findings (P1/P2/P3) before final output

## Priority Work

1. Restore visual stability across:
   - auth
   - chat
   - directory
   - settings/profile
   - forced-password gate
2. Eliminate right-edge clipping and width overflow on Android narrow screens.
3. Ensure composer/send row remains stable under soft keyboard.
4. Keep only message list scrollable while header/composer remain pinned.
5. Notification UX consistency:
   - unread notifications only when user is not actively reading live-bottom in target chat
   - notification clear only when strict read condition is truly met

## Required Validation

- `npm --workspace apps/mobile run test`
- `npm --workspace apps/mobile run build`
- `npm run validate`
- Two-emulator manual evidence for:
  - no clipping
  - composer/send behavior on first typed character
  - strict read + notification clear behavior

## Output Format Required

1. Change summary (high signal, screen-by-screen)
2. Findings from self-review (severity ordered)
3. Commands run + pass/fail
4. Remaining risks
5. `walkthrough.md` style notes for Codex integration
