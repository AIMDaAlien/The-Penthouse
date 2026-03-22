<template>
  <div class="poc-harness">
    <div class="poc-controls">
      <div class="control-group">
        <label>Concept:</label>
        <select v-model="activeConcept">
          <option value="1">1. Skyline Editorial</option>
          <option value="2">2. Gallery Residence</option>
          <option value="3">3. Velvet Private Club</option>
          <option value="4">4. Prism Penthouse</option>
          <option value="5">5. Soft Couture</option>
          <option value="6">6. The Monolith (Wave 2)</option>
          <option value="7">7. Floating Plates (Wave 2)</option>
          <option value="8">8. The Magazine Grid (Wave 2)</option>
          <option value="9">9. The Vertical Pillar (Wave 3)</option>
          <option value="10">10. Kinetic Scroll (Wave 3)</option>
          <option value="11">11. Oversized Typography (Wave 3)</option>
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
      <Concept6 v-else-if="activeConcept === '6'" :shellState="activeState" />
      <Concept7 v-else-if="activeConcept === '7'" :shellState="activeState" />
      <Concept8 v-else-if="activeConcept === '8'" :shellState="activeState" />
      <Concept9 v-else-if="activeConcept === '9'" :shellState="activeState" />
      <Concept10 v-else-if="activeConcept === '10'" :shellState="activeState" />
      <Concept11 v-else-if="activeConcept === '11'" :shellState="activeState" />
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
import Concept6 from './concept-6/Concept6.vue';
import Concept7 from './concept-7/Concept7.vue';
import Concept8 from './concept-8/Concept8.vue';
import Concept9 from './concept-9/Concept9.vue';
import Concept10 from './concept-10/Concept10.vue';
import Concept11 from './concept-11/Concept11.vue';

import '../../assets/fonts/Erode/css/erode.css';

const activeConcept = ref('9');
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
