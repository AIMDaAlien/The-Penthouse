# Gemini Test Brief — The Penthouse PWA

## What you're testing
A SvelteKit PWA chat app. Real-time messaging via Socket.IO, Fastify/Postgres backend.
Branch: `pwa`. Frontend at `http://localhost:5173`, backend at `http://localhost:3000`.

---

## Setup (do this first)

```bash
# 1. Start the database
npm run db:start

# 2. Run migrations
DATABASE_URL=postgresql://penthouse:penthouse@localhost:5432/penthouse \
  npm --workspace services/api run db:migrate

# 3. Start the backend (in one terminal)
npm --workspace services/api run dev

# 4. Start the frontend (in another terminal)
npm --workspace apps/web run dev

# 5. Install Playwright browsers (once)
cd apps/web && npx playwright install chromium
```

---

## Run the full suite

```bash
cd apps/web

# All suites together
npx playwright test e2e/suite-auth.spec.ts \
                   e2e/suite-chat.spec.ts \
                   e2e/suite-reactions-replies-pins.spec.ts \
                   e2e/suite-polls.spec.ts \
                   e2e/suite-gif.spec.ts \
                   e2e/suite-users.spec.ts \
  --reporter=html

# Individual suite
npx playwright test e2e/suite-chat.spec.ts --headed
```

---

## What each suite covers

| File | Features |
|---|---|
| `suite-auth.spec.ts` | Register, login, logout, session persistence, bad credentials |
| `suite-chat.spec.ts` | Send/receive real-time, pending state, Enter key, unread badge, connection dot, read receipts |
| `suite-reactions-replies-pins.spec.ts` | Add/toggle/real-time reactions, reply-to with quote, cancel reply, pin message |
| `suite-polls.spec.ts` | Create poll via `/poll`, validation, PollCard in thread, vote, idempotent double-vote |
| `suite-gif.spec.ts` | Open/close picker, trending load, cache on reopen, search, send GIF, aspect ratio |
| `suite-users.spec.ts` | Directory search, user profiles, Send Message → DM, settings, New DM modal |

---

## Known skips / expected failures

| Test | Why |
|---|---|
| `suite-gif.spec.ts` — trending load | Requires `GIPHY_API_KEY=H2jGWv5wskQcoU1gMU2f3YuLCYYLHqjN` in `services/api/.env` (already set) |
| Pin tests | `test.skip()` fires if the pin button isn't exposed via long-press context menu in this build |
| Reply tests | `test.skip()` fires if the reply button isn't exposed via the message context menu |
| Presence inactivity tests | 65+ second tests in `presence.spec.ts` — skip unless you have time |

---

## Things Gemini should flag (beyond test failures)

### Visual
- Message bubbles with broken aspect ratio (GIFs especially)
- Muted chat indicator (🔕) misaligned with chat name
- Unread badge overlapping avatar
- Reaction pill overflows bubble on long emoji sequences
- Poll option bars rendering at wrong width

### Interaction feel
- Long-press threshold — does 500ms feel right on mobile viewport?
- Search debounce — does 400ms feel snappy enough while typing?
- Scroll position jumps when loading older messages
- Composer input obscured by soft keyboard (test at 375px viewport)

### Mobile viewport (add `--project=mobile` if configured)
```bash
# Quick mobile check
npx playwright test e2e/suite-chat.spec.ts \
  --project=chromium \
  --viewport-size=375x812
```

### Accessibility
- Tab through context menu: Close → Mute → Cancel
- Escape closes every modal (auth, DM modal, AvatarModal, GIF picker, PollBuilder)
- Screen reader announcements on unread badge count change

### Error states to test manually
1. Send a message while network is throttled (DevTools → Slow 3G) — does optimistic message revert?
2. Open GIF picker, put DevTools offline, search — does error toast appear?
3. Vote on a poll twice rapidly — does count stay at 1?

---

## Reporting back

For each failed test:
1. Screenshot path (auto-saved to `apps/web/test-results/`)
2. Console errors from the browser (check DevTools or Playwright trace)
3. Network tab: did the API return a non-2xx status?

For visual/interaction issues: describe what was expected vs what was observed.
Serious bugs (data corruption, broken auth, socket disconnect loops) → report immediately.
Visual polish → collect into a single list for Claude to fix in a batch.
