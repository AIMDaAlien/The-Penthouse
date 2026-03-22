<template>
  <div class="shell">
    <transition name="topbar-lift">
      <header v-if="shellState !== 'signedin'" class="top-bar">
        <div class="large-logo">
          <span class="logo-the">The</span>
          <span class="logo-pent">PENT</span>
          <span class="logo-house">HOUSE</span>
        </div>
      </header>
    </transition>

    <main class="viewport" :class="{ 'is-signedin': shellState === 'signedin' }">
      <!-- State: Auth -->
      <section v-if="shellState === 'auth'" class="stack">
        <div class="pill tall">
           <span class="tag">Identity</span>
           <h2>Access<br>Port</h2>
        </div>
        <div class="pill">
           <div class="mock-input"></div>
           <div class="action-btn">Enter</div>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="stack">
        <div class="pill tall warning">
           <span class="tag">System</span>
           <h2>Locked</h2>
        </div>
        <div class="pill">
           <p>Wait for build clearance.</p>
           <div class="action-btn outline">Ack</div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="stack signedin-stack">
        <header class="signedin-header">
           <div class="mini-logo">TPH</div>
           <div class="avatar"></div>
        </header>
        <div class="nav-pills">
           <div class="nav-item active">Feed</div>
           <div class="nav-item">Explore</div>
        </div>
        <div class="pill border-card">
           <div class="line"></div>
           <div class="line short"></div>
        </div>
        <div class="pill border-card">
           <div class="line"></div>
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
/* Wave 4 - Concept 5: Sunset Editorial */
.shell {
  height: 100%;
  width: 100%;
  background: #191724; /* rp-base */
  color: #e0def4; /* rp-text */
  font-family: "Ubuntu Variable", sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.top-bar {
  width: 100%;
  height: 20vh;
  padding: 30px 24px;
  background: #1f1d2e; /* rp-surface */
  border-bottom: 4px solid #9ccfd8; /* rp-foam */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.topbar-lift-enter-active,
.topbar-lift-leave-active {
  transition: all 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.topbar-lift-enter-from,
.topbar-lift-leave-to {
  transform: translateY(-120%);
}

.large-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.85;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.5rem;
  color: #ebbcba; /* rp-rose */
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 3.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #ebbcba; /* rp-rose */
}

.viewport {
  flex: 1;
  padding: 20vh 20px 40px 20px;
  overflow-y: auto;
  position: relative;
  z-index: 10;
  transition: padding-top 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.viewport.is-signedin {
  padding-top: 20px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
  animation: fade-in 1s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pill {
  background: #26233a; /* rp-overlay */
  border-radius: 40px;
  padding: 30px;
}

.border-card {
  background: transparent;
  border: 1px solid #6e6a86; /* rp-muted */
}

.pill.tall {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pill.warning {
  background: #1f1d2e;
  border: 2px solid #ebbcba;
}

.tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #9ccfd8; /* rp-foam */
  margin-bottom: 12px;
}

.pill h2 {
  font-family: "Erode", serif;
  font-size: 3rem;
  margin: 0;
  font-weight: 400;
  line-height: 0.9;
}

.mock-input {
  height: 2px;
  background: #6e6a86; /* rp-muted */
  margin-bottom: 30px;
  margin-top: 10px;
}

.action-btn {
  height: 60px;
  background: #9ccfd8; /* rp-foam */
  color: #191724; /* rp-base */
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
}

.action-btn.outline {
  background: transparent;
  color: #9ccfd8;
  border: 1px solid #9ccfd8;
}

.signedin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.mini-logo {
  font-family: "Erode", serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #ebbcba;
}

.avatar {
  width: 40px; height: 40px; border-radius: 20px; background: #ebbcba; 
}

.nav-pills {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.nav-item {
  padding: 12px 24px;
  background: transparent;
  border: 1px solid #403d52;
  border-radius: 24px;
  color: #908caa;
}

.nav-item.active {
  background: #9ccfd8;
  color: #191724;
  border-color: #9ccfd8;
}

.border-card {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.line {
  height: 60px;
  background: #403d52;
  border-radius: 20px;
  width: 100%;
}

.line.short { width: 60%; }
</style>
