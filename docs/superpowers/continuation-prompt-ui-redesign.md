# Continuation Prompt: The Penthouse "Nocturne" UI Redesign

**Context:**
We are actively overhauling the visual design, animations, and transitions of The Penthouse PWA (`apps/web`). The project uses SvelteKit 2.x, Svelte 5 runes, and custom CSS variables (no external UI frameworks like Tailwind).

**The Mission:**
Implement the approved "Nocturne" aesthetic directly into Svelte 5 to eliminate translation overhead. No more plain HTML prototypes.

**Core Aesthetic ("Nocturne"):**
- **Vibe:** "Quiet luxury", editorial, high-end print, tactile depth.
- **Rules:** NO "techy" developer-tool vibes. NO standard messaging colored chat bubbles.
- **Palette:**
  - Base Background: `#12121C`
  - Surface: `#1A1A24`
  - Elevated Surface: `#242432`
  - Primary Accent: `#7070DA`
  - Secondary Accent: `#8282C3`
  - Primary Light: `#C0C0F0`
  - High-Contrast Toggle Active: `#B4B4FF` (Lighter Periwinkle)
  - Danger/Delete: `#D65A4A` (Muted Scarlet)
- **Typography:** Display `Gelasio` (serif), Body `Ubuntu` (sans-serif), Monospace `JetBrains Mono`.
- **Shapes & Elements:** Fully rounded pill shapes (`border-radius: 9999px`) for interactive elements. Extensive use of heavy frosted glass (`backdrop-filter: blur(12px)` to `20px`, `background: rgba(..., 0.6)`) for modals, toasts, and floating buttons. Custom 1.5px stroke geometric SVG icons.

**Execution Directive:**
When this prompt is invoked in a new session:
1. Maintain "caveman" style responses (extremely concise, no fluff).
2. Begin direct implementation of these features within the `apps/web/src/**/*.svelte` files.
3. Focus on one major piece at a time (e.g., Global Variables -> Composer -> Empty States -> Settings).
4. Rely exclusively on the reference prototypes mentioned above for styling and animation details.