# Feature Research Swarm Brief — The Penthouse Messaging

## Operator Intent
Messaging app. Final vision not yet locked. Want:
- **Table-stakes** — what every modern messenger must have to feel complete
- **Differentiators** — what NO ONE else does but should
- **Vision-shapers** — features that could change what this app becomes

Explicitly OUT OF SCOPE: e2e encryption (deferred to post-v1 final release).

## Swarm Structure
Launch 4 agents in parallel. Each produces a markdown report under `docs/kimi-rebuild/research/`.

---

## Agent 1 — Competitive Table-Stakes

**Scope**: Audit 8+ messaging apps. Extract every feature users now expect as baseline.

**Targets** (mandatory):
- Telegram (channels, bots, reactions, replies, media, stories, usernames)
- Discord (roles, threads, voice, screen share, server boosts, Nitro)
- WhatsApp (status, communities, business accounts, payments)
- Signal (stories, call links, note-to-self)
- Slack (huddles, clips, workflows, canvas, AI assistant)
- iMessage (tapbacks, voice messages, shared notes, check-ins)
- Matrix/Element (spaces, threads, bridges, extensible events)
- WeChat (mini-programs, pay, moments, official accounts — pick 3 most relevant)

**Output format**:
```
| Feature | Apps that have it | Complexity | UX impact | Backend impact |
| Story/Status updates | WhatsApp, Signal, Telegram | Medium | High | Low |
```

**Deliverable**: `docs/kimi-rebuild/research/01-table-stakes.md`

---

## Agent 2 — Undifferentiated Differentiators

**Scope**: Find features that NO major messenger has implemented well (or at all), but would solve real user pain.

**Research vectors**:
1. Search Reddit/HN/ProductHunt for "messaging app wishlist" "what's missing from Signal/Discord/Telegram"
2. Look at failed/alternative messengers — what did they try that incumbents copied or killed? (e.g., Path, Peach, Secret, Yik Yak, Vero)
3. Look at adjacent tools — what do Notion, Figma, Linear, Loom do that messaging apps should steal?
4. Look at AI-native tools — what does Character.ai, Pi, Claude app do that traditional messengers don't?

**Prompt questions to answer**:
- What if messages had "expiration by engagement" (auto-delete if unread AND unreacted-to after N days)?
- What if group chats had lightweight voting/decision widgets built in?
- What if you could "remix" a message (fork a thread from any message into a new channel)?
- What if there was a "focus mode" that batch-delivered non-urgent messages at scheduled times?
- What if DMs had a "relationship health" meter (response time trends, who initiates more)?
- What if users could set "availability states" deeper than online/away (deep work, open to calls, only urgent)?
- What if the app had a "conversation gardener" that surfaced old threads worth reviving?
- What if there was ephemeral co-editing (type together in a shared note inside the chat)?
- What if channels had "moods" or themes that changed based on time of day or activity?

**Output format**:
```
| Feature | Why no one has it | User pain it solves | Effort | Risk |
| Focus mode batching | Hard to implement well without missing urgency | Notification fatigue | High | Medium |
```

**Deliverable**: `docs/kimi-rebuild/research/02-differentiators.md`

---

## Agent 3 — Delight, Micro-Interactions & Accessibility

**Scope**: Surface-level polish that makes an app feel alive and inclusive.

**Research vectors**:
1. Micro-interactions in top-tier apps — what animations, sounds, haptics create emotional resonance?
2. Accessibility innovations — what do blind/deaf users wish all messengers did? (auto-transcription, description of images, haptic patterns for different message types)
3. Onboarding & empty states — how do apps make first messages feel magical?
4. Notification psychology — what timing, phrasing, and channel mixing reduces fatigue while maintaining engagement?
5. Dark patterns to AVOID — what do Telegram/Discord/WhatsApp do that users secretly hate?

**Prompt questions to answer**:
- What if typing indicators had "emotional tone" (excited typing vs hesitant typing via rhythm analysis)?
- What if senders could attach a "vibe" to a message (calm, urgent, celebratory) that affects notification style?
- What if the app generated alt-text for every image automatically?
- What if there was a "conversation summary" for long threads you missed?
- What if unread badges used subtle motion/gradient changes instead of just numbers?
- What if voice messages had auto-transcription AND sentiment highlighting?

**Deliverable**: `docs/kimi-rebuild/research/03-delight-accessibility.md`

---

## Agent 4 — Technical Enablers & Platform Vision

**Scope**: Features that don't look like features — they unlock what the app CAN become.

**Research vectors**:
1. Bot platforms — how do Telegram/Discord bot ecosystems work? What primitives enable them?
2. Protocol vs Platform — what would it take for The Penthouse to become a protocol others can build on?
3. Local-first / sync architecture — what do Linear, Notion, Figma do for offline resilience that messaging apps don't?
4. AI integration patterns — what does native AI look like in a messenger without feeling bolted-on?
5. Extensibility — custom message types, plugins, themes, client mods
6. Federation / bridging — Matrix bridges, Mattermost integrations, IRCv3

**Prompt questions to answer**:
- What if every chat was a lightweight database that bots could query?
- What if users could write "chat rules" (auto-replies, filters, workflows) in a simple DSL?
- What if the app exposed a local WebSocket that desktop automations (Raycast, Alfred, Shortcuts) could talk to?
- What if there was a "scripting layer" for power users (like Obsidian plugins or VS Code extensions)?
- What if the app had a built-in "CRM mode" for community managers?
- What if message history was queryable with a GraphQL-like interface?
- What if there was a "debug/operator mode" for admins that showed message flow, delivery latency, user activity heatmaps?

**Deliverable**: `docs/kimi-rebuild/research/04-technical-enablers.md`

---

## Synthesis Agent (run after 1-4 complete)

**Scope**: Read all 4 reports. Produce a single ranked backlog.

**Output**: `docs/kimi-rebuild/research/05-synthesis-backlog.md`

**Format**:
```markdown
# Synthesized Feature Backlog

## Tier 1 — Ship before public beta
| # | Feature | Source agent | Why now |

## Tier 2 — Ship before v1.0
| # | Feature | Source agent | Why later |

## Tier 3 — Post-v1 / vision-defining
| # | Feature | Source agent | Risk/reward |

## Rejected / Deferred
| # | Feature | Source agent | Reason |

## Vision pivots to consider
- If we build X, we become Y kind of app
- If we skip Z, we stay a simple messenger
```

---

## Rules for All Agents
1. Cite sources — link to Reddit threads, HN posts, app release notes, research papers
2. Be specific — "AI features" is useless. "Auto-generated conversation summaries on thread open" is useful
3. Estimate effort — Low / Medium / High / Massive
4. Flag dependencies — which features unlock others?
5. No e2e encryption research — operator explicitly deferred
6. Caveman mode active — compress verbosity, keep technical precision
