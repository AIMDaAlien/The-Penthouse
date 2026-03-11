<template>
  <div class="member-directory-page">
    <h2>Directory</h2>

    <input
      v-model="query"
      class="directory-search"
      type="search"
      placeholder="Search members"
      autocomplete="off"
      spellcheck="false"
    />
    
    <div v-if="loading" class="small">Loading members...</div>
    <div v-else-if="error" class="status-danger small">{{ error }}</div>
    
    <div v-else class="list">
      <div 
        v-for="member in members" 
        :key="member.id" 
        class="member-card card"
        @click="$emit('select-member', member.id)"
      >
        <img v-if="member.avatarUrl" class="avatar-image" :src="member.avatarUrl" :alt="`${member.displayName} avatar`" />
        <div v-else class="avatar-placeholder">
          {{ member.displayName ? member.displayName[0].toUpperCase() : '?' }}
        </div>
        <div class="member-info">
          <div class="identity-row">
            <div class="display-name">{{ member.displayName || member.username }}</div>
            <span class="presence-pill" :class="presenceClass(member.id)">
              {{ presenceLabel(member.id) }}
            </span>
          </div>
          <div class="username small">@{{ member.username }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { getMembers } from '../services/http';
import type { MemberSummary } from '@penthouse/contracts';
import type { PresenceStatus } from '../types';

const props = defineProps<{
  presenceByUserId?: Record<string, PresenceStatus>;
}>();

defineEmits<{
  (e: 'select-member', id: string): void;
}>();

const members = ref<MemberSummary[]>([]);
const loading = ref(true);
const error = ref('');
const query = ref('');
let queryTimer: ReturnType<typeof setTimeout> | null = null;

async function loadMembers() {
  loading.value = true;
  error.value = '';
  try {
    members.value = await getMembers(query.value);
  } catch (err: any) {
    error.value = 'Failed to load directory';
  } finally {
    loading.value = false;
  }
}

onMounted(loadMembers);

watch(query, () => {
  if (queryTimer) clearTimeout(queryTimer);
  queryTimer = setTimeout(() => {
    loadMembers().catch(() => undefined);
  }, 150);
});

onUnmounted(() => {
  if (queryTimer) clearTimeout(queryTimer);
});

function presenceStatus(memberId: string): PresenceStatus {
  return props.presenceByUserId?.[memberId] ?? 'offline';
}

function presenceLabel(memberId: string): string {
  return presenceStatus(memberId) === 'online' ? 'Online' : 'Offline';
}

function presenceClass(memberId: string): string {
  return presenceStatus(memberId);
}
</script>

<style scoped>
.member-directory-page {
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 24px;
}

.directory-search {
  margin-bottom: 16px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 0.1s;
  min-width: 0;
  overflow: hidden;
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

.avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.display-name {
  font-weight: 600;
  font-size: 1.05rem;
}

.identity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.username {
  opacity: 0.6;
}

.presence-pill {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
}

.presence-pill.online {
  background: rgba(126, 241, 168, 0.14);
  color: var(--ok);
}

.presence-pill.offline {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
}
</style>
