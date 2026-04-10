---
tags: [penthouse, pwa, sveltekit, rebuild, obsidian]
created: 2026-04-09
---

# PWA Rebuild

## Why this happened

The original app was a native Android APK distributed manually — download, install, done. That worked for a small closed group but created friction every time there was an update. Users had to reinstall. Distribution required a channel outside the app itself.

A Progressive Web App solves both problems at once:

- users open a URL in their browser and it installs itself
- updates deploy silently — next open is always the latest version
- works on any device with a modern browser, not just Android

The decision was made to keep the existing backend completely intact and rebuild only the frontend from scratch as a PWA. No migration of data, no changes to how realtime messaging works under the hood. Same server, new face.

## What changed on the frontend

The old frontend was built with Vue 3 and Capacitor (a tool for wrapping web code in a native Android shell). The new one is built with SvelteKit, a modern web framework.

Why SvelteKit:

- ships less JavaScript to the browser than comparable frameworks
- has clean component syntax that reads close to plain HTML/CSS
- has first-class PWA support through a plugin
- strong TypeScript integration for catching mistakes before they reach users

## What the PWA rebuild started with

Before any features were added, the baseline covered:

- **Login and registration** — invite-only account creation, password-based login, automatic token refresh in the background
- **Chat list** — shows all your conversations, direct messages and group channels in one list
- **Opening a chat and reading messages** — scroll through history, load older messages on demand
- **Sending a text message** — with optimistic display (your message appears instantly while delivery confirms in the background)
- **Basic profile** — display name and avatar
- **PWA install prompt** — the browser prompts users to add the app to their home screen
- **Connection status** — a small indicator shows when the realtime connection is healthy, degraded, or offline

## How the codebase is organized

The frontend code lives in `apps/web/`. Backend and shared contracts live separately. Both sides import from a shared types package, so if a data shape changes anywhere, both sides catch the mismatch immediately at build time rather than at runtime.

The shared types package (`packages/contracts`) is a deliberate coordination point. Any new feature that touches both the sending side (backend) and the display side (frontend) goes through there first.

## What this version is not yet

The PWA baseline deliberately left out several things from the original native app:

- GIF sending — moved to a post-baseline feature wave
- Typing indicators and presence — moved to a post-baseline feature wave
- Read receipts — moved to a post-baseline feature wave
- Push notifications — scheduled for a later wave
- Admin tools — backend admin routes exist; the UI comes in a later wave

These were excluded to keep the baseline shippable and testable quickly rather than waiting until every feature was ported before anyone could verify the foundation.

## What this unlocks

With a clean, tested baseline in place, new features can be added incrementally without risk of breaking the core loop. Each wave adds a focused layer on top of stable ground.

Next: [[16 - Wave A - Live Chat on the PWA]]
