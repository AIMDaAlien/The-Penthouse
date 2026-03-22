<template>
  <div class="magazine-shell">
    <div class="magazine-grid">
      <!-- Pillar: Vertical Logo on the left -->
      <aside class="magazine-pillar">
        <div class="magazine-logo">
          <span class="logo-the">The</span>
          <span class="logo-pent">PENT</span>
          <span class="logo-house">HOUSE</span>
        </div>
      </aside>

      <!-- Main Interface Area -->
      <main class="magazine-main">
        <!-- State: Auth -->
        <section v-if="shellState === 'auth'" class="magazine-state auth-layout">
          <div class="header-group">
            <h2 class="sub-headline">Edition One</h2>
            <h3 class="headline">Member Portal</h3>
          </div>
          
          <div class="auth-module">
            <div class="magazine-input-group">
               <label class="utility-font">Identity</label>
               <div class="mag-input"></div>
            </div>
            <div class="magazine-input-group">
               <label class="utility-font">Secret</label>
               <div class="mag-input"></div>
            </div>
            <div class="mag-btn">Authenticate</div>
          </div>
        </section>

        <!-- State: Gated -->
        <section v-else-if="shellState === 'gated'" class="magazine-state gated-layout">
          <div class="gated-module">
            <span class="utility-font label">Briefing</span>
            <h2 class="mag-title">Testing <br> Protocols</h2>
            <p class="mag-p">This interface is restricted to active rebuild contributors. Review the guidelines to continue.</p>
            <div class="mag-btn solid">Enter</div>
          </div>
        </section>

        <!-- State: Signed In -->
        <section v-else-if="shellState === 'signedin'" class="magazine-state app-layout">
          <header class="app-header">
             <nav class="mag-nav">
                <span class="active">Live Feed</span>
                <span>Directory</span>
                <span class="utility-font">Menu</span>
             </nav>
          </header>
          
          <div class="app-content">
             <div class="mag-card">
                <div class="mag-card-img"></div>
                <div class="mag-card-copy">
                   <div class="line"></div>
                   <div class="line w-long"></div>
                </div>
             </div>
             <div class="mag-card">
                <div class="mag-card-img small"></div>
                <div class="mag-card-copy">
                   <div class="line"></div>
                   <div class="line w-medium"></div>
                </div>
             </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  shellState: 'auth' | 'gated' | 'signedin'
}>();
</script>

<style scoped>
/* Concept 8: THE MAGAZINE GRID
   - Vertical Logo, Left Aligned
   - Palette: Cloudy Temple (Solid colors only)
   - Style: Heavy Glassmorphism, 32px Rounding
   - Font: Ubuntu Variable
*/

.magazine-shell {
  height: 100%;
  width: 100%;
  background: #9d90be; /* Muted Purple base */
  color: #fff;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
  position: relative;
}

.magazine-shell::before {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: #1c2729; /* Dark Slate solid overlay */
  opacity: 0.95;
}

.magazine-grid {
  display: flex;
  height: 100%;
  position: relative;
  z-index: 10;
}

.magazine-pillar {
  width: 120px;
  background: #1c2729;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  padding: 40px 20px;
}

.magazine-logo {
  display: flex;
  flex-direction: column;
  line-height: 0.8;
}

.logo-the {
  font-family: "Erode", serif;
  font-size: 1.1rem;
  margin-bottom: 6px;
  opacity: 0.5;
}

.logo-pent, .logo-house {
  font-family: "Erode", serif;
  font-size: 2.4rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #d7d4f1;
}

.magazine-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
}

.magazine-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: fade-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.sub-headline {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #6768ab;
  margin-bottom: 8px;
}

.headline {
  font-family: "Erode", serif;
  font-size: 3rem;
  font-weight: 300;
  margin: 0 0 40px 0;
  line-height: 1;
}

.auth-module {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 40px;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 48px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.magazine-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.utility-font {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  opacity: 0.6;
}

.mag-input {
  height: 2px;
  background: rgba(215, 212, 241, 0.3);
  margin-top: 12px;
}

.mag-btn {
  padding: 20px 32px;
  background: transparent;
  border: 1px solid #d7d4f1;
  border-radius: 40px;
  color: #d7d4f1;
  text-align: center;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 16px;
}

.mag-btn.solid {
  background: #d7d4f1;
  color: #1c2729;
}

.gated-module {
  margin: auto 0;
}

.mag-title {
  font-family: "Erode", serif;
  font-size: 4rem;
  font-weight: 300;
  line-height: 0.9;
  margin: 16px 0 24px 0;
}

.mag-p {
  max-width: 320px;
  line-height: 1.6;
  color: rgba(255,255,255,0.6);
  margin-bottom: 32px;
}

/* App Layout */
.app-header {
  margin-bottom: 40px;
}

.mag-nav {
  display: flex;
  gap: 40px;
  font-size: 1.2rem;
}

.mag-nav span {
  opacity: 0.4;
}

.mag-nav span.active {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 8px;
  text-decoration-thickness: 2px;
  text-decoration-color: #6768ab;
}

.app-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.mag-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 32px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.mag-card-img {
  height: 200px;
  background: #3c6da7;
}

.mag-card-img.small {
  height: 120px;
  background: #6768ab;
}

.mag-card-copy {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.w-long { width: 90%; }
.w-medium { width: 60%; }
</style>
