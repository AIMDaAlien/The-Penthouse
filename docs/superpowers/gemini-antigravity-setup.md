# Gemini Antigravity Setup

This repo expects Gemini inside Antigravity to be the primary implementer for `frontend_ui` work and the visual-design pass. The local Antigravity install under `~/.gemini/antigravity` now gets a curated, repo-specific skill mirror plus browser-oriented MCP servers.

## Curated Skills

The setup script links these skills into `~/.gemini/antigravity/skills`:

- `using-superpowers`
- `brainstorming`
- `systematic-debugging`
- `writing-plans`
- `requesting-code-review`
- `receiving-code-review`
- `verification-before-completion`
- `find-docs`
- `context7-mcp`
- `ui-ux-pro-max`
- `ckm-ui-styling`
- `accessibility`
- `performance`

These are layered on top of Antigravity's existing Gemini skills instead of replacing the whole install.

## MCP Servers

The setup script keeps Antigravity's existing MCP entries and ensures these are present:

- `context7`
- `sequential-thinking`
- `github-mcp-server`
- `chrome-devtools`
- `playwright`

`chrome-devtools` and `playwright` are included because Gemini is being used for UI and visual work in this repo. They give it runtime inspection and browser automation options in addition to Antigravity's own browser flows.

## GitHub Auth

The GitHub MCP server should not store a personal access token inline in `~/.gemini/antigravity/mcp_config.json`.

The setup script removes inline token values and leaves Docker to inherit `GITHUB_PERSONAL_ACCESS_TOKEN` from the environment. Before launching Antigravity with Gemini workflows that need GitHub MCP, make sure that variable is exported in the environment that starts Antigravity.

For terminal-launched sessions:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
```

For macOS GUI-launched apps, use `launchctl` so Antigravity inherits it:

```bash
launchctl setenv GITHUB_PERSONAL_ACCESS_TOKEN your_token_here
```

If the old inline token was the only place it lived, rotate it and then set the new token through one of the methods above.

## Rebuild Command

Run this from the repo root whenever Antigravity's Gemini setup needs to be repaired or rebuilt:

```bash
node scripts/setup-gemini-antigravity.mjs
```

The script is idempotent:

- existing repo-owned symlinks are refreshed
- conflicting local skill directories are moved aside with timestamped backups
- unrelated MCP entries are preserved
- required MCP entries are merged in
