# Claude Opus Review Prompt: Editorial-Luxury Wave 1

Use this as the bounded review packet for Gemini's first editorial-luxury app-shell exploration wave for The Penthouse.

This review is about:
- concept distinctness
- behavior preservation
- mobile correctness
- accessibility
- scope discipline

It is **not** permission to redesign the product or widen the wave.

## Review target

Gemini has been asked to produce a **five-concept coded POC round** for the **member-facing app shell only**.

Locked direction:
- prestige / elegance / penthouse luxury
- editorial luxury anchor
- dark mode first
- Very-Peri / periwinkle-led palette
- expressive glassmorphism
- Erode for `"The Penthouse"` wordmark
- JetBrains Mono for settings / utility labels
- Ubuntu Variable for the rest

Wave-1 scope is intentionally narrow:
- global tokens
- shell background / atmosphere
- header and wordmark
- connection badge
- top nav tabs
- auth shell
- loading / session-sync / forced-password / test-notice gate cards

Out of scope:
- message thread internals
- chat list internals
- member directory internals
- profile/settings internals
- admin/operator surfaces
- backend / contract work

## What to review

### 1. Concept distinctness

Reject the round if the five concepts differ only in:
- button rounding
- glow strength
- spacing tweaks
- minor card styling
- only color emphasis

The round is valid only if each concept has a different dominant visual thesis.

Check whether the concepts are meaningfully different across:
- layout composition
- hierarchy
- density / whitespace
- card geometry
- wordmark treatment
- nav presentation
- atmosphere
- motion language

### 2. Constraint compliance

Check that Gemini actually respected:
- member-facing only
- app shell only
- dark-first luxury direction
- editorial-luxury anchor
- typography rules
- trust-sensitive copy preservation

Call out any concept that quietly violates the packet even if it looks attractive.

### 3. Runtime / UX risk

For any chosen implementation candidate, review:
- overflow / clipping risk
- safe-area handling
- header instability
- nav readability
- connection badge readability over bright or frosted surfaces
- gate-card readability
- mobile touch clarity
- motion excess or input-lag risk

### 4. Accessibility and truthfulness

Check for:
- contrast problems
- glass effects that destroy legibility
- motion that ignores usability
- decorative luxury that harms function
- font misuse:
  - Erode outside the wordmark
  - JetBrains Mono leaking into general body UI
  - Ubuntu Variable not carrying the main interface

### 5. Scope discipline

Call out any drift into:
- deeper chat redesign
- directory redesign
- settings internals redesign
- admin/operator redesign
- backend or API suggestions
- speculative platform work

## Useful files and seams

- `antigravity/handoffs/GEMINI_EDITORIAL_LUXURY_WAVE1_2026-03-22.md`
- `apps/mobile/src/App.vue`
- `apps/mobile/src/styles.css`
- `apps/mobile/src/components/AuthPanel.vue`
- `apps/mobile/src/components/ConnectionStatus.vue`
- Gemini's generated:
  - `design_exploration.md`
  - optional `scene_exploration.md`
  - `implementation_plan.md`
  - `walkthrough.md`

## Return

1. Findings first, ordered by severity
2. Whether the five concepts are genuinely distinct enough for human choice
3. Any wave-1 scope violations
4. Any accessibility or mobile-risk issues
5. Brief verdict:
   - valid exploration round
   - or not yet
