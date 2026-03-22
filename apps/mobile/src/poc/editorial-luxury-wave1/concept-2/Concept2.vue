<template>
  <div class="gallery-shell">
    <header class="gallery-header">
      <h1 class="gallery-wordmark">The Penthouse</h1>
      <div class="gallery-connection" v-if="shellState === 'signedin'">
        <span class="utility-font">Connected</span>
        <div class="conn-dot"></div>
      </div>
    </header>

    <main class="gallery-content">
      <!-- 1. Auth State -->
      <section v-if="shellState === 'auth'" class="gallery-state">
        <div class="gallery-card">
          <h2>Welcome</h2>
          <p>Login to your account.</p>
          <div class="mock-form">
            <div class="mock-input"></div>
            <div class="mock-input"></div>
            <div class="mock-btn">Continue</div>
          </div>
        </div>
      </section>

      <!-- 2. Gated State (Test Notice / Session Sync) -->
      <section v-else-if="shellState === 'gated'" class="gallery-state">
        <div class="gallery-card">
          <p class="utility-font accent">INTERNAL</p>
          <h2>Testing Base</h2>
          <p>Confirm the current internal build rules.</p>
          <div class="mock-btn outline">Accept</div>
        </div>
      </section>

      <!-- 3. Signed In State -->
      <section v-else-if="shellState === 'signedin'" class="gallery-state gallery-app">
        <nav class="gallery-nav">
          <button class="active">Chats</button>
          <button>Directory</button>
          <button class="utility-font">Settings</button>
        </nav>

        <div class="gallery-glass-pane">
          <div style="flex: 1; display:flex; flex-direction:column; gap:12px;">
             <!-- Chat List Mock -->
             <div class="mock-item active-mock"></div>
             <div class="mock-item"></div>
          </div>
          <div style="flex: 2; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 16px;">
             <div class="mock-content"></div>
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
/* Concept 2: Gallery Residence. Calm luxury, oversized margins, sparse chrome, museum-like restraint, large glass planes. */

.gallery-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #111424;
  color: #fff;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
}

.gallery-header {
  padding: max(40px, env(safe-area-inset-top)) 40px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.gallery-wordmark {
  font-family: "Erode", serif;
  font-size: 1.8rem;
  font-weight: 300;
  letter-spacing: 0.02em;
  margin: 0;
  color: #fff;
}

.gallery-connection {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.6;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.65rem !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.conn-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #9af0b9;
}

.gallery-content {
  flex: 1;
  padding: 0 40px 40px;
  display: flex;
  flex-direction: column;
}

.gallery-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: glide-in 0.8s cubic-bezier(0.25, 1, 0.5, 1);
}

@keyframes glide-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.gallery-card {
  margin: auto;
  width: 100%;
  max-width: 400px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  padding: 48px;
  border-radius: 0; /* sharper edges for museum gallery look */
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

.gallery-card h2 {
  font-family: "Erode", serif;
  font-size: 1.8rem;
  font-weight: 300;
  margin: 0 0 16px 0;
}

.gallery-card p {
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.accent {
  color: #8cd8ff !important;
}

.mock-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-input {
  height: 40px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.mock-btn {
  height: 48px;
  background: #fff;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  margin-top: 24px;
}

.mock-btn.outline {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}

.gallery-app {
  justify-content: flex-start;
}

.gallery-nav {
  display: flex;
  gap: 40px;
  margin-bottom: 32px;
}

.gallery-nav button {
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  font-family: inherit;
  font-size: 1rem;
  padding: 0;
  cursor: pointer;
  transition: color 0.3s;
}

.gallery-nav button.active {
  color: #fff;
}

.gallery-glass-pane {
  flex: 1;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px;
  display: flex;
  gap: 16px;
}

.mock-item {
  height: 64px;
  background: rgba(255,255,255,0.02);
}

.mock-item.active-mock {
  background: rgba(140, 216, 255, 0.05);
  border-left: 2px solid #8cd8ff;
}

.mock-content {
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.01);
}
</style>
