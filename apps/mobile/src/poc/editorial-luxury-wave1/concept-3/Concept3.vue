<template>
  <div class="velvet-shell">
    <header class="velvet-header">
      <div class="velvet-connection" v-if="shellState === 'signedin'">
        <div class="conn-dot"></div>
      </div>
      <h1 class="velvet-wordmark">The Penthouse</h1>
    </header>

    <main class="velvet-content">
      <!-- 1. Auth State -->
      <section v-if="shellState === 'auth'" class="velvet-state">
        <div class="velvet-card">
          <h2>Private Access</h2>
          <div class="mock-form">
            <div class="mock-input"></div>
            <div class="mock-input"></div>
            <div class="mock-btn">Authenticate</div>
          </div>
        </div>
      </section>

      <!-- 2. Gated State (Test Notice / Session Sync) -->
      <section v-else-if="shellState === 'gated'" class="velvet-state">
        <div class="velvet-card highlight">
          <h2>Internal Ops</h2>
          <p>Please accept the testing boundaries.</p>
          <div class="mock-btn outline">Accept</div>
        </div>
      </section>

      <!-- 3. Signed In State -->
      <section v-else-if="shellState === 'signedin'" class="velvet-state velvet-app">
        <nav class="velvet-nav">
          <div class="nav-pill active">Chats</div>
          <div class="nav-pill">Directory</div>
          <div class="nav-pill utility-font">Settings</div>
        </nav>

        <div class="velvet-panels">
          <div class="velvet-list">
             <div class="mock-contact active-contact"></div>
             <div class="mock-contact"></div>
             <div class="mock-contact"></div>
          </div>
          <div class="velvet-main">
             <div class="mock-thread"></div>
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
/* Concept 3: Velvet Private Club. Deeper blacks, ink-violet surfaces, richer contrast, intimate lighting. */

.velvet-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #020205; /* Deep black */
  background: radial-gradient(circle at 50% 0%, #170d2b 0%, #020205 80%);
  color: #e5e0f5;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
  box-shadow: inset 0 0 100px rgba(0,0,0,0.8);
}

.velvet-header {
  padding: max(24px, env(safe-area-inset-top)) 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-bottom: 1px solid rgba(138, 92, 255, 0.1);
  background: rgba(2, 2, 5, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.velvet-wordmark {
  font-family: "Erode", serif;
  font-size: 1.6rem;
  font-weight: 300;
  margin: 0;
  color: #fff;
  text-shadow: 0 4px 12px rgba(138, 92, 255, 0.5);
}

.velvet-connection {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8cd8ff;
  border: 2px solid rgba(138, 92, 255, 0.5);
  box-shadow: 0 0 10px #8cd8ff;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.velvet-content {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.velvet-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: fade-scale 0.5s ease-out;
}

@keyframes fade-scale {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.velvet-card {
  margin: auto;
  width: 100%;
  max-width: 380px;
  background: linear-gradient(145deg, rgba(30, 20, 50, 0.6), rgba(10, 5, 20, 0.8));
  border: 1px solid rgba(138, 92, 255, 0.15);
  padding: 40px 32px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.velvet-card.highlight {
  border-color: rgba(140, 216, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 40px rgba(140, 216, 255, 0.05);
}

.velvet-card h2 {
  font-family: "Erode", serif;
  font-size: 2rem;
  font-weight: 300;
  margin: 0;
  color: #fff;
}

.velvet-card p {
  color: rgba(229, 224, 245, 0.6);
  line-height: 1.5;
  margin: 0;
}

.mock-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.mock-input {
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(138, 92, 255, 0.2);
}

.mock-btn {
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(180deg, #3d2a70, #221445);
  border: 1px solid #483480;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.mock-btn.outline {
  background: transparent;
  border-color: rgba(140, 216, 255, 0.4);
  color: #8cd8ff;
}

.velvet-app {
  justify-content: flex-start;
}

.velvet-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.nav-pill {
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.nav-pill.active {
  background: rgba(138, 92, 255, 0.15);
  border-color: rgba(138, 92, 255, 0.3);
  color: #fff;
}

.velvet-panels {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.velvet-list {
  width: 35%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-contact {
  height: 56px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
}

.mock-contact.active-contact {
  background: rgba(138, 92, 255, 0.1);
  border: 1px solid rgba(138, 92, 255, 0.2);
}

.velvet-main {
  flex: 1;
  background: rgba(0,0,0,0.4);
  border-radius: 16px;
  border: 1px solid rgba(138, 92, 255, 0.08);
  padding: 16px;
}

.mock-thread {
  height: 100%;
  border-radius: 8px;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px);
}
</style>
