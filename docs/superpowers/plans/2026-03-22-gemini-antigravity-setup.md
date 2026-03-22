# Gemini Antigravity Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Gemini inside Antigravity reliably usable as this repo's frontend UI and visual-design agent with the right skills and MCP wiring.

**Architecture:** Keep Antigravity's existing Gemini runtime intact, then layer a curated, repo-owned skill mirror on top via symlinks so local changes stay in sync automatically. Patch Antigravity's local MCP config in place so browser-oriented tooling is present and GitHub auth no longer lives inline in the config file.

**Tech Stack:** Node.js, local filesystem symlinks, JSON MCP config, Antigravity local state under `~/.gemini/antigravity`

---

### Task 1: Add A Reproducible Bootstrap Script

**Files:**
- Create: `scripts/setup-gemini-antigravity.mjs`

- [ ] **Step 1: Define the curated skill set**
- [ ] **Step 2: Create/update symlinks under `~/.gemini/antigravity/skills`**
- [ ] **Step 3: Preserve replaced local skill directories with timestamped backups**
- [ ] **Step 4: Merge MCP entries without clobbering unrelated config**
- [ ] **Step 5: Remove inline GitHub token handling from Antigravity MCP config**

### Task 2: Document The Repo-Specific Setup

**Files:**
- Create: `docs/superpowers/gemini-antigravity-setup.md`

- [ ] **Step 1: Document the curated mirrored skills**
- [ ] **Step 2: Document the MCP servers this repo expects Gemini to have**
- [ ] **Step 3: Document the GitHub token requirement as environment-based**
- [ ] **Step 4: Document the bootstrap command for future rebuilds**

### Task 3: Apply And Verify The Local Setup

**Files:**
- Modify: `~/.gemini/antigravity/mcp_config.json`
- Modify: `~/.gemini/antigravity/skills/*` via script

- [ ] **Step 1: Run the bootstrap script**
- [ ] **Step 2: Inspect resulting skill links and MCP config**
- [ ] **Step 3: Confirm the curated repo skills are visible in Antigravity's Gemini skill directory**
- [ ] **Step 4: Confirm browser-oriented MCP servers were added**
- [ ] **Step 5: Confirm GitHub MCP no longer stores inline secret values**
