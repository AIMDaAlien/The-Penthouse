<template>
  <div class="floating-shell">
    <main class="floating-content">
      <!-- Logo as part of a floating module -->
      <div class="floating-logo-plate">
        <div class="vertical-logo">
          <span class="logo-the">The</span>
          <span class="logo-pent">PENT</span>
          <span class="logo-house">HOUSE</span>
        </div>
      </div>

      <!-- State: Auth -->
      <section v-if="shellState === 'auth'" class="floating-state">
        <div class="glass-plate auth-plate">
          <h3>Welcome</h3>
          <div class="mock-fields">
             <div class="mock-input"></div>
             <div class="mock-input"></div>
             <div class="mock-btn">Join</div>
          </div>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="floating-state">
        <div class="glass-plate gated-plate">
          <span class="utility-font accent">Security</span>
          <h3>Testing Gate</h3>
          <div class="mock-btn outline">Sign Agreement</div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="floating-state app-state">
        <div class="glass-plate nav-plate">
           <div class="nav-item active">Chats</div>
           <div class="nav-item">Directory</div>
           <div class="status-pill">
              <div class="dot"></div>
           </div>
        </div>
        
        <div class="glass-plate content-plate">
           <div class="mock-thread">
              <div class="bar"></div>
              <div class="bar w-short"></div>
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
/* Concept 7: FLOATING PLATES
   - Vertical Logo, Left Aligned
   - Palette: Cloudy Temple (Solid colors only)
   - Style: High rounding (32px+), independent "plates" of glass
   - Font: Ubuntu Variable
*/

.floating-shell {
  height: 100%;
  width: 100%;
  display: flex;
  background: #3c6da7; /* Muted Blue base for variety */
  color: #fff;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
  position: relative;
}

/* Secondary solid color blocks for depth */
.floating-shell::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: #1c2729; /* Dark Slate overlay to mute the blue */
  opacity: 0.9;
}

.floating-content {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  z-index: 10;
}

.floating-logo-plate {
  align-self: flex-start;
  padding: 24px;
  background: rgba(215, 212, 241, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 40px;
  border: 1px solid rgba(255,255,255,0.05);
}

.vertical-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.8;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1rem;
  margin-bottom: 2px;
  opacity: 0.6;
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 1.8rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.floating-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: pop-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(0.95) translateY(30px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.glass-plate {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  border-radius: 40px;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 32px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.4);
}

.auth-plate {
   max-width: 360px;
}

.glass-plate h3 {
  font-family: "Erode", serif;
  font-size: 2rem;
  font-weight: 300;
  margin: 0 0 24px 0;
}

.mock-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-input {
  height: 60px;
  background: rgba(0,0,0,0.3);
  border-radius: 30px;
}

.mock-btn {
  height: 60px;
  background: #6768ab; /* Very Peri */
  color: #fff;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-top: 12px;
}

.mock-btn.outline {
  background: transparent;
  border: 1px solid #6768ab;
  color: #6768ab;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.7rem !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.accent {
  color: #d7d4f1;
}

.app-state {
  flex-direction: row;
  align-items: stretch;
}

.nav-plate {
  width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.nav-item {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  opacity: 0.4;
  font-size: 1.1rem;
}

.nav-item.active {
  opacity: 1;
  color: #6768ab;
}

.status-pill {
  margin-top: auto;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: #1c2729;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9af0b9;
  box-shadow: 0 0 10px #9af0b9;
}

.content-plate {
  flex: 1;
}

.mock-thread {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bar {
  height: 40px;
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
}

.w-short { width: 40%; }
</style>
