<template>
  <section class="card auth-panel">
    <div class="auth-mode-switcher" style="margin-bottom: 15px;">
      <button :class="mode === 'login' ? '' : 'secondary'" @click="mode = 'login'">Login</button>
      <button :class="mode === 'register' ? '' : 'secondary'" @click="mode = 'register'">Register</button>
      <button :class="mode === 'reset' ? '' : 'secondary'" @click="mode = 'reset'">Reset</button>
    </div>

    <form class="list" @submit.prevent="handleSubmit">
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
      <input
        v-if="mode === 'register'"
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
      <label v-if="mode === 'register'" class="test-notice-check">
        <input v-model="acceptTestNotice" type="checkbox" />
        <span>
          I understand this is an internal-only test build and I am acknowledging notice version
          <strong>{{ TEST_NOTICE_VERSION }}</strong>.
        </span>
      </label>
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
}>();

const emit = defineEmits<{
  (e: 'login', username: string, password: string): void;
  (e: 'register', username: string, password: string, invite: string): void;
  (e: 'reset-password', username: string, recoveryCode: string, newPassword: string): void;
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
});

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
  max-width: 400px;
  margin: 40px auto;
  width: min(100%, 400px);
}

.auth-mode-switcher {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.auth-mode-switcher button {
  min-width: 0;
}

.auth-help {
  opacity: 0.72;
  line-height: 1.4;
}

.test-notice-check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(140, 216, 255, 0.16);
  background: rgba(15, 18, 34, 0.72);
  color: var(--text);
  line-height: 1.4;
}

.test-notice-check input[type='checkbox'] {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  padding: 0;
  border-radius: 6px;
  accent-color: var(--accent);
  flex: 0 0 auto;
}

@media (max-width: 420px) {
  .auth-panel {
    margin: 24px auto 0;
  }

  .auth-mode-switcher {
    gap: 8px;
  }

  .auth-mode-switcher button {
    padding: 10px 8px;
    font-size: 0.85rem;
  }
}
</style>
