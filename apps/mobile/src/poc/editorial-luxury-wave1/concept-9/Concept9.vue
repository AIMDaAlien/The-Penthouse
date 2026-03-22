<template>
  <div class="pillar-shell">
    <header class="pillar-header">
      <div class="vertical-logo">
        <span class="logo-the">The</span>
        <span class="logo-pent">PENT</span>
        <span class="logo-house">HOUSE</span>
      </div>
      <div v-if="shellState === 'signedin'" class="status-indicator">
        <div class="dot"></div>
      </div>
    </header>

    <main class="pillar-scroll-container">
      <!-- State: Auth -->
      <section v-if="shellState === 'auth'" class="pillar-state">
        <div class="tall-glass-module">
          <label class="utility-font">Access Port</label>
          <h2>Identity</h2>
          <div class="mock-input"></div>
        </div>
        <div class="tall-glass-module">
          <h2>Passkey</h2>
          <div class="mock-input"></div>
          <div class="pillar-action">Enter Penthouse</div>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="pillar-state">
        <div class="tall-glass-module warning">
          <label class="utility-font">Gate Protocol</label>
          <h2>Internal <br> Access Only</h2>
        </div>
        <div class="tall-glass-module">
          <p>Acknowledging the rebuild terms is mandatory.</p>
          <div class="pillar-action outline">I Understand</div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="pillar-state">
        <div class="tab-module">
          <div class="tab-link active">Feed</div>
          <div class="tab-link">Vault</div>
          <div class="tab-link">People</div>
        </div>
        
        <div class="tall-glass-module content">
          <div class="content-header">
            <h3>Recent Activity</h3>
            <span class="utility-font">Mar 22</span>
          </div>
          <div class="content-body">
             <div class="line"></div>
             <div class="line w-long"></div>
          </div>
        </div>

        <div class="tall-glass-module content">
           <div class="content-body">
             <div class="line w-medium"></div>
             <div class="line"></div>
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
/* Concept 9: THE VERTICAL PILLAR
   - Mobile-First Stacking (Height priority)
   - Vertical Logo (Top-Left)
   - Palette: Cloudy Temple (Solid colors)
   - Style: Heavy Glass, 32px Rounding, No Gradients
*/

.pillar-shell {
  height: 100%;
  width: 100%;
  background: #1c2729; /* Dark Slate Base */
  color: #d7d4f1;
  font-family: "Ubuntu Variable", sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pillar-header {
  padding: 30px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 20;
}

.vertical-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.8;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.1rem;
  opacity: 0.5;
  margin-bottom: 2px;
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 2.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.status-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.1);
}

.dot {
  width: 8px;
  height: 8px;
  background: #9af0b9;
  border-radius: 50%;
  box-shadow: 0 0 8px #9af0b9;
}

.pillar-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 40px 20px;
  display: flex;
  flex-direction: column;
}

.pillar-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slide-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.tall-glass-module {
  min-height: 180px; /* Focus on height */
  background: rgba(215, 212, 241, 0.04);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 32px;
  border: 1px solid rgba(215, 212, 241, 0.08);
  padding: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.tall-glass-module.warning h2 {
  color: #6768ab;
}

.tall-glass-module h2 {
  font-family: "Erode", serif;
  font-size: 2.6rem;
  font-weight: 300;
  margin: 0;
  line-height: 1;
}

.utility-font {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.5;
}

.mock-input {
  height: 50px;
  border-bottom: 2px solid rgba(215, 212, 241, 0.2);
}

.pillar-action {
  height: 60px;
  background: #d7d4f1;
  color: #1c2729;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30px;
  font-weight: 600;
  font-size: 1.1rem;
}

.pillar-action.outline {
  background: transparent;
  border: 1px solid #d7d4f1;
  color: #d7d4f1;
}

.tab-module {
  display: flex;
  gap: 24px;
  padding: 8px 12px;
  margin-bottom: 8px;
}

.tab-link {
  font-size: 1.2rem;
  opacity: 0.4;
}

.tab-link.active {
  opacity: 1;
  font-weight: 500;
}

.tall-glass-module.content {
  min-height: 120px;
  justify-content: flex-start;
  gap: 20px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.content-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.line {
  height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
}

.w-long { width: 85%; }
.w-medium { width: 50%; }
</style>
