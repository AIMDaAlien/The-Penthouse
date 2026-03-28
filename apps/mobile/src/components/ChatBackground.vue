<template>
  <div class="chat-background" :class="`theme-${theme}`"></div>
</template>

<script setup lang="ts">
type ChatTheme =
  | 'topographic-silk'
  | 'frosted-ribbed'
  | 'soft-plaster'
  | 'geometric-hex'
  | 'liquid-light'
  | 'brushed-metal'
  | 'ambient-mesh';

withDefaults(defineProps<{
  theme?: ChatTheme;
}>(), {
  theme: 'topographic-silk'
});
</script>

<style scoped>
.chat-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: var(--bg-base);
}

/* 1. Frosted Ribbed Glass */
.chat-background.theme-frosted-ribbed {
  background-color: var(--bg-base);
}
.chat-background.theme-frosted-ribbed::after {
  content: ''; position: absolute; inset: -10%;
  background-image: repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(255,255,255,0.015) 15px, rgba(255,255,255,0.015) 30px);
  animation: slideGlow 30s linear infinite;
  transform: rotate(15deg);
}

/* 2. Topographic Silk */
.chat-background.theme-topographic-silk {
  background-color: var(--bg-base);
  overflow: hidden;
}
.chat-background.theme-topographic-silk::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: -200px; /* buffer for scrolling */
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='200' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q 50 40, 100 20 T 200 20' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1.5'/%3E%3Cpath d='M0 10 Q 50 30, 100 10 T 200 10' fill='none' stroke='rgba(255,255,255,0.015)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 200px 40px;
  transform: translate3d(0, 0, 0);
  will-change: transform;
  animation: waveScroll 10s linear infinite;
}

/* 3. Soft Plaster Noise */
.chat-background.theme-soft-plaster {
  background-color: var(--bg-base);
  animation: plasterPulse 10s alternate infinite ease-in-out;
}
.chat-background.theme-soft-plaster::before {
  content: ''; position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
}

/* 4. Geometric Hex Drift */
.chat-background.theme-geometric-hex {
  background-color: var(--bg-base);
  overflow: hidden;
}
.chat-background.theme-geometric-hex::before {
  content: ''; position: absolute; inset: -100px;
  background-image: url("data:image/svg+xml,%3Csvg width='40' height='69.282' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 17.32l-20 11.547L0 17.32V-5.774l20-11.547L40-5.774V17.32zm0 46.188l-20 11.548-20-11.548V40.414L20 28.867l20 11.547v23.094z' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1'/%3E%3C/svg%3E");
  transform: translate3d(0, 0, 0);
  will-change: transform;
  animation: hexDrift 40s linear infinite;
}

/* 5. Liquid Light Leaks */
.chat-background.theme-liquid-light {
  background-color: var(--bg-base);
  overflow: hidden;
}
.chat-background.theme-liquid-light::before, .chat-background.theme-liquid-light::after {
  content: ''; position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4;
}
.chat-background.theme-liquid-light::before {
  width: 300px; height: 300px; background: rgba(129, 140, 248, 0.3); top: -100px; left: -100px;
  animation: floatOrb 20s ease-in-out infinite alternate;
}
.chat-background.theme-liquid-light::after {
  width: 400px; height: 400px; background: #3B4063; bottom: -150px; right: -150px;
  animation: floatOrb 25s ease-in-out infinite alternate-reverse;
}

/* 6. Brushed Metal Grain */
.chat-background.theme-brushed-metal {
  background-color: var(--bg-base);
}
.chat-background.theme-brushed-metal::before {
  content: ''; position: absolute; inset: -10%;
  background-image: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px);
  animation: staticNoise 0.8s steps(5) infinite;
}

/* 7. Ambient Mesh Canvas */
.chat-background.theme-ambient-mesh {
  background-color: var(--bg-base);
  background: radial-gradient(circle at 0% 0%, #3B4063 0%, transparent 60%),
              radial-gradient(circle at 100% 100%, #303358 0%, transparent 60%),
              radial-gradient(circle at 50% 50%, var(--bg-base) 0%, transparent 100%);
  background-size: 150% 150%;
  animation: meshPan 30s ease-in-out infinite alternate;
}

/* Keyframes */
@keyframes slideGlow { 0% { transform: rotate(15deg) translate3d(0,0,0); } 100% { transform: rotate(15deg) translate3d(60px,0,0); } }
@keyframes waveScroll { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-200px, 0, 0); } }
@keyframes plasterPulse { from { opacity: 1; transform: translate3d(0,0,0); } to { opacity: 0.85; transform: translate3d(0,0,0); } }
@keyframes hexDrift { from { transform: translate3d(0,0,0); } to { transform: translate3d(-40px, -69.282px, 0); } }
@keyframes floatOrb { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(100px, 50px, 0); } }
@keyframes staticNoise { 0% { transform: translateX(0px); } 50% { transform: translateX(4px); } 100% { transform: translateX(0px); } }
@keyframes meshPan { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
</style>
