# Gemini Editorial-Luxury Wave 1

Use this as the implementation packet for Gemini inside Antigravity.

This is a **member-facing visual exploration slice**, not a broad redesign and not a feature pass.

## Mission

Onboard Gemini to The Penthouse rebuild and run the first controlled visual-exploration wave for the **app shell only**.

The output must be a **five-concept coded POC round** that gives a human real choices without destabilizing the live app shell.

The goal is not "make it prettier."

The goal is:
- prestige
- elegance
- penthouse luxury
- materially distinct editorial directions
- stable, reviewable, screenshot-backed proof of concept work

## Current app truth

- The Penthouse rebuild is already live publicly.
- Stack:
  - mobile: Vue 3 + Vite + Capacitor
  - backend: Fastify + PostgreSQL
  - shared contracts in `packages/contracts`
- Existing member-facing surfaces already exist:
  - auth
  - shared app shell
  - chats
  - message thread
  - message composer
  - member directory
  - profile/settings
  - notification/media/session management
- Admin/operator surfaces also exist, but they are **out of scope for wave 1**.

Source-of-truth context docs:
- `docs/obsidian/00 - Knowledge Hub.md`
- `docs/obsidian/01 - Rebuild Timeline.md`
- `docs/obsidian/09 - Realtime Hardening.md`

## Current shell truth from code

Read these first:
- `apps/mobile/src/App.vue`
- `apps/mobile/src/styles.css`
- `apps/mobile/src/components/AuthPanel.vue`
- `apps/mobile/src/components/ConnectionStatus.vue`

Current shell reality:
- shared `App.vue` shell
- top header with `"The Penthouse"` wordmark and connection badge
- nav tabs for:
  - chats
  - directory
  - settings
- gate states already exist:
  - boot/loading
  - auth
  - session sync required
  - forced password change
  - internal test-notice gate
- current visuals are already:
  - dark mode first
  - mild glass cards
  - periwinkle-adjacent
  - Ubuntu-family default

Do **not** redesign the product architecture. Work with the existing shell shape.

## Locked visual direction

This wave is locked to:

- brand feel: prestige, elegance, penthouse luxury
- anchor: **editorial luxury**
- dark mode first
- Very-Peri / periwinkle-led palette family
- expressive glassmorphism
- fluid, elegant, premium motion

Typography rules are hard requirements:
- `"The Penthouse"` wordmark: **Erode**
- settings menu / technical utility labels: **JetBrains Mono**
- everything else: **Ubuntu Variable**

Recommended token families for implementation:
- `--font-brand`
- `--font-ui`
- `--font-ui-mono`

Do not use Erode for body copy.
Do not let JetBrains Mono bleed into general UI content.

## Asset prerequisite

Before implementation starts, confirm a self-hosted Erode asset exists under:
- `apps/mobile/src/assets/fonts/`

If that asset is still missing, stop and report blocked.

Do not silently substitute another luxury serif and pretend the packet was followed.

## Hard constraints

- member-facing only in wave 1
- no backend/API/schema/contract changes
- no feature expansion
- no admin/operator redesign
- preserve current routing and behavior
- preserve trust-sensitive copy, including DM/admin visibility messaging
- no "same layout, different polish" concepts

## Build method to avoid a broken mess

Do **not** overwrite the production shell five times.

For the concept round:
- create an isolated POC harness under `apps/mobile/src/poc/editorial-luxury-wave1/`
- keep production shell behavior intact during exploration
- use fixed mock states that reflect the real shell:
  - auth shell
  - gated card state
  - signed-in shell with header + nav
- do not redesign message-thread internals, chat-list internals, directory internals, or settings internals in this round

The concept round should explore:
- global design tokens
- typography system
- shell background / atmosphere
- header and wordmark treatment
- connection badge styling
- top-level nav tab styling
- auth shell styling
- loading / session-sync / forced-password / test-notice gate card styling

Only after a human picks one direction may you integrate the chosen concept into the real shell.

## Required five concepts

All five concepts must obey the locked fonts, palette family, dark-mode base, and glass direction.

They must differ materially in:
- layout composition
- information hierarchy
- wordmark treatment
- density and whitespace
- card geometry
- blur/frost intensity
- accent behavior
- nav presentation
- motion language
- ornamental detail

### 1. Skyline Editorial
- dominant wordmark
- tall vertical rhythm
- restrained glow
- strongest magazine / fashion-house penthouse feel

### 2. Gallery Residence
- calm luxury
- oversized margins
- sparse chrome
- large glass planes
- museum-like restraint

### 3. Velvet Private Club
- deeper blacks and ink-violet surfaces
- richer contrast
- more intimate lighting
- sensual highlights
- nightlife-luxury reading while still refined

### 4. Prism Penthouse
- sharper geometry
- faceted glass edges
- reflective layering
- more architectural and high-rise

### 5. Soft Couture
- asymmetry
- softer framing
- more tactile elegance
- premium but warmer and more human

If two concepts share the same dominant visual thesis, the round is invalid.

## Wave 1 scope only

Allowed:
- shell background
- typography system
- header
- wordmark
- connection badge
- top nav
- auth shell
- gate cards

Not allowed in wave 1:
- message thread internals
- chat list internals
- member directory internals
- profile/settings internals
- admin/operator panels

Those are later waves after concept selection.

## Required workflow and outputs

Follow this exact loop:

1. Read the onboarding packet and current shell code.
2. Build **five coded concepts** in the isolated POC harness.
3. Capture screenshots for each concept in equivalent states.
4. Write `design_exploration.md` describing all five.
5. Write `scene_exploration.md` only if atmospheric/layout framing adds real value.
6. Stop for human concept selection.
7. After selection, refine only the winning concept.
8. Write `implementation_plan.md` for the chosen direction.
9. Write `walkthrough.md` with evidence, risks, and what changed.
10. Hand off to Claude / Opus using the paired review packet.

Artifact pattern should match the existing Gemini Antigravity style already in use:
- `design_exploration.md`
- optional `scene_exploration.md`
- `implementation_plan.md`
- `walkthrough.md`

## Evidence and validation

For the concept-selection round, provide:
- one screenshot per concept in equivalent shell states
- short rationale for each concept
- explicit statement of what makes each concept distinct

For the chosen implementation candidate, the work must pass:
- `npm --workspace apps/mobile run test`
- `npm --workspace apps/mobile run build`
- `npm run validate`

Manual evidence required for the chosen implementation candidate:
- auth shell on narrow mobile
- main shell on narrow mobile
- desktop-width shell
- safe-area handling
- header stability
- nav tab readability
- wordmark rendering
- connection badge readability over glass backgrounds
- no horizontal clipping
- no broken gate-card layouts
- smooth motion without input lag

## Stop conditions

Stop and report blocked if:
- Erode asset is missing
- the only way to continue is to redesign deeper screens in wave 1
- concepts are converging into near-duplicates
- shell changes would require backend or contract work

## Return format

Return:
1. the five concepts
2. the screenshots/evidence
3. why each concept is actually distinct
4. your recommended winner and why
5. the exact follow-on risk list before integration
