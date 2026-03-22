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
        <div class="presence-badge" :class="presenceStatus ?? 'offline'">
          {{ presenceStatus === 'online' ? 'Online' : 'Offline' }}
        </div>
        
        <div class="bio-section" v-if="member.bio">
          <h4>Bio</h4>
          <p>{{ member.bio }}</p>
        </div>

        <div v-if="member.id !== currentUserId" class="profile-actions">
          <button type="button" class="form-btn profile-action-btn" @click="$emit('message', member)">
            Message
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { getMember } from '../services/http';
import type { MemberDetail } from '@penthouse/contracts';

const props = defineProps<{
  memberId: string;
  currentUserId?: string;
  presenceStatus?: import('../types').PresenceStatus;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'message', member: MemberDetail): void;
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

.profile-actions {
  width: 100%;
  margin-top: 20px;
}

.profile-action-btn {
  width: 100%;
}

.presence-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 8px;
}

.presence-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}

.presence-badge.online {
  background: rgba(154, 240, 185, 0.12);
  color: var(--ok);
}

.presence-badge.online::before {
  background: var(--ok);
}

.presence-badge.offline {
  background: rgba(164, 171, 201, 0.12);
  color: var(--muted);
}
</style>
