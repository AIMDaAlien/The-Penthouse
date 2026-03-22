<template>
  <div class="shell">
    <transition name="topbar-flip">
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
      <section v-if="shellState === 'auth'" class="stack grid-stack">
        <div class="pill tall span-full">
           <span class="tag">Identity</span>
           <h2>Access<br>Port</h2>
        </div>
        <div class="pill span-full outline-pill">
           <div class="mock-input"></div>
           <div class="action-btn">Enter</div>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="stack grid-stack">
        <div class="pill tall warning span-full">
           <span class="tag">System</span>
           <h2>Locked</h2>
        </div>
        <div class="pill span-full outline-pill">
           <p>Wait for build clearance.</p>
           <div class="action-btn outline">Ack</div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="stack signedin-stack grid-stack">
        <header class="signedin-header span-full">
           <div class="mini-logo">TPH</div>
           <div class="avatar"></div>
        </header>
        <div class="nav-pills span-full">
           <div class="nav-item active">Feed</div>
           <div class="nav-item">Explore</div>
        </div>
        <div class="pill content-card span-full outline-pill">
           <div class="line"></div>
           <div class="line short"></div>
        </div>
        <div class="pill content-card span-half outline-pill">
           <div class="line"></div>
        </div>
        <div class="pill content-card span-half outline-pill">
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
/* Wave 4 - Concept 3: Pine Magazine */
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
  perspective: 1000px;
}

.top-bar {
  width: 100%;
  height: 18vh;
  padding: 30px 24px;
  background: #31748f; /* rp-pine */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
}

.topbar-flip-enter-active,
.topbar-flip-leave-active {
  transition: all 0.6s cubic-bezier(0.8, 0, 0.2, 1);
  transform-origin: top;
}

.topbar-flip-enter-from,
.topbar-flip-leave-to {
  transform: rotateX(90deg);
  opacity: 0;
}

.large-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.85;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.5rem;
  color: #191724; /* rp-base */
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 3.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #191724; /* rp-base */
}

.viewport {
  flex: 1;
  padding: 18vh 20px 40px 20px;
  overflow-y: auto;
  position: relative;
  z-index: 10;
  transition: padding-top 0.6s cubic-bezier(0.8, 0, 0.2, 1);
}

.viewport.is-signedin {
  padding-top: 20px;
}

.grid-stack {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
  animation: grid-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes grid-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.span-full {
  grid-column: 1 / -1;
}

.pill {
  background: #1f1d2e; /* rp-surface */
  border-radius: 30px;
  padding: 24px;
}

.outline-pill {
  background: transparent;
  border: 2px solid #26233a; /* rp-overlay */
}

.pill.tall {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pill.warning {
  background: #eb6f92; /* rp-love */
  color: #191724;
}

.tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #9ccfd8; /* rp-foam */
  margin-bottom: 12px;
}

.pill.warning .tag { color: #191724; opacity: 0.8; }
.pill.warning h2 { color: #191724; }

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
  background: #31748f; /* rp-pine */
  color: #e0def4; /* rp-text */
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
}

.action-btn.outline {
  background: transparent;
  color: #31748f;
  border: 1px solid #31748f;
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
  color: #31748f;
}

.avatar {
  width: 40px; height: 40px; border-radius: 20px; background: #9ccfd8; /* rp-foam */
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
  background: #31748f;
  border-color: #31748f;
  color: #e0def4;
}

.content-card {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.line {
  height: 60px;
  background: #26233a; /* rp-overlay */
  border-radius: 20px;
  width: 100%;
}

.line.short { width: 60%; }
</style>
