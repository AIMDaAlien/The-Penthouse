# HANDOFF → Gemini (E2E Testing: Wave A #6 & #7)

**What to Test:** Chat muting context menu + GIF picker  
**Priority:** First-pass visual/interaction testing before dev iteration  
**Scope:** Playwright + manual device testing

---

## Feature #6: Chat Muting Context Menu

### Test Scenarios

**Long-press behavior (500ms):**
- [ ] Long-press chat row → context menu appears after ~500ms
- [ ] Long-press then quick release → no menu, no navigation
- [ ] Long-press then release → menu appears, original click suppressed
- [ ] Quick click (no long-press) → navigates to chat immediately
- [ ] Multiple rapid clicks → only first non-long-press navigates

**Right-click behavior:**
- [ ] Right-click chat row → context menu appears immediately
- [ ] Right-click does NOT navigate to chat
- [ ] Menu appears at pointer position (or bottom-sheet on mobile)

**Mute toggle interaction:**
- [ ] Mute button shows "🔕 Mute notifications" when unmuted
- [ ] Mute button shows "🔔 Unmute notifications" when muted
- [ ] Click mute → state changes immediately (optimistic)
- [ ] If network fails, state reverts after error toast
- [ ] Muted chat has reduced opacity + muted icon (🔕)
- [ ] Muted chat hides unread badge
- [ ] Unmuted chat shows unread badge again

**Context menu close:**
- [ ] Cancel button closes menu
- [ ] Clicking outside menu (backdrop) closes it
- [ ] Menu closes after mute toggle completes

**Edge cases:**
- [ ] On slow network, mute button disabled during request
- [ ] Error toast appears and auto-dismisses after 4 seconds
- [ ] Rapid mute/unmute clicks queue properly

### Device/Browser Coverage
- [ ] Desktop Chrome (long-press via emulation OR native right-click)
- [ ] Mobile Chrome (Android, 375px viewport) — native long-press
- [ ] Safari (iOS simulator if available) — long-press + right-click both

---

## Feature #7: GIF Picker

### Test Scenarios

**Picker open/close:**
- [ ] Click GIF button (🎬) in composer → picker opens as bottom-sheet
- [ ] Escape key closes picker
- [ ] Click backdrop (outside picker) closes it
- [ ] Close button (✕) closes picker
- [ ] Multiple opens/closes work without errors

**Trending tab (default):**
- [ ] Picker opens on Trending tab by default
- [ ] Loading state shows "Loading GIFs..."
- [ ] GIFs load and display in responsive grid
- [ ] Grid adjusts from 1 column (small) to 4+ columns (wide)
- [ ] Hover over GIF → scales up slightly, border highlights
- [ ] Click GIF → sends message immediately, picker closes

**Search tab:**
- [ ] Tab click switches to Search
- [ ] Search input visible and focused
- [ ] Type search query → debounces 400ms
- [ ] Results appear below input
- [ ] Search input stays editable while request in flight (no disabled state)
- [ ] If search request is slow, user can refine query without waiting
- [ ] Stale search responses don't overwrite newer results
- [ ] Example searches: "cat", "dance", "reaction", "thumbs up"
- [ ] No results message shows when query returns empty
- [ ] Error toast on API failure (e.g., network down)

**Trending cache:**
- [ ] Close picker after loading trending
- [ ] Reopen picker → trending GIFs load instantly (from cache)
- [ ] Wait 5+ minutes, close/reopen → fresh trending GIFs load
- [ ] Close picker, switch to Search tab, back to Trending → uses cache if <5 min old

**GIF message render:**
- [ ] Sent GIF appears in chat as inline image (not link)
- [ ] GIF bubble has no padding (image fills bubble)
- [ ] GIF image has max-width: 240px
- [ ] GIF aspect ratio preserved
- [ ] GIF shows "Sent" checkmark if user sent it
- [ ] GIF shows read receipts (for DMs: "Seen" pill; for channels: avatar stack)
- [ ] Multiple GIFs in a thread render correctly
- [ ] GIF loads lazily (`loading="lazy"` on img tag)

**Composer state:**
- [ ] GIF button appears next to send button in gray neutral style
- [ ] GIF button disabled while message is sending
- [ ] Text input and GIF button remain separate (no visual conflict)
- [ ] Sending a text message does NOT close GIF picker if open

**Error handling:**
- [ ] Network error on trending load → "Failed to load trending GIFs"
- [ ] Network error on search → "Search failed"
- [ ] Error toast dismisses after 4 seconds
- [ ] Can retry by clicking tab again or typing new search
- [ ] GIF send failure → "Failed to send GIF." toast, GIF removed from chat, input restored

### Device/Browser Coverage
- [ ] Desktop Chrome (full grid)
- [ ] Mobile Chrome (375px, grid wraps to 2-3 columns)
- [ ] Tablet portrait (3-4 columns)
- [ ] Tablet landscape (5-6 columns)
- [ ] Safari mobile (gesture friendliness)

---

## Enhanced Testing Tools & Capabilities

### Current Stack
- **Playwright** — browser automation, headless, fast, cross-browser
  - Good for: click/type sequences, assertions, CI integration
  - Limited for: realistic touch/gesture timing, visual pixel comparisons, accessibility

### Recommended Additions

#### 1. **Cypress** (Alternative/Complement to Playwright)
- Native browser runner (NOT headless-only) = see in real-time
- Built-in visual regression with `cy.screenshot()` + Percy integration
- Better mobile device emulation
- Time-travel debugging (replay test step-by-step)
- Excellent for "watch test run" debugging
- **Cost:** Free for open-source, paid for CI integration
- **Use case:** Gemini runs Cypress locally to see test + visual diffs side-by-side

#### 2. **Percy** (Visual Regression Testing)
- Screenshot diff tool for catching subtle UI regressions
- Integrates with Playwright/Cypress
- Detects unintended color, spacing, font changes
- **Cost:** Free tier for open-source
- **Use case:** Snapshot each feature state (muted vs unmuted, picker open, search results) and flag changes

#### 3. **Accessibility Testing (axe-core + Playwright)**
- Automated a11y checks (contrast, ARIA, focus order)
- Detects keyboard navigation issues
- Ensures read receipts component is accessible
- **Cost:** Free (open-source)
- **Installation:** `npm install --save-dev @axe-core/playwright`
- **Use case:** Gemini adds a11y assertions to every test

#### 4. **Touch Gesture Simulation**
Playwright supports touch events natively but they feel "instant":
```javascript
await page.touchscreen.tap(x, y);  // instant
await page.touchscreen.longPress(x, y);  // ~500ms hold
```
Better approach for realistic long-press testing:
- Use **puppeteer-extra-plugin-stealth** for more realistic pointer events
- Or manually emit `pointerdown` + delay + `pointerup` with randomized timings
- Simulate "drift" (small mouse movement during long-press)

#### 5. **Network Throttling (Playwright built-in)**
- Test GIF search on "Slow 3G" / "Fast 3G" to verify input stays editable
- Verify stale-response suppression works under high latency
```javascript
await page.route('**/*', route => {
  setTimeout(() => route.continue(), 2000); // 2s delay
});
```

#### 6. **Visual Testing with Puppeteer + Jimp/Sharp**
- Capture screenshots, diff against baseline
- Detect pixel-level layout shifts
- Alternative to Percy if budget is tight
- **Cost:** Free (DIY tool)
- **Use case:** Automated baseline screenshot creation

#### 7. **Keyboard Navigation Testing**
- Verify Tab order in context menu (Close → Mute → Cancel)
- Verify Escape key closes picker + menu
- Verify all buttons are keyboard-accessible
```javascript
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
await page.keyboard.press('Enter');
```

#### 8. **Multi-User Simulation (for read receipts)**
- Open same chat in TWO browser contexts simultaneously
- User A sends GIF
- User B scrolls to bottom
- User A sees read receipt on GIF
- Requires socket.io event verification
```javascript
const context1 = await browser.createIncognitoBrowserContext();
const context2 = await browser.createIncognitoBrowserContext();
// login as different users, test concurrent interaction
```

#### 9. **Performance Testing**
- Measure GIF picker open time (should be <500ms for cached trending)
- Measure search response time (should feel snappy on fast connection)
- Use Lighthouse/WebVitals integration
- **Use case:** Ensure no regression in page load/interaction speed

#### 10. **Device Emulation (Playwright + Mobile Profiles)**
```javascript
const mobile = devices['Pixel 5'];  // Android
const iphone = devices['iPhone 12'];  // iOS
const tablet = devices['iPad Pro'];
// Run same test suite on each device profile
```

---

## Recommended Test Structure

```
tests/
├── wave-a-6-mute.spec.ts          # Long-press, right-click, toggle mute
├── wave-a-7-gif-picker.spec.ts    # Picker UI, search, send
├── fixtures/
│   ├── auth.ts                     # Login helper
│   └── chat.ts                     # Create test chats
└── e2e/
    ├── accessibility.spec.ts        # a11y checks (axe)
    ├── performance.spec.ts          # timing assertions
    ├── mobile-gestures.spec.ts      # long-press, swipe on mobile
    └── multi-user.spec.ts          # concurrent interactions
```

---

## Automation Stack Proposal (Antigravity)

**Tier 1 (Now):**
- Playwright for core interaction tests
- Manual device testing (real Android phone + iOS simulator)
- Percy for baseline visual snapshots

**Tier 2 (Next Sprint):**
- Cypress for development (real-time debugging)
- axe-core for accessibility
- Network throttling tests for slow connections

**Tier 3 (Post-MVP):**
- Multi-user test suite (concurrent read receipts, typing indicators)
- Lighthouse performance budgets
- Custom touch-gesture timing library

---

## What Gemini Should Look For (Beyond Playwright)

1. **Visual bugs Playwright can't catch:**
   - Unread badge positioning when muted
   - Muted icon (🔕) alignment in chat name
   - GIF bubble aspect ratio under different widths
   - Read receipt avatar stack overlap
   - Focus ring visibility on keyboard navigation

2. **Interaction timing issues:**
   - Long-press feel (is 500ms the right duration?)
   - Search debounce feel (is 400ms responsive enough on slow network?)
   - Mute toggle animation (is it too fast/slow to perceive as "done"?)

3. **Device-specific issues:**
   - Android back button behavior (should close picker, not app)
   - iOS gesture conflicts (long-press vs system gestures)
   - Soft keyboard overlap (does GIF button disappear on mobile?)

4. **Accessibility (manual):**
   - Can you tab through context menu?
   - Does screen reader announce muted state?
   - Is GIF alt text meaningful?

5. **Error states that are hard to automate:**
   - Mute fails halfway through (network drop mid-request)
   - Search request takes 30s (slow network) then succeeds
   - User closes picker while GIF is sending

---

## Success Criteria

- [ ] No unexpected navigation on long-press complete
- [ ] Mute state visual clearly indicates muted/unmuted
- [ ] GIF picker loads trending instantly on reopen (cache working)
- [ ] Search refine works without "disabled input" lag
- [ ] GIF messages render inline with correct aspect ratio
- [ ] Read receipts show correct format for DM vs channel
- [ ] Error toasts appear and auto-dismiss
- [ ] All interactive elements keyboard accessible
- [ ] Works smoothly on 375px Android + iPad

---

## Kickoff
Ready for Gemini to spin up test suite. Report any visual anomalies, interaction timing feedback, or accessibility issues back to Claude for fixes. This will be our first human-like eyes on the features before wider alpha testing.
