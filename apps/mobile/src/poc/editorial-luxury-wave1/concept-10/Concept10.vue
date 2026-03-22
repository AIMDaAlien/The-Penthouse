<template>
  <div class="kinetic-shell">
    <div class="kinetic-logo-area">
      <div class="vertical-logo">
        <span class="logo-the">The</span>
        <span class="logo-pent">PENT</span>
        <span class="logo-house">HOUSE</span>
      </div>
    </div>

    <main class="kinetic-viewport">
      <!-- State: Auth -->
      <section v-if="shellState === 'auth'" class="kinetic-stack">
        <div class="liquid-pill tall">
           <div class="pill-content">
              <span class="tag">System</span>
              <h2>Entry</h2>
           </div>
        </div>
        <div class="liquid-pill">
           <div class="pill-input-group">
              <div class="dot-indicator"></div>
              <div class="mock-line"></div>
           </div>
           <div class="pill-input-group">
              <div class="dot-indicator"></div>
              <div class="mock-line"></div>
           </div>
           <div class="pill-submit">Connect</div>
        </div>
      </section>

      <!-- State: Gated -->
      <section v-else-if="shellState === 'gated'" class="kinetic-stack">
        <div class="liquid-pill tall accent-bg">
           <div class="pill-content">
              <span class="tag">Security</span>
              <h2>Boundaries</h2>
           </div>
        </div>
        <div class="liquid-pill">
           <p class="pill-p">This build is private. Access implies consent to all terms of the rebuild phase.</p>
           <div class="pill-btn-rect">Acknowledge</div>
        </div>
      </section>

      <!-- State: Signed In -->
      <section v-else-if="shellState === 'signedin'" class="kinetic-stack">
        <div class="kinetic-nav">
           <div class="nav-blob active">Feed</div>
           <div class="nav-blob">Explore</div>
        </div>
        
        <div class="liquid-pill content-blob">
           <div class="blob-header">
              <div class="avatar"></div>
              <div class="name-box"></div>
           </div>
           <div class="blob-body">
              <div class="l l1"></div>
              <div class="l l2"></div>
           </div>
        </div>

        <div class="liquid-pill content-blob">
           <div class="blob-body">
              <div class="l l3"></div>
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
/* Concept 10: KINETIC SCROLL
   - Extreme Rounding (Pill shapes)
   - Vertical Focus, no sidebars
   - Palette: Cloudy Temple (Solid)
   - Style: Liquid glass feel
*/

.kinetic-shell {
  height: 100%;
  width: 100%;
  background: #3c6da7; /* Muted Blue Base */
  color: #fff;
  font-family: "Ubuntu Variable", sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
}

.kinetic-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #1c2729; /* Dark Slate solid overlay */
  opacity: 0.9;
}

.kinetic-logo-area {
  padding: 40px 30px 20px 30px;
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
  font-size: 1rem;
  opacity: 0.5;
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #d7d4f1;
}

.kinetic-viewport {
  flex: 1;
  padding: 0 20px 40px 20px;
  overflow-y: auto;
  position: relative;
  z-index: 10;
}

.kinetic-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: glide-up 1s cubic-bezier(0.19, 1, 0.22, 1);
}

@keyframes glide-up {
  from { opacity: 0; transform: translateY(60px); }
  to { opacity: 1; transform: translateY(0); }
}

.liquid-pill {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  border-radius: 40px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 30px;
}

.liquid-pill.tall {
  min-height: 240px;
  display: flex;
  align-items: flex-end;
}

.liquid-pill.accent-bg {
  background: rgba(103, 104, 171, 0.1);
  border: 1px solid rgba(103, 104, 171, 0.2);
}

.tag {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6768ab;
  display: block;
  margin-bottom: 8px;
}

.pill-content h2 {
  font-family: "Erode", serif;
  font-size: 3.5rem;
  margin: 0;
  font-weight: 300;
  line-height: 0.9;
}

.pill-input-group {
  margin-bottom: 24px;
}

.mock-line {
  height: 2px;
  background: rgba(215, 212, 241, 0.2);
  margin-top: 12px;
}

.pill-submit {
  height: 64px;
  background: #fff;
  color: #1c2729;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.pill-p {
  line-height: 1.5;
  opacity: 0.7;
  margin-bottom: 24px;
}

.pill-btn-rect {
  padding: 18px;
  border: 1px solid #fff;
  border-radius: 20px;
  text-align: center;
}

.kinetic-nav {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.nav-blob {
  padding: 12px 24px;
  background: rgba(255,255,255,0.05);
  border-radius: 30px;
  opacity: 0.5;
}

.nav-blob.active {
  background: #6768ab;
  opacity: 1;
}

.content-blob {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.blob-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: #9d90be;
}

.name-box {
  width: 100px;
  height: 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
}

.blob-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.l {
  height: 60px;
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
}
.l1 { width: 100%; }
.l2 { width: 70%; }
.l3 { height: 120px; }
</style>
