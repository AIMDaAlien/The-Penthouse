<template>
  <div class="admin-management-page">
    <div class="admin-heading">
      <div>
        <h2>User Management</h2>
        <p class="small">Manage member access and temporary password recovery from the current admin API surface.</p>
      </div>
    </div>

    <section v-if="tempPasswordResult" class="card temp-password-card list">
      <div class="temp-password-head">
        <div>
          <p class="small section-label">Temporary password issued</p>
          <strong>@{{ tempPasswordResult.username }}</strong>
        </div>
        <button type="button" class="secondary small-btn" @click="dismissTempPassword">Clear</button>
      </div>
      <code class="temp-password-value">{{ tempPasswordResult.temporaryPassword }}</code>
      <p class="small">Share it immediately. The member will be forced to change it on next login.</p>
    </section>

    <section class="card members-card list">
      <div class="members-toolbar">
        <div>
          <p class="small section-label">Members</p>
          <strong>{{ members.length }} loaded</strong>
        </div>
        <input
          v-model="query"
          class="members-search"
          type="search"
          placeholder="Search username or display name"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div v-if="loadingMembers" class="small">Loading members...</div>
      <p v-else-if="membersError" class="status-danger small">{{ membersError }}</p>

      <div v-else class="members-list">
        <article v-for="member in members" :key="member.id" class="member-admin-row">
          <div class="member-admin-copy">
            <div class="member-primary-line">
              <strong>{{ member.displayName || member.username }}</strong>
              <span class="status-chip role-chip">{{ member.role }}</span>
              <span class="status-chip" :class="statusChipClass(member.status)">{{ member.status }}</span>
              <span v-if="member.mustChangePassword" class="status-chip password-chip">password reset pending</span>
            </div>
            <p class="small member-meta-line">
              @{{ member.username }}
              <span v-if="member.displayName && member.displayName !== member.username">- {{ member.displayName }}</span>
              <span>- Joined {{ formatDateTime(member.createdAt) }}</span>
            </p>
          </div>

          <div class="member-actions">
            <button
              type="button"
              class="secondary small-btn"
              :disabled="!canManageMember(member) || actionBusyFor(member.id, 'temp')"
              @click="handleTempPassword(member)"
            >
              {{ actionBusyFor(member.id, 'temp') ? 'Issuing...' : 'Temp password' }}
            </button>
            <button
              type="button"
              class="secondary small-btn"
              :disabled="!canRemoveMember(member) || actionBusyFor(member.id, 'remove')"
              @click="handleRemove(member)"
            >
              {{ actionBusyFor(member.id, 'remove') ? 'Removing...' : 'Remove' }}
            </button>
            <button
              type="button"
              class="danger small-btn"
              :disabled="!canBanMember(member) || actionBusyFor(member.id, 'ban')"
              @click="handleBan(member)"
            >
              {{ actionBusyFor(member.id, 'ban') ? 'Banning...' : 'Ban' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { AdminMemberSummary, AdminTempPasswordResponse } from '@penthouse/contracts';
import {
  banAdminMember,
  getAdminMembers,
  issueAdminTempPassword,
  removeAdminMember
} from '../services/http';

const props = defineProps<{
  currentUserId: string;
}>();

const members = ref<AdminMemberSummary[]>([]);
const loadingMembers = ref(true);
const membersError = ref('');
const query = ref('');
const tempPasswordResult = ref<AdminTempPasswordResponse | null>(null);
const actionState = ref<Record<string, 'remove' | 'ban' | 'temp' | null>>({});
let queryTimer: ReturnType<typeof setTimeout> | null = null;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function canManageMember(member: AdminMemberSummary): boolean {
  return member.id !== props.currentUserId && member.role !== 'admin';
}

function canRemoveMember(member: AdminMemberSummary): boolean {
  return canManageMember(member) && member.status === 'active';
}

function canBanMember(member: AdminMemberSummary): boolean {
  return canManageMember(member) && member.status === 'active';
}

function actionBusyFor(memberId: string, action: 'remove' | 'ban' | 'temp'): boolean {
  return actionState.value[memberId] === action;
}

function statusChipClass(status: AdminMemberSummary['status']): string {
  return `status-${status}`;
}

async function loadMembers(): Promise<void> {
  loadingMembers.value = true;
  membersError.value = '';
  try {
    members.value = await getAdminMembers(query.value);
  } catch (error: any) {
    membersError.value = error?.response?.data?.error || 'Failed to load members';
  } finally {
    loadingMembers.value = false;
  }
}

async function handleTempPassword(member: AdminMemberSummary): Promise<void> {
  if (!window.confirm(`Issue a temporary password for @${member.username}? This will sign them out and force a password change.`)) {
    return;
  }

  actionState.value[member.id] = 'temp';
  membersError.value = '';
  try {
    tempPasswordResult.value = await issueAdminTempPassword(member.id);
    await loadMembers();
  } catch (error: any) {
    membersError.value = error?.response?.data?.error || 'Failed to issue temporary password';
  } finally {
    actionState.value[member.id] = null;
  }
}

async function handleRemove(member: AdminMemberSummary): Promise<void> {
  if (!window.confirm(`Remove @${member.username}? This revokes access immediately.`)) {
    return;
  }

  actionState.value[member.id] = 'remove';
  membersError.value = '';
  try {
    await removeAdminMember(member.id);
    await loadMembers();
  } catch (error: any) {
    membersError.value = error?.response?.data?.error || 'Failed to remove member';
  } finally {
    actionState.value[member.id] = null;
  }
}

async function handleBan(member: AdminMemberSummary): Promise<void> {
  if (!window.confirm(`Ban @${member.username}? They will lose access and the username stays reserved.`)) {
    return;
  }

  actionState.value[member.id] = 'ban';
  membersError.value = '';
  try {
    await banAdminMember(member.id);
    await loadMembers();
  } catch (error: any) {
    membersError.value = error?.response?.data?.error || 'Failed to ban member';
  } finally {
    actionState.value[member.id] = null;
  }
}

function dismissTempPassword(): void {
  tempPasswordResult.value = null;
}

onMounted(() => {
  void loadMembers();
});

watch(query, () => {
  if (queryTimer) clearTimeout(queryTimer);
  queryTimer = setTimeout(() => {
    void loadMembers();
  }, 180);
});

onUnmounted(() => {
  if (queryTimer) clearTimeout(queryTimer);
});
</script>

<style scoped>
.admin-management-page {
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-heading h2 {
  margin: 0 0 6px;
}

.admin-heading p {
  margin: 0;
  max-width: 640px;
}

.section-label {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.members-card,
.temp-password-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.temp-password-head,
.members-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.member-meta-line,
.temp-password-value {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.members-search {
  width: min(300px, 100%);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-admin-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(15, 18, 34, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 0;
}

.member-admin-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.member-primary-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.member-meta-line {
  margin: 0;
}

.member-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 8px;
  flex: 0 0 auto;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.role-chip {
  background: rgba(140, 216, 255, 0.1);
  color: var(--accent);
}

.status-active {
  background: rgba(154, 240, 185, 0.12);
  color: var(--ok);
}

.status-removed {
  background: rgba(255, 204, 128, 0.12);
  color: #ffcc80;
}

.status-banned {
  background: rgba(255, 140, 166, 0.14);
  color: var(--danger);
}

.password-chip {
  background: rgba(255, 255, 255, 0.08);
  color: var(--muted);
}

.temp-password-value {
  display: block;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(4, 16, 39, 0.72);
  border: 1px solid rgba(140, 216, 255, 0.18);
  font-size: 0.95rem;
}

.status-success {
  color: var(--ok);
}

@media (max-width: 760px) {
  .admin-management-page {
    padding: 12px;
  }

  .temp-password-head,
  .members-toolbar,
  .member-admin-row {
    flex-direction: column;
    align-items: stretch;
  }

  .members-search,
  .member-actions .small-btn {
    width: 100%;
  }

  .member-actions {
    justify-content: stretch;
  }
}
</style>
