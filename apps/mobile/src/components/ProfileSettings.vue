<template>
  <div class="profile-settings-page">
    <h2>Settings</h2>
    
    <div v-if="loading" class="small">Loading profile...</div>

    <template v-else>
      <form class="card list" @submit.prevent="handleSaveProfile">
        <h3>Edit Profile</h3>
        <label class="small">Display Name</label>
        <input v-model="profileForm.displayName" type="text" placeholder="Display Name" />
        
        <label class="small">Bio</label>
        <textarea v-model="profileForm.bio" rows="3" placeholder="Tell us about yourself"></textarea>
        
        <p class="small">Role: <strong>{{ me?.role }}</strong></p>
        
        <button type="submit" class="form-btn" :disabled="savingProfile">
          {{ savingProfile ? 'Saving...' : 'Save Profile' }}
        </button>
        <p v-if="profileError" class="status-danger small">{{ profileError }}</p>
        <p v-if="profileSuccess" class="status-success small">Profile updated successfully.</p>
      </form>

      <form class="card list" style="margin-top: 16px;" @submit.prevent="handleChangePassword">
        <h3>Change Password</h3>
        <input v-model="pwForm.currentPassword" type="password" placeholder="Current Password" required />
        <input v-model="pwForm.newPassword" type="password" placeholder="New Password" required />
        <input v-model="pwConfirm" type="password" placeholder="Confirm New Password" required />
        
        <button type="submit" class="form-btn" :disabled="savingPw">
          {{ savingPw ? 'Updating...' : 'Update Password' }}
        </button>
        <p v-if="pwError" class="status-danger small">{{ pwError }}</p>
        <p v-if="pwSuccess" class="status-success small">Password updated.</p>
      </form>

      <div class="card list" style="margin-top: 16px;">
        <h3>Recovery Code</h3>
        <p class="small">
          Rotate your recovery code if you suspect it is compromised. 
          Your old code will immediately stop working.
        </p>
        <button class="danger form-btn" @click="handleRotateRecoveryCode" :disabled="rotatingRc">
          Rotate Recovery Code
        </button>
        
        <div v-if="newRecoveryCode" class="recovery-box">
          <strong>New Code:</strong> {{ formattedNewCode }}
          <p class="small">Save this code securely. It will not be shown again.</p>
        </div>
        <p v-if="rcError" class="status-danger small">{{ rcError }}</p>
      </div>

      <form class="card list" style="margin-top: 16px;" @submit.prevent="handleSaveNotificationSettings">
        <h3>Notifications</h3>
        <p class="small">Manage push behavior for this device and whether foreground in-app toasts appear while you are browsing other chats.</p>

        <label class="toggle-row">
          <span>
            <strong>Show in-app toasts</strong>
            <p class="small">Suppress foreground toasts without affecting actual message delivery.</p>
          </span>
          <input v-model="notificationForm.showInAppToasts" type="checkbox" />
        </label>

        <div v-if="!pushToken" class="notification-unavailable small">
          Device push controls are unavailable until push is active on this device.
        </div>

        <template v-else>
          <label class="toggle-row">
            <span>
              <strong>Push on this device</strong>
              <p class="small">Turn backend push delivery on or off for this specific device token.</p>
            </span>
            <input v-model="notificationForm.notificationsEnabled" type="checkbox" />
          </label>

          <label class="toggle-row">
            <span>
              <strong>Show message previews</strong>
              <p class="small">Turn this off to use generic push text instead of message content.</p>
            </span>
            <input v-model="notificationForm.previewsEnabled" type="checkbox" />
          </label>

          <label class="toggle-row">
            <span>
              <strong>Quiet hours</strong>
              <p class="small">Suppress push during a daily quiet window in this device's timezone.</p>
            </span>
            <input v-model="notificationForm.quietHoursEnabled" type="checkbox" />
          </label>

          <div v-if="notificationForm.quietHoursEnabled" class="quiet-hours-grid">
            <label>
              <span class="small">Start</span>
              <input v-model="notificationForm.quietHoursStart" type="time" />
            </label>
            <label>
              <span class="small">End</span>
              <input v-model="notificationForm.quietHoursEnd" type="time" />
            </label>
            <label class="quiet-hours-timezone">
              <span class="small">Timezone</span>
              <input v-model="notificationForm.timezone" type="text" readonly />
            </label>
          </div>
        </template>

        <button type="submit" class="form-btn" :disabled="savingNotifications">
          {{ savingNotifications ? 'Saving...' : 'Save Notification Settings' }}
        </button>
        <p v-if="notificationError" class="status-danger small">{{ notificationError }}</p>
        <p v-if="notificationSuccess" class="status-success small">Notification settings updated.</p>
      </form>

      <form class="card list" style="margin-top: 16px;" @submit.prevent="handleSaveMediaSettings">
        <h3>Media</h3>
        <p class="small">Keep motion and data use manageable on this device without changing what gets sent in chat.</p>

        <label class="toggle-row">
          <span>
            <strong>Animate GIFs automatically</strong>
            <p class="small">When enabled, GIFs can animate inline in chat and in the picker.</p>
          </span>
          <input v-model="mediaForm.animateGifsAutomatically" type="checkbox" />
        </label>

        <label class="toggle-row">
          <span>
            <strong>Reduced data mode</strong>
            <p class="small">Prefer lighter or still previews. This overrides automatic GIF animation.</p>
          </span>
          <input v-model="mediaForm.reducedDataMode" type="checkbox" />
        </label>

        <button type="submit" class="form-btn" :disabled="savingMedia">
          {{ savingMedia ? 'Saving...' : 'Save Media Settings' }}
        </button>
        <p v-if="mediaError" class="status-danger small">{{ mediaError }}</p>
        <p v-if="mediaSuccess" class="status-success small">Media settings updated.</p>
      </form>

      <section class="card list" style="margin-top: 16px;">
        <div class="session-header-row">
          <div>
            <h3>Sessions and Devices</h3>
            <p class="small">Review where your account is signed in and revoke other sessions if needed.</p>
          </div>
          <button type="button" class="secondary small-btn" :disabled="loadingSessions" @click="loadSessions">
            {{ loadingSessions ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <p v-if="sessionError" class="status-danger small">{{ sessionError }}</p>

        <div v-if="currentSession" class="session-card current-session-card">
          <div class="session-card-head">
            <div>
              <p class="small section-overline">Current session</p>
              <strong>{{ currentSession.deviceLabel }}</strong>
            </div>
            <span class="session-badge current">Current</span>
          </div>
          <p class="small session-meta">Last active {{ formatDateTime(currentSession.lastUsedAt) }}</p>
          <p class="small session-meta">Started {{ formatDateTime(currentSession.createdAt) }}</p>
          <p class="small session-meta">Context: {{ currentSession.appContext || 'unknown' }}</p>
          <p class="small session-meta">Push active: {{ currentSession.hasPushToken ? 'yes' : 'no' }}</p>
        </div>

        <div class="session-section-row">
          <div>
            <p class="small section-overline">Other sessions</p>
            <strong>{{ otherSessions.length ? `${otherSessions.length} active` : 'No other active sessions' }}</strong>
          </div>
          <button
            v-if="otherSessions.length > 1"
            type="button"
            class="danger small-btn"
            :disabled="revokingAllOthers"
            @click="handleRevokeOtherSessions"
          >
            {{ revokingAllOthers ? 'Revoking...' : 'Revoke all others' }}
          </button>
        </div>

        <div v-if="!loadingSessions && otherSessions.length === 0" class="small session-empty-state">
          No other active sessions right now.
        </div>

        <article v-for="session in otherSessions" :key="session.id" class="session-card">
          <div class="session-card-head">
            <div>
              <strong>{{ session.deviceLabel }}</strong>
              <p class="small session-meta">Context: {{ session.appContext || 'unknown' }}</p>
            </div>
            <button
              type="button"
              class="danger small-btn"
              :disabled="revokingSessionId === session.id"
              @click="handleRevokeSession(session.id)"
            >
              {{ revokingSessionId === session.id ? 'Revoking...' : 'Revoke' }}
            </button>
          </div>
          <p class="small session-meta">Last active {{ formatDateTime(session.lastUsedAt) }}</p>
          <p class="small session-meta">Started {{ formatDateTime(session.createdAt) }}</p>
          <p class="small session-meta">Push active: {{ session.hasPushToken ? 'yes' : 'no' }}</p>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  getMe,
  getMySessions,
  revokeOtherSessions,
  revokeSession,
  updateProfile,
  changePassword,
  rotateRecoveryCode,
  getDeviceNotificationSettings,
  updateDeviceNotificationSettings
} from '../services/http';
import { getCachedPushToken } from '../services/notifications';
import {
  loadStoredAnimateGifsAutomatically,
  loadStoredReducedDataMode,
  loadStoredShowInAppToasts,
  persistStoredAnimateGifsAutomatically,
  persistStoredReducedDataMode,
  persistStoredShowInAppToasts
} from '../services/sessionStorage';
 import { formatRecoveryCode, type AuthResponse, type DeviceNotificationSettings, type MeResponse, type SessionSummary } from '@penthouse/contracts';

const emit = defineEmits<{
  (e: 'profile-updated', profile: MeResponse): void;
  (e: 'auth-updated', session: AuthResponse): void;
  (e: 'notification-preferences-updated', preferences: { showInAppToasts: boolean }): void;
  (e: 'media-preferences-updated', preferences: { animateGifsAutomatically: boolean; reducedDataMode: boolean }): void;
}>();

const loading = ref(true);
const me = ref<MeResponse | null>(null);

const profileForm = ref({
  displayName: '',
  bio: ''
});
const savingProfile = ref(false);
const profileError = ref('');
const profileSuccess = ref(false);

const pwForm = ref({
  currentPassword: '',
  newPassword: ''
});
const pwConfirm = ref('');
const savingPw = ref(false);
const pwError = ref('');
const pwSuccess = ref(false);

const rotatingRc = ref(false);
const rcError = ref('');
const newRecoveryCode = ref('');
const pushToken = ref<string | null>(null);
const savingNotifications = ref(false);
const notificationError = ref('');
const notificationSuccess = ref(false);
const notificationForm = ref({
  notificationsEnabled: true,
  previewsEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  showInAppToasts: true
});
const savingMedia = ref(false);
const mediaError = ref('');
const mediaSuccess = ref(false);
const mediaForm = ref({
  animateGifsAutomatically: true,
  reducedDataMode: false
});
const sessions = ref<SessionSummary[]>([]);
const loadingSessions = ref(false);
const sessionError = ref('');
const revokingSessionId = ref<string | null>(null);
const revokingAllOthers = ref(false);

const formattedNewCode = computed(() => {
  return newRecoveryCode.value ? formatRecoveryCode(newRecoveryCode.value) : '';
});

const currentSession = computed(() => sessions.value.find((session) => session.current) ?? null);
const otherSessions = computed(() => sessions.value.filter((session) => !session.current));

function minutesToTime(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '00:00';
  const hours = Math.floor(value / 60).toString().padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

async function loadSessions(): Promise<void> {
  loadingSessions.value = true;
  sessionError.value = '';
  try {
    sessions.value = await getMySessions();
  } catch (error: any) {
    sessionError.value = error?.response?.data?.error || 'Failed to load sessions';
  } finally {
    loadingSessions.value = false;
  }
}

function applyNotificationSettings(settings: DeviceNotificationSettings): void {
  notificationForm.value.notificationsEnabled = settings.notificationsEnabled;
  notificationForm.value.previewsEnabled = settings.previewsEnabled;
  notificationForm.value.quietHoursEnabled = settings.quietHoursEnabled;
  notificationForm.value.quietHoursStart = minutesToTime(settings.quietHoursStartMinute);
  notificationForm.value.quietHoursEnd = minutesToTime(settings.quietHoursEndMinute);
  notificationForm.value.timezone = settings.timezone || notificationForm.value.timezone;
}

onMounted(async () => {
  try {
    notificationForm.value.showInAppToasts = await loadStoredShowInAppToasts();
    emit('notification-preferences-updated', { showInAppToasts: notificationForm.value.showInAppToasts });
    mediaForm.value.animateGifsAutomatically = await loadStoredAnimateGifsAutomatically();
    mediaForm.value.reducedDataMode = await loadStoredReducedDataMode();
    emit('media-preferences-updated', {
      animateGifsAutomatically: mediaForm.value.animateGifsAutomatically,
      reducedDataMode: mediaForm.value.reducedDataMode
    });

    me.value = await getMe();
    profileForm.value.displayName = me.value.displayName || '';
    profileForm.value.bio = me.value.bio || '';
    await loadSessions();

    pushToken.value = getCachedPushToken();
    if (pushToken.value) {
      try {
        const settings = await getDeviceNotificationSettings(pushToken.value);
        applyNotificationSettings(settings);
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          notificationError.value = 'Failed to load device notification settings';
        }
      }
    }
  } catch (error: any) {
    profileError.value = 'Failed to load profile';
  } finally {
    loading.value = false;
  }
});

async function handleSaveProfile() {
  savingProfile.value = true;
  profileError.value = '';
  profileSuccess.value = false;
  try {
    const updated = await updateProfile({
      displayName: profileForm.value.displayName.trim() || undefined,
      bio: profileForm.value.bio.trim() || null
    });
    me.value = updated;
    emit('profile-updated', updated);
    profileSuccess.value = true;
    setTimeout(() => { profileSuccess.value = false; }, 3000);
  } catch (err: any) {
    profileError.value = err.response?.data?.error || 'Failed to update profile';
  } finally {
    savingProfile.value = false;
  }
}

async function handleChangePassword() {
  if (pwForm.value.newPassword !== pwConfirm.value) {
    pwError.value = 'New passwords do not match';
    return;
  }
  savingPw.value = true;
  pwError.value = '';
  pwSuccess.value = false;
  try {
    const updatedSession = await changePassword({ ...pwForm.value });
    me.value = await getMe();
    emit('auth-updated', updatedSession);
    await loadSessions();
    pwSuccess.value = true;
    pwForm.value = { currentPassword: '', newPassword: '' };
    pwConfirm.value = '';
    newRecoveryCode.value = updatedSession.recoveryCode ?? '';
    setTimeout(() => { pwSuccess.value = false; }, 3000);
  } catch (err: any) {
    pwError.value = err.response?.data?.error || 'Failed to update password';
  } finally {
    savingPw.value = false;
  }
}

async function handleRotateRecoveryCode() {
  if (!confirm('Are you sure you want to rotate your recovery code?')) return;
  rotatingRc.value = true;
  rcError.value = '';
  newRecoveryCode.value = '';
  try {
    const res = await rotateRecoveryCode();
    newRecoveryCode.value = res.recoveryCode;
  } catch (err: any) {
    rcError.value = err.response?.data?.error || 'Failed to rotate recovery code';
  } finally {
    rotatingRc.value = false;
  }
}

async function handleSaveNotificationSettings() {
  savingNotifications.value = true;
  notificationError.value = '';
  notificationSuccess.value = false;

  const nextShowInAppToasts = notificationForm.value.showInAppToasts;

  try {
    if (pushToken.value) {
      const quietHoursStartMinute = notificationForm.value.quietHoursEnabled ? timeToMinutes(notificationForm.value.quietHoursStart) : null;
      const quietHoursEndMinute = notificationForm.value.quietHoursEnabled ? timeToMinutes(notificationForm.value.quietHoursEnd) : null;

      await updateDeviceNotificationSettings({
        token: pushToken.value,
        notificationsEnabled: notificationForm.value.notificationsEnabled,
        previewsEnabled: notificationForm.value.previewsEnabled,
        quietHoursEnabled: notificationForm.value.quietHoursEnabled,
        quietHoursStartMinute,
        quietHoursEndMinute,
        timezone: notificationForm.value.quietHoursEnabled ? notificationForm.value.timezone : null
      });
    }

    await persistStoredShowInAppToasts(nextShowInAppToasts);
    emit('notification-preferences-updated', { showInAppToasts: nextShowInAppToasts });
    notificationSuccess.value = true;
    setTimeout(() => { notificationSuccess.value = false; }, 3000);
  } catch (err: any) {
    notificationError.value = err.response?.data?.error || 'Failed to update notification settings';
  } finally {
    savingNotifications.value = false;
  }
}

async function handleSaveMediaSettings() {
  savingMedia.value = true;
  mediaError.value = '';
  mediaSuccess.value = false;

  try {
    await Promise.all([
      persistStoredAnimateGifsAutomatically(mediaForm.value.animateGifsAutomatically),
      persistStoredReducedDataMode(mediaForm.value.reducedDataMode)
    ]);
    emit('media-preferences-updated', {
      animateGifsAutomatically: mediaForm.value.animateGifsAutomatically,
      reducedDataMode: mediaForm.value.reducedDataMode
    });
    mediaSuccess.value = true;
    setTimeout(() => { mediaSuccess.value = false; }, 3000);
  } catch {
    mediaError.value = 'Failed to update media settings';
  } finally {
    savingMedia.value = false;
  }
}

async function handleRevokeSession(sessionId: string) {
  if (!confirm('Revoke this other session?')) return;

  revokingSessionId.value = sessionId;
  sessionError.value = '';
  try {
    await revokeSession(sessionId);
    await loadSessions();
  } catch (error: any) {
    sessionError.value = error?.response?.data?.error || 'Failed to revoke session';
  } finally {
    revokingSessionId.value = null;
  }
}

async function handleRevokeOtherSessions() {
  if (!confirm('Revoke all other sessions?')) return;

  revokingAllOthers.value = true;
  sessionError.value = '';
  try {
    await revokeOtherSessions();
    await loadSessions();
  } catch (error: any) {
    sessionError.value = error?.response?.data?.error || 'Failed to revoke other sessions';
  } finally {
    revokingAllOthers.value = false;
  }
}
</script>

<style scoped>
.profile-settings-page {
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  min-width: 0;
  max-width: 600px;
  box-sizing: border-box;
  margin: 0 auto;
}

.card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.session-header-row,
.session-section-row,
.session-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.session-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
}

.current-session-card {
  background: rgba(140, 216, 255, 0.08);
  border-color: rgba(140, 216, 255, 0.2);
}

.session-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.session-badge.current {
  color: var(--accent);
  background: rgba(140, 216, 255, 0.14);
}

.session-meta {
  margin: 4px 0 0;
}

.section-overline {
  margin: 0 0 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.session-empty-state {
  padding: 10px 0 2px;
  opacity: 0.78;
}

input,
textarea,
button {
  min-width: 0;
  max-width: 100%;
}

h2 {
  margin-top: 0;
  margin-bottom: 24px;
}

h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

textarea {
  resize: vertical;
  background: rgba(15, 18, 34, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 14px;
  border-radius: 12px;
  font-family: inherit;
  color: var(--text);
}

.recovery-box {
  margin-top: 12px;
  padding: 12px;
  background: rgba(114, 214, 255, 0.1);
  border: 1px solid rgba(114, 214, 255, 0.3);
  border-radius: 8px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.toggle-row p {
  margin: 4px 0 0;
}

.toggle-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin-top: 4px;
  accent-color: var(--accent);
}

.quiet-hours-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quiet-hours-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quiet-hours-timezone {
  grid-column: 1 / -1;
}

.notification-unavailable {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-success {
  color: var(--ok);
}

@media (max-width: 760px) {
  .profile-settings-page {
    padding: 12px;
  }

  .toggle-row,
  .quiet-hours-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
