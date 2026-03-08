<template>
  <div class="member-directory-page">
    <h2>Directory</h2>
    
    <div v-if="loading" class="small">Loading members...</div>
    <div v-else-if="error" class="status-danger small">{{ error }}</div>
    
    <div v-else class="list">
      <div 
        v-for="member in members" 
        :key="member.id" 
        class="member-card card"
        @click="$emit('select-member', member.id)"
      >
        <div class="avatar-placeholder">
          {{ member.displayName ? member.displayName[0].toUpperCase() : '?' }}
        </div>
        <div class="member-info">
          <div class="display-name">{{ member.displayName || member.username }}</div>
          <div class="username small">@{{ member.username }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMembers } from '../services/http';
import type { MemberSummary } from '@penthouse/contracts';

defineEmits<{
  (e: 'select-member', id: string): void;
}>();

const members = ref<MemberSummary[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    members.value = await getMembers();
  } catch (err: any) {
    error.value = 'Failed to load directory';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.member-directory-page {
  padding: 16px;
  overflow-y: auto;
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 24px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 0.1s;
}

.member-card:active {
  transform: scale(0.98);
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #041027;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.display-name {
  font-weight: 600;
  font-size: 1.05rem;
}

.username {
  opacity: 0.6;
}
</style>
