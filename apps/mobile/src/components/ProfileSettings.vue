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
        
        <button type="submit" :disabled="savingProfile">
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
        
        <button type="submit" :disabled="savingPw">
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
        <button class="danger" @click="handleRotateRecoveryCode" :disabled="rotatingRc">
          Rotate Recovery Code
        </button>
        
        <div v-if="newRecoveryCode" class="recovery-box">
          <strong>New Code:</strong> {{ formattedNewCode }}
          <p class="small">Save this code securely. It will not be shown again.</p>
        </div>
        <p v-if="rcError" class="status-danger small">{{ rcError }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getMe, updateProfile, changePassword, rotateRecoveryCode } from '../services/http';
import { formatRecoveryCode, type AuthResponse, type MeResponse } from '@penthouse/contracts';

const emit = defineEmits<{
  (e: 'profile-updated', profile: MeResponse): void;
  (e: 'auth-updated', session: AuthResponse): void;
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

const formattedNewCode = computed(() => {
  return newRecoveryCode.value ? formatRecoveryCode(newRecoveryCode.value) : '';
});

onMounted(async () => {
  try {
    me.value = await getMe();
    profileForm.value.displayName = me.value.displayName || '';
    profileForm.value.bio = me.value.bio || '';
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
.status-success {
  color: var(--ok);
}

@media (max-width: 760px) {
  .profile-settings-page {
    padding: 12px;
  }
}
</style>
