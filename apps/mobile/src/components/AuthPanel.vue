<template>
  <section class="card glass-panel auth-panel">
    <div class="auth-mode-switcher glass-inset" style="margin-bottom: 24px; padding: 6px;">
      <button class="small-btn" :class="mode === 'login' ? '' : 'secondary'" @click="mode = 'login'">Login</button>
      <button class="small-btn" :class="mode === 'register' ? '' : 'secondary'" @click="mode = 'register'">Register</button>
      <button class="small-btn" :class="mode === 'reset' ? '' : 'secondary'" @click="mode = 'reset'">Reset</button>
    </div>

    <div v-if="mode === 'register' && props.registrationMode === 'closed'" class="registration-closed-notice">
      <p>Registration is currently closed.</p>
      <p class="small">Check back later or contact an admin for access.</p>
    </div>

    <form v-else class="list" @submit.prevent="handleSubmit">
      <input
        v-model="username"
        type="text"
        placeholder="username"
        required
        :minlength="AUTH_CONSTRAINTS.usernameMin"
        :maxlength="AUTH_CONSTRAINTS.usernameMax"
        autocapitalize="none"
        autocomplete="username"
        spellcheck="false"
        @blur="username = normalizeUsername(username)"
      />
      <input
        v-model="password"
        type="password"
        :placeholder="mode === 'reset' ? 'new password' : 'password'"
        required
        :minlength="AUTH_CONSTRAINTS.passwordMin"
        :maxlength="AUTH_CONSTRAINTS.passwordMax"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
      />
      <input
        v-if="mode !== 'login'"
        v-model="confirmPassword"
        type="password"
        placeholder="confirm password"
        required
        :minlength="AUTH_CONSTRAINTS.passwordMin"
        :maxlength="AUTH_CONSTRAINTS.passwordMax"
        autocomplete="new-password"
      />
      <template v-if="mode === 'register'">
        <input
          v-model="inviteCode"
          type="text"
          placeholder="invite code"
          required
          :minlength="AUTH_CONSTRAINTS.inviteCodeMin"
          :maxlength="AUTH_CONSTRAINTS.inviteCodeMax"
          autocapitalize="characters"
          spellcheck="false"
          @blur="inviteCode = normalizeInviteCode(inviteCode)"
        />
        <label class="test-notice-check">
          <input v-model="acceptTestNotice" type="checkbox" />
          <span>
            I understand this is an internal-only test build and I am acknowledging notice version
            <strong>{{ TEST_NOTICE_VERSION }}</strong>.
          </span>
        </label>
      </template>
      <input
        v-if="mode === 'reset'"
        v-model="recoveryCode"
        type="text"
        placeholder="recovery code"
        required
        :minlength="AUTH_CONSTRAINTS.recoveryCodeLength"
        autocapitalize="characters"
        spellcheck="false"
        @blur="recoveryCode = formatRecoveryCode(recoveryCode)"
      />
      <p class="small auth-help">{{ helperText }}</p>
      <button type="submit" class="form-btn" :disabled="loading">
        {{ loading ? 'Saving...' : submitLabel }}
      </button>
      <p v-if="displayError" class="status-danger small" style="margin-top: 4px;">{{ displayError }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  AUTH_CONSTRAINTS,
  formatRecoveryCode,
  normalizeInviteCode,
  normalizeRecoveryCode,
  normalizeUsername
} from '@penthouse/contracts';
import { TEST_NOTICE_VERSION } from '../testNotice';

const props = defineProps<{
  error: string;
  loading: boolean;
  registrationMode?: 'invite_only' | 'closed';
}>();

const emit = defineEmits<{
  (e: 'login', username: string, password: string): void;
  (e: 'register', username: string, password: string, invite: string): void;
  (e: 'reset-password', username: string, recoveryCode: string, newPassword: string): void;
  (e: 'mode-changed', mode: 'login' | 'register' | 'reset'): void;
}>();

const mode = ref<'login' | 'register' | 'reset'>('login');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const inviteCode = ref('PENTHOUSE-ALPHA');
const recoveryCode = ref('');
const acceptTestNotice = ref(false);
const localError = ref('');

const helperText = computed(() => {
  if (mode.value === 'register') {
    return `Username: ${AUTH_CONSTRAINTS.usernameMin}-${AUTH_CONSTRAINTS.usernameMax} chars using letters, numbers, ".", "_" or "-". Password: ${AUTH_CONSTRAINTS.passwordMin}-${AUTH_CONSTRAINTS.passwordMax} chars with no leading or trailing spaces.`
  }
  if (mode.value === 'reset') {
    return 'Use the recovery code you were shown at signup or first successful login. Resetting your password rotates that code.'
  }
  return 'Usernames are case-insensitive. Leading and trailing spaces are removed automatically.'
});

const submitLabel = computed(() => {
  if (mode.value === 'register') return 'Create account';
  if (mode.value === 'reset') return 'Reset password';
  return 'Login';
});

const displayError = computed(() => localError.value || props.error);

watch(mode, () => {
  localError.value = '';
  password.value = '';
  confirmPassword.value = '';
  acceptTestNotice.value = false;
  if (mode.value !== 'reset') {
    recoveryCode.value = '';
  }
  emit('mode-changed', mode.value);
}, { immediate: true });

function handleSubmit() {
  localError.value = '';

  if (mode.value !== 'login' && password.value !== confirmPassword.value) {
    localError.value = 'Password confirmation does not match';
    return;
  }

  if (mode.value === 'login') {
    emit('login', normalizeUsername(username.value), password.value);
    return;
  }

  if (mode.value === 'register') {
    if (!acceptTestNotice.value) {
      localError.value = 'You need to acknowledge the current test notice to create an account';
      return;
    }
    emit('register', normalizeUsername(username.value), password.value, normalizeInviteCode(inviteCode.value));
    return;
  }

  emit(
    'reset-password',
    normalizeUsername(username.value),
    normalizeRecoveryCode(recoveryCode.value),
    password.value
  );
}
</script>

<style scoped>
.auth-panel {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 24px;
}

.auth-mode-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border-radius: 20px;
}

.auth-mode-switcher .small-btn {
  width: 100%;
}

.auth-help {
  opacity: 0.72;
  line-height: 1.4;
  margin-top: 6px;
  margin-bottom: 12px;
}

/* Glass Line Inputs */
input {
  width: 100%;
  padding: 10px 0;
  background: transparent !important;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  border-radius: 0;
  font-size: 1.1rem;
  outline: none;
  transition: all 0.3s;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  margin-bottom: 14px;
}

input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--text-primary) !important;
  transition: background-color 5000s ease-in-out 0s;
}

input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
  text-shadow: none;
}

input:focus {
  border-bottom-color: var(--action-primary);
}

.test-notice-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
  margin-bottom: 12px;
  line-height: 1.35;
  font-size: 0.85rem;
}

.test-notice-check input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  padding: 0;
  border-radius: 4px;
  accent-color: var(--action-primary);
  flex: 0 0 auto;
}

.registration-closed-notice {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 204, 128, 0.22);
  background: rgba(255, 204, 128, 0.08);
  text-align: center;
  line-height: 1.4;
}

.registration-closed-notice p {
  margin: 0;
}

.registration-closed-notice p + p {
  margin-top: 6px;
  opacity: 0.72;
}
</style>
