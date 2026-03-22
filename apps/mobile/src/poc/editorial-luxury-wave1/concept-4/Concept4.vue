<template>
  <div class="prism-shell">
    <header class="prism-header">
      <h1 class="prism-wordmark">The Penthouse</h1>
      <div class="prism-connection" v-if="shellState === 'signedin'">
        <div class="prism-status-bar">
           <div class="prism-status-fill"></div>
        </div>
      </div>
    </header>

    <main class="prism-content">
      <!-- 1. Auth State -->
      <section v-if="shellState === 'auth'" class="prism-state">
        <div class="prism-card">
          <h2>Access Gateway</h2>
          <div class="mock-form">
            <div class="mock-input"></div>
            <div class="mock-input"></div>
            <div class="mock-btn">Initialize</div>
          </div>
        </div>
      </section>

      <!-- 2. Gated State (Test Notice / Session Sync) -->
      <section v-else-if="shellState === 'gated'" class="prism-state">
        <div class="prism-card offset">
          <p class="utility-font">Diagnostics</p>
          <h2>Testing Protocol</h2>
          <div class="mock-btn outline">Confirm</div>
        </div>
      </section>

      <!-- 3. Signed In State -->
      <section v-else-if="shellState === 'signedin'" class="prism-state prism-app">
        <div class="prism-layout">
           <nav class="prism-sidebar">
             <div class="nav-facets">
               <div class="facet active">Chats</div>
               <div class="facet">Directory</div>
               <div class="facet utility-font">Settings</div>
             </div>
           </nav>
           
           <div class="prism-main-view">
             <div class="prism-glass-panel">
               <div class="mock-chat-header"></div>
               <div class="mock-chat-body"></div>
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
/* Concept 4: Prism Penthouse. Sharper geometry, faceted glass edges, reflective layering, architectural. */

.prism-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #0a0b12;
  background-image: 
    linear-gradient(45deg, rgba(140, 216, 255, 0.03) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(140, 216, 255, 0.03) 25%, transparent 25%);
  background-size: 60px 60px;
  color: #fff;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
  position: relative;
}

.prism-shell::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%);
  pointer-events: none;
}

.prism-header {
  padding: max(20px, env(safe-area-inset-top)) 32px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(10, 11, 18, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 10;
}

.prism-wordmark {
  font-family: "Erode", serif;
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #fff 40%, #8cd8ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.prism-connection {
  width: 40px;
}

.prism-status-bar {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.prism-status-fill {
  width: 100%;
  height: 100%;
  background: #8cd8ff;
  box-shadow: 0 0 8px #8cd8ff;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.prism-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.prism-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: slide-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.prism-card {
  margin: auto;
  width: 100%;
  max-width: 440px;
  background: rgba(20, 22, 40, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-top: 1px solid rgba(255,255,255,0.25);
  border-left: 1px solid rgba(255,255,255,0.15);
  padding: 48px 40px;
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  box-shadow: 20px 20px 60px rgba(0,0,0,0.5), -1px -1px 0 rgba(255,255,255,0.1);
  transform: perspective(1000px) rotateY(-2deg) rotateX(2deg);
}

.prism-card.offset {
  transform: perspective(1000px) rotateY(2deg) rotateX(2deg);
}

.prism-card h2 {
  font-family: "Erode", serif;
  font-size: 1.8rem;
  font-weight: 300;
  margin: 0 0 24px 0;
}

.mock-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-input {
  height: 48px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  border-right: 1px solid rgba(255,255,255,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.mock-btn {
  height: 48px;
  background: #8cd8ff;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-top: 16px;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%);
}

.mock-btn.outline {
  background: transparent;
  color: #8cd8ff;
  border: 1px solid #8cd8ff;
}

.prism-app {
  justify-content: flex-start;
}

.prism-layout {
  display: flex;
  flex: 1;
}

.prism-sidebar {
  width: 80px;
  border-right: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  padding: 24px 0;
}

.nav-facets {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.facet {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 0.9rem;
  color: rgba(255,255,255,0.4);
  padding: 16px 8px;
  border-left: 2px solid transparent; /* Actually on right due to rotation, acts as indicator */
}

.facet.active {
  color: #fff;
  border-color: #8cd8ff;
  background: linear-gradient(90deg, transparent, rgba(140, 216, 255, 0.1));
}

.prism-main-view {
  flex: 1;
  padding: 24px;
  display: flex;
}

.prism-glass-panel {
  flex: 1;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-top: 1px solid rgba(255,255,255,0.2);
  border-left: 1px solid rgba(255,255,255,0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
}

.mock-chat-header {
  height: 64px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.mock-chat-body {
  flex: 1;
}
</style>
