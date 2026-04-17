# Gemini Handoff — Alpha Release Documentation

**Date:** 2026-04-15  
**Project:** The Penthouse — v2.1.0-alpha.1  
**From:** Claude (Sonnet)  
**To:** Gemini (Creative/Prose)

---

## Context

The Penthouse is an invite-only, privacy-focused messaging PWA for small communities (~20–200 people). It's self-hosted. The first alpha release (v2.1.0-alpha.1) is being deployed now. You're responsible for two pieces of documentation that will be read by real humans — keep them warm, honest, and non-corporate.

**Tone:** Same as the landing page copy — quiet confidence, honest about being early, not a pitch. No buzzwords. No "seamless communication" or "real-time messaging" phrasing.

---

## Task 1 — Release Notes

**File to create:** `docs/RELEASE_NOTES_v2.1.0-alpha.1.md`

**Audience:** The project owner and any early testers who want to understand what changed.

**What changed in v2.1.0-alpha.1 vs v2.0.0-alpha:**

The entire mobile client was rewritten:
- **v2.0.0-alpha** was a Vue + Capacitor native Android APK
- **v2.1.0-alpha.1** is a SvelteKit Progressive Web App — no app store, install via "Add to Home Screen" in Android Chrome or Safari

New in this release:
1. Welcome landing page at `penthouse.blog` (pre-login, explains the app, has the install instructions)
2. Auth flow: unauthenticated visitors now land on the welcome page instead of the raw login form
3. Chat list, real-time messaging (Socket.IO), and user profiles — all rebuilt from scratch in SvelteKit
4. PWA install: works in Android Chrome and Safari — fullscreen, offline shell caching, no APK needed
5. Connection status indicator (green/yellow/red dot)
6. Dark theme as default

**Known issues / limitations:**
- Media uploads not yet supported (text only for now)
- Push notifications not yet implemented (you need the app open to receive messages)
- Admin UI for managing the community exists on the backend but has no frontend yet
- Typing indicators and read receipts are post-alpha features

**Format:** GitHub-flavored markdown. Keep it under 300 words. Lead with the big picture change (APK → PWA), then new features, then known issues. End with how to report bugs.

---

## Task 2 — Alpha Tester Onboarding Guide

**File to create:** `docs/ALPHA_TESTER_GUIDE.md`

**Audience:** The 5–10 people who will be invited to test. They know the project owner personally. They may or may not be technical.

**What to cover:**

1. **What this is** — 2–3 sentences. The Penthouse is an invite-only messaging app. You were invited because [the owner] trusts you. It's early and rough around some edges.

2. **How to install it (PWA)**
   - On Android: Open `https://penthouse.blog` in Chrome → tap the three-dot menu → "Add to Home Screen" → confirm
   - On iPhone: Open `https://penthouse.blog` in Safari → tap the Share icon (box with arrow) → "Add to Home Screen" → confirm
   - Once installed, it opens fullscreen like a native app

3. **How to use it**
   - Register an account (you'll need to set a username and password)
   - Start a direct message with someone else who's registered
   - Messages are real-time — if the other person has the app open, they'll see it instantly
   - If they're offline, they'll see it when they open the app next (no push notifications yet)

4. **Known rough edges**
   - No push notifications yet — you need to open the app to check for new messages
   - Text only — no image or file sharing yet
   - If the app looks broken, try a hard reload (pull-to-refresh or close and reopen)

5. **How to report a bug**
   - [Leave a placeholder — the project owner will fill in the feedback channel URL]
   - When reporting: describe what you were doing, what you expected, what happened instead. Screenshots are gold.

**Format:** Friendly, plain language. Not a wall of text. Use short sections and bullet points where it helps. Aim for something a non-technical person can follow without feeling talked down to. Target: one printed page (~400 words max).

---

## Tone reminders

- This is not a SaaS product. Do not write like it's one.
- "Invite-only" is a feature, not a restriction — frame it as intentional.
- Be honest that it's alpha. Don't apologize for it, but don't hide it.
- The word "seamless" is banned. So is "robust", "powerful", and "leverage".
