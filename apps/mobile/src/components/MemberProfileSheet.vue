<template>
  <div class="sheet-overlay" @click.self="$emit('close')">
    <div class="sheet-content card">
      <button class="close-btn" @click="$emit('close')">&times;</button>
      
      <div v-if="loading" class="small">Loading profile...</div>
      <div v-else-if="error" class="status-danger small">{{ error }}</div>
      
      <div v-else-if="member" class="profile-details">
        <img v-if="member.avatarUrl" class="avatar-image" :src="member.avatarUrl" :alt="`${member.displayName} avatar`" />
        <div v-else class="avatar-large">
          {{ member.displayName ? member.displayName[0].toUpperCase() : '?' }}
        </div>
        <h2 class="display-name">{{ member.displayName || member.username }}</h2>
        <div class="username small">@{{ member.username }}</div>
        <div class="presence-pill" :class="presenceStatus">{{ presenceText }}</div>
        
        <div class="bio-section" v-if="member.bio">
          <h4>Bio</h4>
          <p>{{ member.bio }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { getMember } from '../services/http';
import type { MemberDetail } from '@penthouse/contracts';
import type { PresenceStatus } from '../types';

const props = defineProps<{
  memberId: string;
  presenceByUserId?: Record<string, PresenceStatus>;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const member = ref<MemberDetail | null>(null);
const loading = ref(true);
const error = ref('');

async function loadProfile() {
  loading.value = true;
  error.value = '';
  try {
    member.value = await getMember(props.memberId);
  } catch (err: any) {
    error.value = 'Failed to load member profile';
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);
watch(() => props.memberId, loadProfile);

const presenceStatus = computed<PresenceStatus>(() => props.presenceByUserId?.[props.memberId] ?? 'offline');
const presenceText = computed(() => (presenceStatus.value === 'online' ? 'Online now' : 'Offline'));
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 16, 39, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 20px 20px 0 0;
  padding: 32px 24px;
  position: relative;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: none;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 24px;
  cursor: pointer;
  opacity: 0.6;
  width: auto;
  min-width: 0;
}

.profile-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent);
  color: #041027;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.avatar-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 16px;
}

.display-name {
  margin: 0 0 4px 0;
}

.username {
  opacity: 0.6;
  margin-bottom: 12px;
}

.presence-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 24px;
}

.presence-pill.online {
  background: rgba(126, 241, 168, 0.14);
  color: var(--ok);
}

.presence-pill.offline {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
}

.bio-section {
  width: 100%;
  text-align: left;
  background: rgba(15, 18, 34, 0.4);
  padding: 16px;
  border-radius: 12px;
}

.bio-section h4 {
  margin: 0 0 8px 0;
  opacity: 0.8;
}

.bio-section p {
  margin: 0;
  line-height: 1.5;
}
</style>
