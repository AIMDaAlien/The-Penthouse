# PRODUCT.md — The Penthouse

> Source-of-truth for who this app is for, what it's trying to be, and what
> design choices are out of bounds. Bootstrapped from `docs/CLAUDE-FLOW-
> IMPLEMENTATION-HANDOFF.md` (2026-05-14) and the V5 design language.
> Update when product strategy or brand voice shifts.

## register

**product** — design serves the chat experience.

Exception: marketing surfaces, the wordmark, and app-icon work are **brand**
register. Identity assets earn the editorial-print treatment; product chrome
keeps the humanist-sans restraint.

## Product purpose

The Penthouse is a small, premium chat app for one-on-one and small-group
conversation. The mental model is a private floor of an apartment building:
quiet, considered, yours — not a town square, not a workplace, not a feed.

It is not trying to be Slack, Discord, Teams, Messenger, or iMessage. It is
trying to be the chat app you choose because you spend hours in it and you
care how it feels.

Core capabilities (current and near-term):
- One-on-one and small group chats
- Five hand-tuned color themes × dark/light mode
- Per-user profile styles (Editorial / Vogue / Wallpaper) that everyone else
  sees when they visit your profile
- Local-first storage, end-to-end encryption direction (per the WebRTC sync
  handoff in `docs/CODEX-HANDOFF-LOCAL-FIRST-SYNC-WEBRTC.md`)

## Users

Primary persona: **design-literate adults** who pick their tools deliberately.
They use Linear, Things, Arc, Cron-era Notion, Raycast. They notice when a
font has a real italic vs. an oblique. They will pay for a chat app they
enjoy if it respects their taste.

Secondary persona: **small intentional groups** — partners, two-to-six person
friend pods, a creative collaborator — who want a shared space that isn't
shared with their job, family group thread, or strangers.

They are NOT:
- Teams replacing Slack
- Communities replacing Discord
- People who want stickers, GIF browsers, message reactions menus deep enough
  to need search

## Voice and tone

- **Editorial, not corporate.** The wordmark is set in a high-contrast serif
  (Playfair Display or similar). Settings labels and headings borrow that
  print-magazine cadence — *N°01 Identity*, *Appearance*, *Profile style*.
- **Quiet, not loud.** No exclamation points in UI copy. No "Awesome!" toasts.
  Errors are sober and specific. Confirmations are understated.
- **Considered, not clever.** Avoid puns, winks, "Anyway, here's…"
  conversational filler. Every word earns its place.
- **First-person plural is rare.** Most UI speaks in second person or no
  person at all. "Your messages stay on your device" — not "We keep your
  messages safe."

## Anti-references

Things this product is actively *not*:

- **Generic SaaS chat** — bubblegum primaries, sticker drawers, "fun" empty
  states, gradient hero-metric tiles.
- **Glassmorphic neon / Web3** — frosted cards, mint-on-purple gradients,
  blockchain-adjacent typography.
- **AI workflow slop** — meaningless gradient-text headlines, "Built with AI
  ✨", isometric robot illustrations, the lavender-to-pink hero.
- **Telegram/Discord density** — every pixel a button, persistent left rail
  of unread badges, channel directories.
- **iMessage skeuomorphism** — tail-shaped bubbles, drop shadows on bubbles,
  "Delivered" / "Read" receipts shouting at the user.

## Strategic principles

1. **Themes are moods, not novelty.** Five hand-tuned palettes (Periwinkle,
   Sage, Slate, Plum, Charcoal) × two modes (dark, light). No sliders, no
   custom colors, no per-conversation backgrounds. Limits are the feature.

2. **Profile style is identity, not customization.** Three layouts
   (Editorial / Vogue / Wallpaper). Choosing one is a personality statement
   visible to everyone who visits you. There won't be a fourth without a
   real reason.

3. **The chat surface is the product.** Every other screen — settings,
   directory, profile — exists to support what happens in a conversation.
   Settings should never be more designed than the chat pane.

4. **Local-first.** The user's data lives on their device first; sync is a
   convenience, not the source of truth.

5. **Editorial restraint.** When in doubt: fewer surfaces, fewer borders,
   more breathing room, smaller type, longer hold on motion. Never reach
   for a card to fix a layout problem.

## Brand identity coordinates

- **Wordmark:** "The PENT HOUSE" — small italic "The" (~28pt at lockup
  scale), large all-caps serif "PENT" / "HOUSE" stacked. High-contrast
  serif (Didone-ish). Color: ink white on dark, ink-near-black on light.
  Accent: Periwinkle (`oklch(0.69 0.140 285)`) used only on the word "The".
- **App icon:** separate object from the wordmark. Must work at 16px. See
  the logo prototype at `/prototypes/logo`.
- **Default theme:** Periwinkle, dark mode.
- **Surface neutrals:** tinted toward the theme hue at chroma 0.020–0.032.
  Never `#000` or `#fff`.

## Out of scope

Documented to prevent scope drift:
- Public channels / discovery
- Voice & video calling beyond the WebRTC sync transport
- Threaded replies (flat conversation only)
- Emoji reactions picker beyond the existing curated set
- User-defined themes or wallpapers (deliberately removed — see flow handoff)
- Marketplace, integrations, bots
