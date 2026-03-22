# Opencode Prompt: Docs Sync for Runtime Recovery

You are updating project-memory docs only. Do not change product code in this pass.

Project: The Penthouse  
Current line: local `main` tracking `origin/rebuild`  
Status: internal-only alpha prep

## Task

Update the Obsidian notes so they reflect the latest confirmed runtime fixes from Android emulator testing.

## Confirmed fixes to record

- Typing indicator was not missing logically; it was rendered inside the scroll container and clipped below the viewport in real chats. It has now been moved so it stays visible between the message history and composer.
- Directory presence indicators were effectively absent because only online users rendered a marker. Presence now always renders a dot, with offline shown in gray and online shown in green.
- Klipy inline chat rendering was using the preview asset instead of the animated asset. Inline rendering now uses the animated asset URL, matching real chat expectations.
- Typing event contract now tolerates nullable `displayName` so typing updates are not silently dropped for users without a display name.

## Update only these notes

- `docs/obsidian/01 - Rebuild Timeline.md`
- `docs/obsidian/08 - Live Chat Essentials.md`
- `docs/obsidian/10 - Media Integration.md`
- `docs/obsidian/00 - Knowledge Hub.md`
- `docs/obsidian/13 - MVP Stability Plan v2.md`

## Important

- Remove stale wording if it contradicts the current app behavior.
- Do not reopen broad roadmap text.
- Keep the writing plain and factual.
- Make it clear where earlier code/test confidence had been misleading versus what runtime proved.

## Return

1. Files changed
2. Short summary of each note update
3. Any stale statements you found and corrected
