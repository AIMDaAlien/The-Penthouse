<template>
  <div class="shell">
    <transition name="topbar-fade">
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
/* Wave 4 - Concept 2: Soft Iris */
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
  height: 22vh;
  padding: 30px 24px;
  background: rgba(196, 167, 231, 0.05); /* rp-iris tint */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(196, 167, 231, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
}

.topbar-fade-enter-active,
.topbar-fade-leave-active {
  transition: all 0.7s cubic-bezier(0.25, 1, 0.5, 1);
  transform-origin: top center;
}

.topbar-fade-enter-from,
.topbar-fade-leave-to {
  opacity: 0;
  transform: scaleY(0.8);
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
  color: #e0def4; /* rp-text */
}

.viewport {
  flex: 1;
  padding: 22vh 20px 40px 20px;
  overflow-y: auto;
  position: relative;
  z-index: 10;
  transition: padding-top 0.7s cubic-bezier(0.25, 1, 0.5, 1);
}

.viewport.is-signedin {
  padding-top: 20px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 10px;
  animation: float-up 1s cubic-bezier(0.19, 1, 0.22, 1);
}

@keyframes float-up {
  from { opacity: 0; transform: translateY(60px); }
  to { opacity: 1; transform: translateY(0); }
}

.pill {
  background: rgba(38, 35, 58, 0.6); /* rp-overlay with opacity */
  border-radius: 40px;
  padding: 30px;
  border: 1px solid rgba(82, 79, 103, 0.3); /* rp-highlight-high */
}

.pill.tall {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pill.warning {
  background: rgba(235, 111, 146, 0.15); /* rp-love */
  border-color: rgba(235, 111, 146, 0.4);
}

.tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #f6c177; /* rp-gold */
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
  background: #c4a7e7; /* rp-iris */
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
  color: #c4a7e7;
  border: 1px solid #c4a7e7;
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
  color: #c4a7e7;
}

.avatar {
  width: 40px; height: 40px; border-radius: 20px; background: #ebbcba; /* rp-rose */
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
  background: rgba(196, 167, 231, 0.2);
  border-color: #c4a7e7;
  color: #c4a7e7;
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
