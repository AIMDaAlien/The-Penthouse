# Opencode Prompt: Notification and Read-Visibility Implementation

Use the Opus diagnosis as the spec. Implement only the bounded notification/read hardening items it identifies.

Project: The Penthouse  
Current line: local `main` tracking `origin/rebuild`  
Status: internal-only alpha prep

## Requirements

- Keep backend semantics stable unless a real blocker is proven.
- Do not add push infrastructure.
- Do not redesign the app shell.
- Keep changes focused on notification UX and strict read visibility.

## Implementation goals

- Notifications should fire when they should, and stay quiet when they should.
- The app should not mark messages seen unless the user is truly in-app, in-chat, and at the live bottom.
- Tapping a notification should land cleanly in the intended chat.
- Clear and cleanup behavior should feel sensible, not sticky or confusing.

## Also required

- Update tests so they reflect the intended runtime behavior, not just code-path existence.
- Update docs if the behavior changes materially:
  - `docs/obsidian/12 - Native Notifications and Strict Read Receipts.md`
  - `docs/INTERNAL_TESTING.md`
- Keep notes concise and practical.

## Validation

- Run the relevant mobile tests
- Run repo validation if shared seams changed
- Call out anything that still requires emulator proof

## Return

1. Root cause per implemented issue
2. Files changed
3. Tests added or updated
4. Validation results
5. Remaining runtime risk
