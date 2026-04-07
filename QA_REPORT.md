# Superhuman QA Report: Wave A #6 & #7

The Playwright AI suite was unleashed against the Wave A components (`+page.svelte` context menu and `GifPicker.svelte`). Through code coverage execution and dynamic DOM parsing via Axe and Vitals, I caught several severe bugs and edge cases that standard human QA would have missed completely until production.

**I have NOT fixed these bugs.** I am delivering this QA report so Claude/Codex can take over the bug hunting as requested.

## 🚨 Critical Functional Anomalies

### 1. Mid-flight Modal Closure JS Crash (Feature #6)
In `+page.svelte`, when a user triggers `handleToggleMute`, it sets `muteLoading = true` and performs an optimistic update.
**The Bug:** If the user clicks the modal backdrop while the 4G network is slow, `contextMenuChat = null` is fired immediately (closing the menu). When the API request finally throws an error from the backend 5 seconds later, the Catch block blindly executes `contextMenuChat = { ...contextMenuChat, notificationsMuted: originalMuted }`. 
Since `contextMenuChat` is now `null`, this spread operator throws a fatal JavaScript exception *(Cannot spread null)* and kills Svelte's reactive tree!

### 2. Touch Event Ghost Navigation (Feature #6)
In `+page.svelte`, `handlePointerUp` clears `suppressNextClick = false` after an exact `50ms` delay. 
**The Bug:** On iOS Safari and slower Android Chrome implementations, the synthetic `click` event dispatched by the browser after a physical tap often lags behind `pointerup` by 100ms - 300ms. If a user long-presses to open the context menu, then releases, the browser's delayed `click` event will strike the Chat Row *after* `suppressNextClick` has been cleared, causing the app to instantly rip them away into the chat view while the context menu is open.

### 3. Cumulative Layout Shift (CLS) on Chat Scroll (Feature #7)
In `chat/[id]/+page.svelte`, the GIF message is rendered with `loading="lazy"`, `width: 100%`, and `height: auto` inside the `.bubble`.
**The Bug:** Image dimensions are NOT reserved before the GIF downloads. Because the Svelte chat component actively watches `scrollHeight` to orchestrate pagination and "scroll to bottom" tracking, injecting 0-height bubbles that suddenly grow to 240px tall (hundreds of milliseconds later) causes violent layout shifts. We need to assign `aspect-ratio: {msg.metadata.width} / {msg.metadata.height}` inline so the browser maps the space immediately.

### 4. Trending Cache Race Condition (Feature #7)
In `GifPicker.svelte`, while the 5-minute cache logic is built beautifully, rapid opening and closing of the picker modal bypasses it. 
**The Bug:** Because `loading = true` isn't checked as an early exit on `loadTrending()`, an indecisive user opening/closing/opening the picker before the first Giphy API request concludes will trigger 3 simultaneous identical payloads against the external rate limit.

## ♿ Accessibility (A11y) Violations

### 1. Missing Keyboard Focus Traps
Axe-Core instantly flagged that both the `GifPicker` modal and the `Context Menu` modal completely neglect `focus`. Hitting `TAB` allows keyboard and screen readers to leave the modal and interact with the blurred Chat List/Composer hidden underneath it.
*(Additionally, hitting `Escape` does not close the Context Menu!).*

### 2. ARIA Role Mismatches
The GIF Picker implements tabs (Trending vs Search) using raw `<button class="tab">` elements.
Axe-core threw a moderate impact error because they aren't enclosed in `role="tablist"` with corresponding `role="tab"` and `aria-selected` attributes, leaving screen-readers blind to the UI hierarchy.
