<template>
  <section class="card auth-panel">
    <div class="row" style="margin-bottom: 15px;">
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
      <button type="submit" :disabled="loading">
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
}

.auth-help {
  opacity: 0.72;
  line-height: 1.4;
}
</style>
