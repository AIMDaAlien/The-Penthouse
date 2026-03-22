<template>
  <div class="shell">
    <transition name="topbar-slide-left">
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
        <div class="pill content-card">
           <div class="line"></div>
           <div class="line short"></div>
        </div>
        <div class="pill content-card">
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
/* Wave 4 - Concept 4: Kinetic Gold */
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
  background: #191724; /* rp-base */
  border-bottom: 2px solid #eb6f92; /* rp-love */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
}

.topbar-slide-left-enter-active,
.topbar-slide-left-leave-active {
  transition: all 0.5s cubic-bezier(0.5, 0, 0, 1);
}

.topbar-slide-left-enter-from,
.topbar-slide-left-leave-to {
  transform: translateX(-100%);
}

.large-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.85;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.5rem;
  color: #f6c177; /* rp-gold */
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 3.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #f6c177; /* rp-gold */
}

.viewport {
  flex: 1;
  padding: 20vh 20px 40px 20px;
  overflow-y: auto;
  position: relative;
  z-index: 10;
  transition: padding-top 0.5s cubic-bezier(0.5, 0, 0, 1);
}

.viewport.is-signedin {
  padding-top: 20px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
  animation: slide-in 0.8s cubic-bezier(0.19, 1, 0.22, 1);
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

.pill {
  background: linear-gradient(145deg, #26233a, #1f1d2e);
  border-radius: 40px;
  padding: 30px;
  border: 1px solid #403d52; /* rp-highlight-med */
}

.pill.tall {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pill.warning {
  background: linear-gradient(145deg, rgba(235, 111, 146, 0.2), rgba(235, 111, 146, 0.05));
  border-color: #eb6f92;
}

.tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #ebbcba; /* rp-rose */
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
  background: #f6c177; /* rp-gold */
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
  color: #f6c177;
  border: 1px solid #f6c177;
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
  color: #f6c177;
}

.avatar {
  width: 40px; height: 40px; border-radius: 20px; background: #eb6f92; /* rp-love */
}

.nav-pills {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.nav-item {
  padding: 12px 24px;
  background: #26233a;
  border-radius: 24px;
  color: #908caa;
}

.nav-item.active {
  background: #eb6f92;
  color: #191724;
}

.content-card {
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
