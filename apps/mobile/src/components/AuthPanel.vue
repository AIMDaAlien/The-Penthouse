<template>
  <section class="card auth-panel">
    <div class="row" style="margin-bottom: 15px;">
      <button :class="mode === 'login' ? '' : 'secondary'" @click="mode = 'login'">Login</button>
      <button :class="mode === 'register' ? '' : 'secondary'" @click="mode = 'register'">Register</button>
    </div>

    <form class="list" @submit.prevent="handleSubmit">
      <input v-model="username" type="text" placeholder="username" required minlength="3" />
      <input v-model="password" type="password" placeholder="password" required minlength="10" />
      <input v-if="mode === 'register'" v-model="inviteCode" type="text" placeholder="invite code" required minlength="6" />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Saving...' : (mode === 'login' ? 'Login' : 'Create account') }}
      </button>
      <p v-if="error" class="status-danger small" style="margin-top: 4px;">{{ error }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  error: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'login', username: string, password: string): void;
  (e: 'register', username: string, password: string, invite: string): void;
}>();

const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const inviteCode = ref('PENTHOUSE-ALPHA');

function handleSubmit() {
  if (mode.value === 'login') {
    emit('login', username.value, password.value);
  } else {
    emit('register', username.value, password.value, inviteCode.value);
  }
}
</script>

<style scoped>
.auth-panel {
  max-width: 400px;
  margin: 40px auto;
}
</style>
