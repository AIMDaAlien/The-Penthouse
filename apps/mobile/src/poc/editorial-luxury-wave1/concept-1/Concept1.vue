<template>
  <div class="skyline-shell">
    <!-- Header: Dominant wordmark, magazine feel -->
    <header class="skyline-header">
      <h1 class="skyline-wordmark">The Penthouse</h1>
      <div class="skyline-connection" v-if="shellState === 'signedin'">
        <div class="conn-dot"></div>
        <span class="conn-text">Connected</span>
      </div>
    </header>

    <main class="skyline-content">
      <!-- 1. Auth State -->
      <section v-if="shellState === 'auth'" class="skyline-state skyline-auth">
        <div class="skyline-card">
          <h2>Welcome</h2>
          <p>Sign in to your private editorial space.</p>
          <div class="mock-form">
            <div class="mock-input"></div>
            <div class="mock-input"></div>
            <div class="mock-btn">Enter</div>
          </div>
        </div>
      </section>

      <!-- 2. Gated State (Test Notice / Session Sync) -->
      <section v-else-if="shellState === 'gated'" class="skyline-state skyline-gated">
        <div class="skyline-card">
          <p class="eyebrow">Internal-only build</p>
          <h2>Pre-release Notice</h2>
          <p>Please acknowledge the testing agreement to proceed into the application.</p>
          <div class="mock-btn outline">Acknowledge</div>
        </div>
      </section>

      <!-- 3. Signed In State -->
      <section v-else-if="shellState === 'signedin'" class="skyline-state skyline-app">
        <nav class="skyline-tabs">
          <button class="active">Chats</button>
          <button>Directory</button>
          <button class="utility-font">Settings</button>
        </nav>
        
        <div class="skyline-viewport">
          <div class="mock-chat-list">
            <div class="mock-chat-item">
              <div class="mock-avatar"></div>
              <div class="mock-chat-lines">
                <div class="line w-short"></div>
                <div class="line w-long"></div>
              </div>
            </div>
            <div class="mock-chat-item">
              <div class="mock-avatar"></div>
              <div class="mock-chat-lines">
                <div class="line w-medium"></div>
                <div class="line w-long"></div>
              </div>
            </div>
          </div>
          <div class="mock-chat-main">
            <div class="mock-bubbles">
              <div class="bubble left"></div>
              <div class="bubble right"></div>
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
/* Typography requirements */
/* Erode for wordmark, JetBrains for utility, Ubuntu for rest */

.skyline-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg, #0f1222); /* Fallback */
  background: linear-gradient(180deg, #161A36 0%, #0B0D18 100%);
  color: #fff;
  font-family: "Ubuntu Variable", "Ubuntu", sans-serif;
  overflow: hidden;
  position: relative;
}

/* Very-Peri accent glow behind everything */
.skyline-shell::before {
  content: '';
  position: absolute;
  top: -20vh;
  left: 50%;
  transform: translateX(-50%);
  width: 150vw;
  height: 60vh;
  background: radial-gradient(ellipse at bottom, rgba(140, 216, 255, 0.15), transparent 70%);
  z-index: 0;
  pointer-events: none;
}

.skyline-header {
  position: relative;
  z-index: 10;
  padding: max(16px, env(safe-area-inset-top)) 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.skyline-wordmark {
  font-family: "Erode", serif;
  font-size: 2.5rem;
  font-weight: 300;
  letter-spacing: -0.02em;
  margin: 0;
  background: linear-gradient(to right, #fff, rgba(255,255,255,0.7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
}

.skyline-connection {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
}

.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9af0b9;
  box-shadow: 0 0 8px #9af0b9;
}

.conn-text {
  font-family: inherit;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.6);
}

.skyline-content {
  flex: 1;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 0 24px 24px;
}

.skyline-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.skyline-card {
  background: rgba(23, 27, 50, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(140, 216, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skyline-card h2 {
  font-family: "Erode", serif;
  font-size: 2rem;
  font-weight: 300;
  margin: 0;
}

.skyline-card p {
  color: rgba(255,255,255,0.6);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.eyebrow {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem !important;
  text-transform: uppercase;
  color: #8cd8ff !important;
  letter-spacing: 0.05em;
  margin-bottom: -8px !important;
}

.mock-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-input {
  height: 48px;
  border-radius: 12px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
}

.mock-btn {
  height: 48px;
  border-radius: 12px;
  background: #8cd8ff;
  color: #0B0D18;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-top: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.mock-btn:active {
  transform: scale(0.98);
}

.mock-btn.outline {
  background: transparent;
  color: #8cd8ff;
  border: 1px solid #8cd8ff;
}

/* App State */
.skyline-app {
  justify-content: flex-start;
}

.skyline-tabs {
  display: flex;
  gap: 32px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.skyline-tabs button {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-family: inherit;
  font-size: 1rem;
  padding: 0 0 12px 0;
  position: relative;
  cursor: pointer;
  transition: color 0.3s;
}

.skyline-tabs button.active {
  color: #fff;
}

.skyline-tabs button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #8cd8ff;
  box-shadow: 0 0 8px #8cd8ff;
}

.utility-font {
  font-family: "JetBrains Mono", monospace !important;
  font-size: 0.85rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.skyline-viewport {
  flex: 1;
  display: flex;
  gap: 24px;
  min-height: 0;
}

.mock-chat-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 30%;
  min-width: 80px;
}

.mock-chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0.6;
}

.mock-chat-item:first-child {
  opacity: 1;
}

.mock-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
}

.mock-chat-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.line {
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
}

.w-short { width: 40%; }
.w-medium { width: 60%; }
.w-long { width: 90%; }

.mock-chat-main {
  flex: 1;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.mock-bubbles {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble {
  height: 36px;
  border-radius: 18px;
  background: rgba(255,255,255,0.05);
}

.bubble.left {
  width: 60%;
  border-bottom-left-radius: 4px;
}

.bubble.right {
  width: 40%;
  background: rgba(140, 216, 255, 0.1);
  border: 1px solid rgba(140, 216, 255, 0.2);
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}
</style>
