<template>
  <div class="admin-server-page">
    <div class="server-heading">
      <div>
        <h2>Server Management</h2>
        <p class="small">Read-only operator visibility for the live rebuild. No restart or deployment controls are exposed here.</p>
      </div>
      <button type="button" class="secondary small-btn" :disabled="loading" @click="loadSummary">
        {{ loading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="loading && !summary" class="card server-card small">Loading operator summary...</div>
    <p v-else-if="error && !summary" class="status-danger small">{{ error }}</p>

    <template v-else-if="summary">
      <p class="small refresh-meta">Last checked {{ formatDateTime(summary.app.checkedAt) }}</p>
      <p v-if="error" class="status-danger small">{{ error }}</p>

      <section class="server-grid">
        <article class="card server-card list">
          <p class="small section-label">Runtime</p>
          <strong>{{ summary.app.name }}</strong>
          <div class="metric-row">
            <span class="small">Database</span>
            <span class="status-badge ok">OK</span>
          </div>
          <div class="metric-row">
            <span class="small">Checked</span>
            <span>{{ formatDateTime(summary.app.checkedAt) }}</span>
          </div>
          <div class="metric-row"><span class="small">Started</span><span>{{ formatOptionalDateTime(summary.app.startedAt) }}</span></div>
          <div class="metric-row"><span class="small">Uptime</span><span>{{ formatUptime(summary.app.uptimeSeconds) }}</span></div>
          <div class="metric-row"><span class="small">Version</span><span>{{ summary.app.version || 'Unavailable' }}</span></div>
          <div class="metric-row"><span class="small">Build ID</span><span>{{ summary.app.buildId || 'Unavailable' }}</span></div>
          <div class="metric-row"><span class="small">Deployed</span><span>{{ formatOptionalDateTime(summary.app.deployedAt) }}</span></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Members</p>
          <div class="metric-row"><span class="small">Total</span><strong>{{ summary.members.total }}</strong></div>
          <div class="metric-row"><span class="small">Active</span><strong>{{ summary.members.active }}</strong></div>
          <div class="metric-row"><span class="small">Banned</span><strong>{{ summary.members.banned }}</strong></div>
          <div class="metric-row"><span class="small">Removed</span><strong>{{ summary.members.removed }}</strong></div>
          <div class="metric-row"><span class="small">Admins</span><strong>{{ summary.members.admins }}</strong></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Content</p>
          <div class="metric-row"><span class="small">Chats</span><strong>{{ summary.content.chats }}</strong></div>
          <div class="metric-row"><span class="small">Messages</span><strong>{{ summary.content.messages }}</strong></div>
          <div class="metric-row"><span class="small">Uploads</span><strong>{{ summary.content.uploads }}</strong></div>
          <div class="metric-row"><span class="small">DB upload bytes</span><strong>{{ formatBytes(summary.content.uploadBytesTotal) }}</strong></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Uploads Storage</p>
          <div class="metric-row">
            <span class="small">Directory scan</span>
            <span class="status-badge" :class="summary.uploads.status === 'available' ? 'ok' : 'neutral'">
              {{ summary.uploads.status }}
            </span>
          </div>
          <div class="metric-row"><span class="small">Disk bytes</span><span>{{ formatOptionalBytes(summary.uploads.directoryBytes) }}</span></div>
          <div class="metric-row"><span class="small">Files scanned</span><span>{{ formatOptionalNumber(summary.uploads.fileCount) }}</span></div>
          <div class="metric-row"><span class="small">Latest file</span><span>{{ formatOptionalDateTime(summary.uploads.latestUploadAt) }}</span></div>
          <p v-if="summary.uploads.scanLimited" class="small metrics-note">Scan limited to a capped number of files for operator safety.</p>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Realtime</p>
          <div class="metric-row"><span class="small">Sockets</span><strong>{{ summary.realtime.sockets }}</strong></div>
          <div class="metric-row"><span class="small">Connected users</span><strong>{{ summary.realtime.connectedUsers }}</strong></div>
          <div class="metric-row"><span class="small">Active chat rooms</span><strong>{{ summary.realtime.activeChatRooms }}</strong></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Moderation</p>
          <div class="metric-row"><span class="small">Hidden messages</span><strong>{{ summary.moderation.hiddenMessages }}</strong></div>
          <div class="metric-row"><span class="small">Actions (24h)</span><strong>{{ summary.moderation.recentActions24h }}</strong></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Invite</p>
          <strong>{{ summary.invite.code }}</strong>
          <div class="metric-row"><span class="small">Uses</span><strong>{{ summary.invite.uses }}</strong></div>
          <div class="metric-row"><span class="small">Max uses</span><strong>{{ summary.invite.maxUses }}</strong></div>
          <div class="metric-row"><span class="small">Created</span><strong>{{ formatDateTime(summary.invite.createdAt) }}</strong></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Push</p>
          <div class="metric-row">
            <span class="small">Configured</span>
            <span class="status-badge" :class="summary.push.configured ? 'ok' : 'neutral'">
              {{ summary.push.configured ? 'Yes' : 'No' }}
            </span>
          </div>
          <div class="metric-row"><span class="small">Android tokens</span><strong>{{ summary.push.androidTokens }}</strong></div>
          <div class="metric-row"><span class="small">iOS tokens</span><strong>{{ summary.push.iosTokens }}</strong></div>
          <div class="metric-row"><span class="small">Push paused</span><strong>{{ summary.push.notificationsDisabled }}</strong></div>
          <div class="metric-row"><span class="small">Quiet hours</span><strong>{{ summary.push.quietHoursEnabled }}</strong></div>
          <div class="metric-row"><span class="small">Previews off</span><strong>{{ summary.push.previewsDisabled }}</strong></div>
          <p class="small metrics-note">Since this process started</p>
          <div class="metric-row"><span class="small">Push sent</span><strong>{{ summary.push.sinceStart.successfulSends }}</strong></div>
          <div class="metric-row"><span class="small">Push failed</span><strong>{{ summary.push.sinceStart.failedSends }}</strong></div>
          <div class="metric-row"><span class="small">Stale tokens removed</span><strong>{{ summary.push.sinceStart.staleTokensRemoved }}</strong></div>
          <div class="metric-row"><span class="small">Last failure</span><span>{{ formatOptionalDateTime(summary.push.sinceStart.lastFailureAt) }}</span></div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Errors</p>
          <p class="small metrics-note">5xx responses since this process started</p>
          <div class="metric-row"><span class="small">5xx count</span><strong>{{ summary.errors.sinceStart.serverErrorCount }}</strong></div>
          <div class="metric-row"><span class="small">Last 5xx</span><span>{{ formatOptionalDateTime(summary.errors.sinceStart.lastServerErrorAt) }}</span></div>
          <div v-if="summary.errors.sinceStart.routeGroups.length === 0" class="small subdued-copy">No 5xx route groups recorded in this process yet.</div>
          <div v-for="routeGroup in summary.errors.sinceStart.routeGroups" :key="routeGroup.group" class="metric-row">
            <span class="small">{{ routeGroup.group }}</span>
            <strong>{{ routeGroup.count }}</strong>
          </div>
        </article>

        <article class="card server-card list">
          <p class="small section-label">Backup</p>
          <div class="metric-row">
            <span class="small">Status</span>
            <span class="status-badge" :class="backupStatusClass(summary.backup.status)">{{ summary.backup.status }}</span>
          </div>
          <div class="metric-row"><span class="small">Target</span><span>{{ summary.backup.target || 'Unavailable' }}</span></div>
          <div class="metric-row"><span class="small">Last successful</span><span>{{ formatOptionalDateTime(summary.backup.lastSuccessfulBackupAt) }}</span></div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AdminOperatorSummary } from '@penthouse/contracts';
import { getAdminOperatorSummary } from '../services/http';

const summary = ref<AdminOperatorSummary | null>(null);
const loading = ref(true);
const error = ref('');

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function formatOptionalDateTime(value: string | null): string {
  return value ? formatDateTime(value) : 'Unavailable';
}

function formatOptionalNumber(value: number | null): string {
  return typeof value === 'number' ? String(value) : 'Unavailable';
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatOptionalBytes(value: number | null): string {
  return typeof value === 'number' ? formatBytes(value) : 'Unavailable';
}

function formatUptime(value: number | null): string {
  if (typeof value !== 'number') return 'Unavailable';
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.floor(value / 60)}m ${value % 60}s`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function backupStatusClass(status: string): string {
  if (status === 'ok' || status === 'healthy' || status === 'success') return 'ok';
  if (status === 'unconfigured' || status === 'unavailable') return 'neutral';
  return 'danger';
}

async function loadSummary(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    summary.value = await getAdminOperatorSummary();
  } catch (nextError: any) {
    error.value = nextError?.response?.data?.error || 'Failed to load operator summary';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadSummary();
});
</script>

<style scoped>
.admin-server-page {
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

.server-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.server-heading h2,
.server-heading p {
  margin: 0;
}

.server-heading p {
  margin-top: 6px;
  max-width: 620px;
}

.refresh-meta {
  margin: 0;
}

.server-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.server-card {
  min-width: 0;
}

.section-label {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.metric-row strong,
.metric-row span:last-child {
  text-align: right;
  overflow-wrap: anywhere;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-badge.ok {
  background: rgba(154, 240, 185, 0.12);
  color: var(--ok);
}

.status-badge.danger {
  background: rgba(255, 140, 166, 0.12);
  color: var(--danger);
}

.status-badge.neutral {
  background: rgba(255, 255, 255, 0.08);
  color: var(--muted);
}

.metrics-note,
.subdued-copy {
  margin: 0;
  opacity: 0.76;
}

@media (max-width: 760px) {
  .admin-server-page {
    padding: 12px;
  }

  .server-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .server-grid {
    grid-template-columns: 1fr;
  }

  .server-heading .small-btn {
    width: 100%;
  }
}
</style>
