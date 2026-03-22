<template>
  <div class="monolith-shell">
    <aside class="monolith-sidebar">
      <div class="monolith-logo">
        <span class="logo-the">The</span>
        <span class="logo-pent">PENT</span>
        <span class="logo-house">HOUSE</span>
      </div>
      
      <div v-if="shellState === 'signedin'" class="monolith-connection">
        <div class="conn-indicator"></div>
        <span class="utility-font">Live</span>
      </div>
    </aside>

    <main class="monolith-content">
      <!-- State: Auth -->
      <section v-if="shellState === 'auth'" class="monolith-state">
        <div class="monolith-glass-card">
          <div class="card-body">
            <h3>Enter</h3>
            <div class="mock-form">
              <div class="mock-field"></div>
              <div class="mock-field"></div>
              <div class="mock-submit">Access</div>
            </div>
          </div>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="monolith-state">
        <div class="monolith-glass-card">
          <div class="card-body">
            <p class="utility-font accent">Notice</p>
            <h3>Internal Build</h3>
            <p class="summary">Acknowledging the current test parameters is required for entry.</p>
            <div class="mock-submit outline">Confirm</div>
          </div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="monolith-state app-state">
        <nav class="monolith-nav">
          <button class="active">Chats</button>
          <button>Directory</button>
          <button class="utility-font">Settings</button>
        </nav>
        
        <div class="monolith-viewport">
          <div class="monolith-glass-card full">
            <div class="mock-list">
              <div class="mock-row active-row"></div>
              <div class="mock-row"></div>
            </div>
          </div>
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
/* Concept 6: THE MONOLITH
   - Vertical Logo (The / PENT / HOUSE), Left Aligned
   - Palette: Cloudy Temple (Solid colors only)
   - Style: Heavy Glassmorphism, 32px Rounding
   - Font: Ubuntu Variable for UI
*/

.monolith-shell {
  height: 100%;
  width: 100%;
  display: flex;
  background: #1c2729; /* Dark Slate Base */
  color: #d7d4f1; /* Light Lavender Text */
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
  position: relative;
}

.monolith-sidebar {
  width: 120px;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(215, 212, 241, 0.05);
  background: #1c2729;
  z-index: 20;
}

.monolith-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.85;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.2rem;
  font-weight: 300;
  margin-bottom: 4px;
  opacity: 0.8;
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 2.2rem;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.monolith-connection {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 20px;
  background: rgba(215, 212, 241, 0.05);
}

.conn-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6768ab; /* Very Peri */
  box-shadow: 0 0 10px #6768ab;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.7rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.monolith-content {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

/* Background elements using solid palette colors to provide depth without gradients */
.monolith-shell::before {
  content: '';
  position: absolute;
  top: 10%;
  right: -5%;
  width: 40%;
  height: 80%;
  background: #3c6da7; /* Muted Blue block */
  opacity: 0.1;
  border-radius: 50%;
  filter: blur(100px);
}

.monolith-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: slide-right 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-right {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.monolith-glass-card {
  background: rgba(215, 212, 241, 0.03);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(215, 212, 241, 0.08);
  border-radius: 32px; /* User requestedSoft Couture rounding */
  padding: 48px;
  max-width: 440px;
  box-shadow: 0 32px 64px rgba(0,0,0,0.3);
}

.monolith-glass-card.full {
  max-width: none;
  flex: 1;
}

.card-body h3 {
  font-family: "Erode", serif;
  font-size: 2.4rem;
  font-weight: 300;
  margin: 0 0 24px 0;
  color: #fff;
}

.mock-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-field {
  height: 56px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(215, 212, 241, 0.1);
  border-radius: 16px;
}

.mock-submit {
  height: 56px;
  background: #d7d4f1;
  color: #1c2729;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 28px;
  margin-top: 16px;
}

.mock-submit.outline {
  background: transparent;
  color: #d7d4f1;
  border: 1px solid #d7d4f1;
}

.accent {
  color: #6768ab !important;
}

.app-state {
  justify-content: flex-start;
}

.monolith-nav {
  display: flex;
  gap: 32px;
  margin-bottom: 32px;
}

.monolith-nav button {
  background: none;
  border: none;
  color: rgba(215, 212, 241, 0.4);
  font-size: 1.1rem;
  padding: 0;
  cursor: pointer;
}

.monolith-nav button.active {
  color: #fff;
  font-weight: 500;
}

.mock-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-row {
  height: 72px;
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
}

.active-row {
  background: rgba(103, 104, 171, 0.1);
  border: 1px solid rgba(103, 104, 171, 0.2);
}
</style>
