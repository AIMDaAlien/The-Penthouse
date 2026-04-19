# Gemini Handoff - Member UI Visual Direction Ideation

## Context

You are Gemini, acting as visual ideation and design critique for The Penthouse.

Do not implement code. Do not edit files. Your output should be a design brief Claude can later translate into Svelte/CSS.

The Penthouse is an invite-only, privacy-focused social messaging PWA for small communities. It is not a Slack clone, SaaS dashboard, or public social network. It should feel like a private upper-floor apartment you were buzzed into: intimate, deliberate, warm, and quietly high-status.

Current app state:

- Tier A chat flows are implemented and runtime-proven.
- The app supports root chat list, direct `/chat/:id` hard-load, realtime messages, message edit, delete tombstones, starred messages, archived conversations, and audio/voice-note upload.
- Claude owns frontend implementation in `apps/web/`.
- Codex owns validation and orchestration.
- Your role for now is visual direction, visual critique, and product atmosphere.

## Your task

Create 2-3 distinct visual design directions for the next member-facing UI refinement pass.

Focus on:

- Chat thread polish.
- Chat list hierarchy.
- Empty states.
- Archive and starred-message affordances.
- Voice/audio message treatment.
- Message edit/delete/tombstone states.
- Onboarding/auth tone if it helps unify the product.
- Settings/admin visual harmony only if it supports the member-facing direction.

Each direction must include:

- Direction name.
- Mood in plain language.
- Palette guidance with concrete color relationships, not just adjectives.
- Typography and spacing guidance.
- Interaction and motion ideas.
- Concrete component-level examples.
- Risks and tradeoffs.
- What Claude should implement first.

End with:

- Your recommended winning direction.
- Why that direction fits The Penthouse right now.
- What not to change, so the product keeps its identity and trust.

## Product tone

Aim for:

- Private.
- Editorial.
- Intimate.
- Legible.
- Mature.
- Quietly luxurious.
- Human, not corporate.

Avoid:

- Generic SaaS dashboards.
- Purple-blue gradient startup aesthetics.
- Beige/cream/sand/tan editorial sameness.
- Brown/orange/espresso palettes.
- Dark blue/slate monoculture.
- Decorative gradient orbs or bokeh blobs as a main visual device.
- Over-glassy interfaces that make controls hard to read.
- Copy that describes features in a corporate way, such as "seamless communication" or "real-time collaboration."

## Existing frontend constraints

Respect the current implementation direction:

- SvelteKit 2.x and Svelte 5 runes.
- Mobile-first, with 375px as the primary viewport.
- Dark-first.
- CSS custom properties, no external UI framework.
- SVG icons through the existing icon component.
- Layouts must remain stable as content changes.
- Border radius should stay restrained, generally 8px or less for buttons/cards.
- Text must fit on mobile without overlapping controls.
- The primary experience should feel native to the app, not like an embedded preview.

## Files to read for context

Read only if available. Treat them as reference material, not files to edit.

```text
apps/web/CLAUDE.md
apps/web/src/routes/+page.svelte
apps/web/src/routes/chat/[id]/+page.svelte
apps/web/src/lib/components/MediaBubble.svelte
apps/web/src/lib/components/MessageContextMenu.svelte
apps/web/src/lib/components/Icon.svelte
docs/FEATURE-ROADMAP.md
docs/obsidian/15 - PWA Rebuild.md
```

## Acceptance criteria

Your response is useful if:

- It gives 2-3 genuinely different directions, not three names for the same dark UI.
- Every direction covers chat thread, chat list, voice/audio, starred state, and archive state.
- The advice is concrete enough that Claude can implement a first pass without guessing.
- You identify real risks, such as legibility, excessive novelty, or privacy/trust mismatch.
- You recommend one winning direction and explain the product reason.

## Do not touch

Do not edit any files.

Do not produce production code.

Do not propose backend, contracts, auth, socket, or database changes.

Do not ask Claude to change files outside `apps/web/`.

