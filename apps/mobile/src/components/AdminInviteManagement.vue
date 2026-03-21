<template>
  <div class="admin-invite-page">
    <div class="invite-heading">
      <div>
        <h2>Invite Management</h2>
        <p class="small">Control registration mode and manage invite codes. Each invite has a label, usage cap, and status tracked automatically.</p>
      </div>
      <button type="button" class="secondary small-btn" :disabled="loadingInvites || loadingMode" @click="handleRefresh">
        {{ loadingInvites ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <section class="card registration-mode-card list">
      <div class="mode-head">
        <div>
          <p class="small section-label">Registration mode</p>
          <strong v-if="registrationMode">{{ modeLabel(registrationMode) }}</strong>
          <span v-else-if="loadingMode" class="small">Loading...</span>
        </div>
        <button
          type="button"
          class="secondary small-btn"
          :disabled="togglingMode || loadingMode || !registrationMode"
          @click="handleToggleMode"
        >
          {{ togglingMode ? 'Updating...' : toggleLabel }}
        </button>
      </div>
      <p v-if="modeError" class="status-danger small">{{ modeError }}</p>
      <p v-if="modeSuccess" class="status-success small">{{ modeSuccess }}</p>
    </section>

    <section class="card create-invite-card list">
      <p class="small section-label">Create invite</p>
      <form class="create-invite-form" @submit.prevent="handleCreateInvite">
        <div class="create-invite-fields">
          <input
            v-model="newLabel"
            type="text"
            placeholder="Invite label (e.g. friends-batch-2)"
            maxlength="100"
            autocomplete="off"
            spellcheck="false"
            required
          />
          <input
            v-model.number="newMaxUses"
            type="number"
            placeholder="Max uses (default unlimited)"
            min="1"
            max="999999"
          />
        </div>
        <button
          type="submit"
          class="form-btn"
          :disabled="creatingInvite || !newLabel.trim()"
        >
          {{ creatingInvite ? 'Creating...' : 'Create invite' }}
        </button>
      </form>
      <p v-if="createError" class="status-danger small">{{ createError }}</p>
      <p v-if="createSuccess" class="status-success small">{{ createSuccess }}</p>
    </section>

    <section class="card invites-list-card list">
      <div class="invites-toolbar">
        <div>
          <p class="small section-label">Invites</p>
          <strong>{{ invites.length }} loaded</strong>
        </div>
      </div>

      <div v-if="loadingInvites && !invites.length" class="small">Loading invites...</div>
      <p v-else-if="invitesError && !invites.length" class="status-danger small">{{ invitesError }}</p>
      <p v-else-if="!invites.length" class="small">No invites created yet.</p>

      <div v-else class="invites-list">
        <article v-for="invite in invites" :key="invite.id" class="invite-row">
          <div class="invite-row-copy">
            <div class="invite-primary-line">
              <strong>{{ invite.label }}</strong>
              <span class="status-chip" :class="statusChipClass(inviteStatus(invite))">{{ inviteStatus(invite) }}</span>
            </div>
            <p class="small invite-meta-line">
              Code: <code>{{ invite.code }}</code>
              <span> - Uses: {{ invite.uses }}/{{ invite.maxUses }}</span>
              <span> - Created {{ formatDateTime(invite.createdAt) }}</span>
              <span v-if="invite.expiresAt"> - Expires {{ formatDateTime(invite.expiresAt) }}</span>
              <span v-if="invite.revokedAt"> - Revoked {{ formatDateTime(invite.revokedAt) }}</span>
            </p>
          </div>

          <div class="invite-actions">
            <button
              type="button"
              class="danger small-btn"
              :disabled="inviteStatus(invite) !== 'active' || revokingId === invite.id"
              @click="handleRevokeInvite(invite)"
            >
              {{ revokingId === invite.id ? 'Revoking...' : 'Revoke' }}
            </button>
          </div>
        </article>
      </div>

      <p v-if="invitesError && invites.length" class="status-danger small">{{ invitesError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AdminInviteDetail, RegistrationModeResponse } from '@penthouse/contracts';
import {
  createAdminInvite,
  getAdminInvites,
  getRegistrationMode,
  revokeAdminInvite,
  updateRegistrationMode
} from '../services/http';

const invites = ref<AdminInviteDetail[]>([]);
const loadingInvites = ref(true);
const invitesError = ref('');

const registrationMode = ref<RegistrationModeResponse['registrationMode'] | null>(null);
const loadingMode = ref(true);
const togglingMode = ref(false);
const modeError = ref('');
const modeSuccess = ref('');

const newLabel = ref('');
const newMaxUses = ref<number | null>(null);
const creatingInvite = ref(false);
const createError = ref('');
const createSuccess = ref('');

const revokingId = ref<string | null>(null);

const toggleLabel = computed(() => {
  if (!registrationMode.value) return 'Toggle';
  return registrationMode.value === 'invite_only' ? 'Switch to closed' : 'Switch to invite-only';
});

function modeLabel(mode: RegistrationModeResponse['registrationMode']): string {
  return mode === 'invite_only' ? 'Invite-only' : 'Closed';
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function inviteStatus(invite: AdminInviteDetail): 'revoked' | 'expired' | 'exhausted' | 'active' {
  if (invite.revokedAt) return 'revoked';
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return 'expired';
  if (invite.uses >= invite.maxUses) return 'exhausted';
  return 'active';
}

function statusChipClass(status: string): string {
  switch (status) {
    case 'active': return 'invite-status-active';
    case 'exhausted': return 'invite-status-exhausted';
    case 'expired': return 'invite-status-expired';
    case 'revoked': return 'invite-status-revoked';
    default: return '';
  }
}

async function loadInvites(): Promise<void> {
  loadingInvites.value = true;
  invitesError.value = '';
  try {
    invites.value = await getAdminInvites();
  } catch (error: any) {
    invitesError.value = error?.response?.data?.error || 'Failed to load invites';
  } finally {
    loadingInvites.value = false;
  }
}

async function loadMode(): Promise<void> {
  loadingMode.value = true;
  modeError.value = '';
  try {
    const result = await getRegistrationMode();
    registrationMode.value = result.registrationMode;
  } catch (error: any) {
    modeError.value = error?.response?.data?.error || 'Failed to load registration mode';
  } finally {
    loadingMode.value = false;
  }
}

async function handleToggleMode(): Promise<void> {
  if (!registrationMode.value) return;

  const nextMode = registrationMode.value === 'invite_only' ? 'closed' : 'invite_only';
  const confirmMsg = nextMode === 'closed'
    ? 'Switch to closed registration? No new members will be able to register, even with a valid invite code.'
    : 'Switch to invite-only registration? Members with a valid invite code will be able to register.';

  if (!window.confirm(confirmMsg)) return;

  togglingMode.value = true;
  modeError.value = '';
  modeSuccess.value = '';
  try {
    const result = await updateRegistrationMode({ registrationMode: nextMode });
    registrationMode.value = result.registrationMode;
    modeSuccess.value = `Registration mode updated to ${modeLabel(result.registrationMode)}.`;
  } catch (error: any) {
    modeError.value = error?.response?.data?.error || 'Failed to update registration mode';
  } finally {
    togglingMode.value = false;
  }
}

async function handleCreateInvite(): Promise<void> {
  const label = newLabel.value.trim();
  if (!label) return;

  creatingInvite.value = true;
  createError.value = '';
  createSuccess.value = '';
  try {
    const data: { label: string; maxUses?: number } = { label };
    if (newMaxUses.value && newMaxUses.value > 0) {
      data.maxUses = newMaxUses.value;
    }
    await createAdminInvite(data);
    createSuccess.value = 'Invite created.';
    newLabel.value = '';
    newMaxUses.value = null;
    await loadInvites();
  } catch (error: any) {
    createError.value = error?.response?.data?.error || 'Failed to create invite';
  } finally {
    creatingInvite.value = false;
  }
}

async function handleRevokeInvite(invite: AdminInviteDetail): Promise<void> {
  if (!window.confirm(`Revoke invite "${invite.label}" (${invite.code})? It will stop working immediately.`)) {
    return;
  }

  revokingId.value = invite.id;
  invitesError.value = '';
  try {
    await revokeAdminInvite(invite.id);
    await loadInvites();
  } catch (error: any) {
    invitesError.value = error?.response?.data?.error || 'Failed to revoke invite';
  } finally {
    revokingId.value = null;
  }
}

async function handleRefresh(): Promise<void> {
  await Promise.all([loadInvites(), loadMode()]);
}

onMounted(() => {
  void Promise.all([loadInvites(), loadMode()]);
});
</script>

<style scoped>
.admin-invite-page {
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.invite-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.invite-heading h2,
.invite-heading p {
  margin: 0;
}

.invite-heading p {
  margin-top: 6px;
  max-width: 640px;
}

.section-label {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.registration-mode-card,
.create-invite-card,
.invites-list-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.mode-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.create-invite-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.create-invite-fields {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}

.invites-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.invites-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invite-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(15, 18, 34, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-width: 0;
}

.invite-row-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.invite-primary-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.invite-meta-line {
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.invite-meta-line code {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(4, 16, 39, 0.72);
  border: 1px solid rgba(140, 216, 255, 0.18);
  font-size: 0.88rem;
}

.invite-actions {
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

.invite-status-active {
  background: rgba(154, 240, 185, 0.12);
  color: var(--ok);
}

.invite-status-exhausted {
  background: rgba(255, 204, 128, 0.12);
  color: #ffcc80;
}

.invite-status-expired {
  background: rgba(255, 255, 255, 0.08);
  color: var(--muted);
}

.invite-status-revoked {
  background: rgba(255, 140, 166, 0.14);
  color: var(--danger);
}

.status-success {
  color: var(--ok);
}

@media (max-width: 760px) {
  .admin-invite-page {
    padding: 12px;
  }

  .invite-heading,
  .mode-head,
  .invite-row {
    flex-direction: column;
    align-items: stretch;
  }

  .create-invite-fields {
    grid-template-columns: 1fr;
  }

  .invite-actions .small-btn {
    width: 100%;
  }

  .invite-actions {
    justify-content: stretch;
  }
}
</style>
