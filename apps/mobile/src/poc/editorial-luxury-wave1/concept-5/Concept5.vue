<template>
  <div class="couture-shell">
    <header class="couture-header">
      <div class="couture-header-inner">
        <h1 class="couture-wordmark">The Penthouse</h1>
        <div class="couture-connection" v-if="shellState === 'signedin'">
          <div class="conn-dot"></div>
          <span class="utility-font">Live</span>
        </div>
      </div>
    </header>

    <main class="couture-content">
      <!-- 1. Auth State -->
      <section v-if="shellState === 'auth'" class="couture-state">
        <div class="couture-card">
          <div class="couture-card-header">
            <h2>Sign In</h2>
          </div>
          <div class="mock-form">
            <div class="mock-input"></div>
            <div class="mock-input"></div>
            <div class="mock-btn">Continue</div>
          </div>
        </div>
      </section>

      <!-- 2. Gated State (Test Notice / Session Sync) -->
      <section v-else-if="shellState === 'gated'" class="couture-state">
        <div class="couture-card">
          <div class="couture-card-header">
            <p class="utility-font" style="opacity:0.6; margin-bottom: 8px;">Restricted</p>
            <h2>Testing Phase</h2>
          </div>
          <p class="couture-p">Review the prerequisites below to proceed into the application interface.</p>
          <div class="mock-btn outline">Accept</div>
        </div>
      </section>

      <!-- 3. Signed In State -->
      <section v-else-if="shellState === 'signedin'" class="couture-state couture-app">
        <nav class="couture-nav">
          <div class="couture-tab active">Chats</div>
          <div class="couture-tab">Directory</div>
          <div class="couture-tab utility-font">Settings</div>
        </nav>
        
        <div class="couture-viewport">
          <div class="couture-mock-module"></div>
          <div class="couture-mock-module primary"></div>
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
/* Concept 5: Soft Couture. Asymmetry, softer framing, tactile elegance, premium but warmer/human. */

.couture-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #12131C;
  background: radial-gradient(circle at 70% 20%, #1e2030 0%, #0d0f16 100%);
  color: #f0edf5;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
}

.couture-header {
  padding: max(24px, env(safe-area-inset-top)) 24px 0;
}

.couture-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24px;
}

.couture-wordmark {
  font-family: "Erode", serif;
  font-size: 2.2rem;
  font-weight: 300;
  margin: 0;
  color: #fff;
  font-style: italic; /* Soft couture touch */
}

.couture-connection {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.06);
  padding: 6px 14px;
  border-radius: 30px; /* Soft rounding */
}

.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8cd8ff;
  box-shadow: 0 0 12px #8cd8ff;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.couture-content {
  flex: 1;
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
}

.couture-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: float-up 0.7s cubic-bezier(0.33, 1, 0.68, 1);
}

@keyframes float-up {
  from { opacity: 0; transform: translateY(20px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

.couture-card {
  margin: auto;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0; /* padding applied to inner elements for asymmetrical look */
  border-radius: 32px;
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  overflow: hidden;
}

.couture-card-header {
  padding: 40px 40px 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent);
}

.couture-card h2 {
  font-family: "Erode", serif;
  font-size: 2.2rem;
  font-weight: 300;
  margin: 0;
}

.couture-p {
  padding: 0 40px;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
}

.mock-form {
  padding: 0 40px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-input {
  height: 54px;
  border-radius: 27px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
}

.mock-btn {
  height: 54px;
  border-radius: 27px;
  background: #f0edf5;
  color: #12131C;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-top: 16px;
  font-size: 1.05rem;
}

.mock-btn.outline {
  background: transparent;
  color: #f0edf5;
  border: 1px solid #f0edf5;
  margin: 0 40px 40px;
}

.couture-app {
  justify-content: flex-start;
}

.couture-nav {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px; /* For scrollbar */
}

.couture-tab {
  padding: 12px 24px;
  background: rgba(255,255,255,0.02);
  border-radius: 24px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
}

.couture-tab.active {
  background: #f0edf5;
  color: #12131C;
}

.couture-viewport {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.couture-mock-module {
  width: 30%;
  background: rgba(255,255,255,0.02);
  border-radius: 32px;
}

.couture-mock-module.primary {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border-radius: 32px;
}
</style>
