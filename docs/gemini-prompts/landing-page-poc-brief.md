# Gemini Creative Brief — The Penthouse Landing Page (10 POCs)

## Who you are

You are a frontend designer and creative director. You write HTML/CSS/JS that could be mistaken for a Stripe or Linear marketing page — but darker, more intimate, less corporate. You have a strong instinct for typography and atmosphere.

---

## What you're building

A landing page for **The Penthouse** — an invite-only, privacy-focused messaging app for small, close communities (~20–200 people). It lives at `penthouse.blog`. This is the first thing a newcomer sees before they enter the app.

**Tone and atmosphere:**
- Think: *upper-floor apartment you were buzzed into, not a hotel lobby*. Close-knit. Deliberate. Quiet confidence.
- It's early/alpha. Be honest about that — not apologetic, not hype. The vibe is: "you were invited for a reason, come in."
- The people who use this app know each other. This isn't for strangers.
- **NOT**: a SaaS product, a startup pitch, a Slack competitor, anything with bullet-pointed "features"
- **NOT**: corporate tech copy. Phrases like "real-time messaging," "seamless communication," "stay connected" are forbidden. They make it sound like Skype from 2008 that somehow has a nice interface.

---

## Hard constraints (do not deviate from these)

### Design tokens — use EXACTLY these

```css
--bg: #12121C;
--bg-surface: #1E1E2D;
--accent: #7777C2;
--accent-hover: #C6C6E6;
--text: #E2E2EC;
--text-soft: #9a9ab4;
--border: rgba(140, 140, 197, 0.2);
--border-hover: rgba(140, 140, 197, 0.35);
--glass: rgba(119, 119, 194, 0.1);
--glass-border: rgba(119, 119, 194, 0.2);
--glass-hover: rgba(119, 119, 194, 0.18);
--glass-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
--glass-glow: 0 4px 24px rgba(119, 119, 194, 0.12);
--ease: cubic-bezier(0.22, 1, 0.36, 1);
```

### Typography

- **Logo only**: `'Erode'` — a refined serif. Load from `https://fonts.cdnfonts.com/css/erode?weights=300,400,500,600`. The Erode logo ("The / Pent / House" stacked) should feel **substantial and present** — this is a landmark in the layout, not a header.
- **Body copy**: `'Ubuntu'` from Google Fonts — `wght@300;400;600`
- **Labels/mono**: `'JetBrains Mono'` from Google Fonts — `wght@400;500`
- Do NOT use Gelasio, Inter, or any other display font

### Logo structure

Always rendered stacked, in Erode:
```
The        ← small, accent color (#7777C2), weight 300–400
PENT       ← large, --text color, weight 300–400
HOUSE      ← large, --text color, weight 300–400
```
The "PENT / HOUSE" lines should be large and have real visual mass. Think 3rem–5rem on desktop. Don't undersize the logo.

### Required page sections (all 4 must appear)

1. **Logo** (see above)
2. **Hero section** — a headline (max 2 lines, light weight, 1.8–3rem) + 2–3 sentence sub-lede that is honest, warm, and non-corporate, + primary CTA button labeled "Enter the app →" that links to `https://penthouse.blog/auth`
3. **"What this is" section** — short, 3–5 items or 2–3 sentences. Should feel like a statement of values, NOT a feature list. Avoid tech jargon.
4. **"Get the app" section** — explains the PWA (add to home screen via Chrome/Safari, no app store), + a **dynamic APK block** (see below)
5. **Footer** — `v2.1.0-alpha · invite only · © The Penthouse` in mono font, low opacity

### Dynamic APK block (required in section 4)

Include this JavaScript inline. When the page loads, it fetches `https://api.penthouse.blog/api/v1/app-distribution`. If the response has `legacyAndroid.status === "available"`, show a secondary link/button: "Legacy Android APK". If the status is anything other than `"available"`, or if the fetch fails, show nothing (no dead button). This is best-effort — never show an error if the fetch fails.

```js
async function checkApk() {
  try {
    const res = await fetch('https://api.penthouse.blog/api/v1/app-distribution');
    if (!res.ok) return;
    const data = await res.json();
    if (data?.legacyAndroid?.status === 'available') {
      document.getElementById('apk-block').style.display = 'block';
    }
  } catch { /* silently hide */ }
}
checkApk();
```

The APK block element should default to `display: none` and the script reveals it.

### Background atmosphere — always include

- Floating color orbs (position: fixed, blur: 80–100px, border-radius: 50%, subtle animation)
- Grain texture overlay (SVG feTurbulence or CSS, ~3% opacity, z-index: 9999, pointer-events: none)
- No background image — use radial gradients and orbs only

### Technical constraints

- Plain HTML/CSS/JS — no framework, no build step, no imports from npm
- Must work as a standalone `.html` file
- All fonts via Google Fonts CDN + cdnfonts.com (already specified above)
- Mobile-first responsive (target: 375px phone, 640px max content width on desktop)
- Respect `prefers-reduced-motion`
- Accessibility: semantic HTML, ARIA where needed

---

## Your task

Generate **10 complete, standalone HTML files** — each a unique proof of concept for this landing page.

Every POC must:
- Follow ALL hard constraints above (tokens, fonts, logo, 4 sections, APK script, orbs, grain)
- Be a complete, runnable HTML file
- Feel visually and tonally distinct from the others

Across the 10 POCs, explore diverse design directions. Some ideas to push into:
- One that is extremely minimal — almost nothing on the page, maximum white space (dark space?)
- One that leans editorial — long-form, thoughtful prose sub-lede, almost like a letter
- One where the logo dominates — fills most of the viewport, everything else is secondary
- One with a strong typographic hierarchy — section numbers in giant mono, tight columns
- One that feels like a private club invitation — formal but warm
- One that feels spare and brutalist — stark grids, no decorative elements
- One that plays with the sections as a vertical timeline / numbered journal entries
- One that uses the glass card aesthetic heavily — frosted panels, layered depth
- One where the CTA button is the dominant element above the fold — everything else recedes
- One that's warmly conversational — reads like a message from a friend, informal prose

Each POC should have a **concept name** as an HTML comment at the top: `<!-- Concept: [Name] -->`.

Give each POC its own copy — don't reuse the same headline across all 10. The copy should feel alive and specific. Headlines should be short, unexpected, and honest. Sub-ledes should sound like a person wrote them, not a product team.

Example headline directions (don't copy these exactly, find your own):
- "Somewhere quiet. For the people who matter."
- "Not for everyone. Just for yours."
- "You were invited. You know what that means."
- "Small circles, real conversations."

**Output format:** 10 complete HTML files, clearly separated and labeled (Concept 1 of 10, Concept 2 of 10, etc.).
