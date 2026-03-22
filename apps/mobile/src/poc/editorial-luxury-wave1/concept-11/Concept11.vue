<template>
  <div class="oversized-shell">
    <header class="oversized-top">
      <div class="vertical-logo">
        <span class="logo-the">The</span>
        <span class="logo-pent">PENT</span>
        <span class="logo-house">HOUSE</span>
      </div>
    </header>

    <main class="oversized-interaction-grid">
      <!-- State: Auth -->
      <section v-if="shellState === 'auth'" class="oversized-state">
        <div class="type-module">
          <span class="utility-font">Step 01</span>
          <h2 class="hero-word">JOIN</h2>
        </div>
        <div class="type-module glass">
           <span class="utility-font">Step 02</span>
           <h2 class="hero-word">LOG</h2>
           <h2 class="hero-word indent">IN</h2>
        </div>
        <div class="type-module">
           <span class="utility-font">Recover</span>
           <p>Forgot Access?</p>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="oversized-state">
        <div class="type-module glass">
           <span class="utility-font accent">Notice</span>
           <h2 class="hero-word">LOCKED</h2>
        </div>
        <div class="type-module">
           <p>This penthouse is currently under construction. Await further signals.</p>
           <div class="action-bar">Synchronize</div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="oversized-state app-state">
        <div class="type-module glass nav">
           <h2 class="hero-word">CHATS</h2>
           <h2 class="hero-word active">DIRECTORY</h2>
           <h2 class="hero-word">SOCIALS</h2>
        </div>
        
        <div class="type-module glass list-module">
           <div class="mag-row"></div>
           <div class="mag-row"></div>
           <div class="mag-row"></div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  shellState: 'auth' | 'gated' | 'signedin'
}>();
</script>

<style scoped>
/* Concept 11: OVERSIZED TYPOGRAPHY
   - Full-height Interaction Grid
   - Vertical Logo (Top-Left)
   - Palette: Cloudy Temple (Solid)
   - Style: Huge Erode Type as the UI handle
*/

.oversized-shell {
  height: 100%;
  width: 100%;
  background: #6768ab; /* Very Peri Base */
  color: #fff;
  font-family: "Ubuntu Variable", sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
}

.oversized-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #1c2729; /* Dark Slate solid overlay */
  opacity: 0.96;
}

.oversized-top {
  padding: 40px 32px;
  position: relative;
  z-index: 10;
}

.vertical-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.8;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.1rem;
  opacity: 0.6;
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 2.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.oversized-interaction-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 32px 64px 32px;
  position: relative;
  z-index: 10;
}

.oversized-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: reveal-stack 1s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes reveal-stack {
  from { opacity: 0; filter: blur(10px); }
  to { opacity: 1; filter: blur(0); }
}

.type-module {
  padding: 24px 0;
}

.type-module.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 40px;
  padding: 40px 32px;
  border: 1px solid rgba(255,255,255,0.06);
}

.hero-word {
  font-family: "Erode", serif;
  font-size: 4.5rem;
  line-height: 0.85;
  margin: 0;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: #d7d4f1;
}

.hero-word.indent {
  padding-left: 1ch;
}

.hero-word.active {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 12px;
  text-decoration-thickness: 1px;
}

.utility-font {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #6768ab;
  display: block;
  margin-bottom: 12px;
}

.accent {
  color: #9d90be;
}

.action-bar {
  margin-top: 24px;
  height: 64px;
  border: 1px solid #d7d4f1;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-module {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mag-row {
  height: 80px;
  background: rgba(255,255,255,0.02);
  border-radius: 24px;
}
</style>
