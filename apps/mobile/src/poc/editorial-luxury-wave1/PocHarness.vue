<template>
  <div class="poc-harness">
    <div class="poc-controls">
      <div class="control-group">
        <label>Concept:</label>
        <select v-model="activeConcept">
          <option value="1">1. Rose Pillar (Wave 4)</option>
          <option value="2">2. Soft Iris (Wave 4)</option>
          <option value="3">3. Pine Magazine (Wave 4)</option>
          <option value="4">4. Kinetic Gold (Wave 4)</option>
          <option value="5">5. Sunset Editorial (Wave 4)</option>
        </select>
      </div>
      <div class="control-group">
        <label>State:</label>
        <select v-model="activeState">
          <option value="auth">Auth Shell</option>
          <option value="gated">Gated Card</option>
          <option value="signedin">Signed-in Shell</option>
        </select>
      </div>
    </div>
    
    <div class="poc-viewport">
      <Concept1 v-if="activeConcept === '1'" :shellState="activeState" />
      <Concept2 v-else-if="activeConcept === '2'" :shellState="activeState" />
      <Concept3 v-else-if="activeConcept === '3'" :shellState="activeState" />
      <Concept4 v-else-if="activeConcept === '4'" :shellState="activeState" />
      <Concept5 v-else-if="activeConcept === '5'" :shellState="activeState" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Concept1 from './concept-1/Concept1.vue';
import Concept2 from './concept-2/Concept2.vue';
import Concept3 from './concept-3/Concept3.vue';
import Concept4 from './concept-4/Concept4.vue';
import Concept5 from './concept-5/Concept5.vue';

import '../../assets/fonts/Erode/css/erode.css';

const activeConcept = ref('1');
const activeState = ref<'auth'|'gated'|'signedin'>('auth');

</script>

<style>
/* POC Harness specific styles (doesn't bleed into concepts if encapsulated, but this wraps them) */
.poc-harness {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #000;
}
.poc-controls {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: #222;
  color: #fff;
  border-bottom: 1px solid #444;
  font-family: sans-serif;
  z-index: 9999;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.control-group select {
  background: #333;
  color: white;
  border: 1px solid #555;
  padding: 4px 8px;
  border-radius: 4px;
}
.poc-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
}
/* By default, simulating a mobile viewport in desktop, or full screen if mobile */
.poc-viewport > * {
  width: 100%;
  height: 100%;
  max-width: 480px; /* Mobile constraints for testing */
  border-left: 1px solid #333;
  border-right: 1px solid #333;
  position: relative;
  background-color: var(--bg); /* Will be overridden by concepts */
}
</style>
