# Claude Prompt: High-End Responsive Redesign for The Penthouse

## Context
You are tasked with overhauling the visual design, animations, and transitions of The Penthouse PWA (`apps/web`). The goal is to upgrade the current dull styling to an elegant, high-end, luxury aesthetic ("Nocturne").

**CRITICAL AESTHETIC RULES:**
- NO "techy" developer-tool vibes.
- NO generic messaging app looks (avoid standard colored chat bubbles).
- Think "quiet luxury", editorial, high-end print, tactile depth.

## The Objective
Implement a fully responsive design that explicitly differentiates between Mobile and Desktop experiences using the refined concepts provided in the HTML mockups. Emphasize micro-interactions and frosted glass aesthetics.

### 1. Base Component System (Nocturne Palette)
Update all base UI elements to follow a new pill-shaped, elegant design system.
- **Palette:** 
  - Backgrounds: `#12121C` (Base), `#1A1A24` (Surface), `#242432` (Elevated)
  - Accents: Primary `#7070DA`, Secondary `#8282C3`, Primary-Light `#C0C0F0`, **Lighter Periwinkle** `#B4B4FF` (for high-contrast toggles).
  - Utility: Danger/Delete must be **Muted Scarlet** (`#D65A4A`) to avoid harsh contrast.
- **Shapes:** All buttons, search inputs, and interactive pills MUST have a fully rounded pill shape (`border-radius: 9999px`).
- **Icons:** Strip out all default/Google Material icons. Replace them with custom, elegant geometric SVG paths (using a thin `1.5px` stroke, `fill: none`, `stroke-linecap: round`). 

### 2. Chat Composer (Minimalist Ledger)
- **Layout:** Right-aligned actions. The text input should have a minimalist ledger style (border-bottom only, transitioning to primary color on focus).
- **Buttons:** Action buttons must be floating circular frosted glass buttons (`backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.05)`).
- **Animations:**
  - **Media Picker:** The media picker MUST use a **"Fan Out"** animation where the mock images/options spring out from behind the button in an arc.
  - **Voice Record:** When held/active, the button pulses with the Muted Scarlet danger color.
  - **Send Button:** Must be persistently visible on the right. When clicked, it should perform a "fly-away" animation (scaling down and translating up/right) while the text input fades slightly.

### 3. Empty States (Left-Aligned Book)
- **Layout:** Left-aligned.
- **Typography:** Feature an authentic literary or philosophical quote using the display font (`Gelasio`, italic), with the author attribution below it.
- **Style:** Apply a gradient fade to the quote text (e.g. solid white fading into transparency at the bottom). A small monospace, uppercase subtitle (e.g., "DIRECTORY IS EMPTY") should sit strictly above the quote.

### 4. Settings Panel (Fullpage Editorial)
- **Layout:** Fullpage editorial style. Ensure the profile view maintains the existing app logic but visually upgrades it. It must include a **customizable top header banner gradient** (show a camera icon or overlay on hover indicating it can be changed), with the user's avatar overlapping the bottom edge.
- **Toggles:** Implement the **"Inset Neumorphic"** custom toggle design. Ensure the active state uses a striking, **lighter periwinkle (`#B4B4FF`)** for high contrast against the dark background.
- **Popups/Toasts:** All modals (like the "Sign Out" confirmation) and toast notifications MUST use a heavy frosted glass aesthetic (`background: rgba(36, 36, 50, 0.8)`, `backdrop-filter: blur(16px)`).

### 5. Desktop & Mobile Layout Transitions
- **Mobile (< 768px):** Use the "Floating" concept for the bottom navigation (floating above content, heavy blur and shadow). Spacious padding for chat rows.
- **Desktop (>= 768px):** Use the "Monolith Expansion" concept. A centered container that physically expands outward smoothly upon successful login, transitioning from a compact auth card to a full split-pane view.

## Implementation Steps
1. **Global Variables:** Update `/apps/web/src/routes/+layout.svelte` with the Nocturne palette, Muted Scarlet, Lighter Periwinkle, and custom radii.
2. **Empty States:** Overwrite existing empty states across the app to use the Left-Aligned Book concept with Gradient Fade Quotes.
3. **Settings:** Refactor `settings/+page.svelte` to use the customizable banner/avatar layout, Inset Neumorphic toggles, and frosted glass modals.
4. **Composer:** Refactor `MediaComposer.svelte` and `ReplyBar.svelte` to implement the minimalist ledger input, right-aligned frosted actions, and the specified micro-interactions (Fan Out media morph, voice pulse, send fly-away).
5. **Responsiveness:** Guarantee the structural differences between Mobile Floating Nav and Desktop Monolith Expansion are maintained.