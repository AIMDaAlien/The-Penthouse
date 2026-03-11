<template>
  <div v-if="visible" class="gif-overlay" @click.self="$emit('close')">
    <div class="gif-modal">
      <div class="gif-header">
        <strong>GIFs</strong>
        <button class="ghost-btn" type="button" @click="$emit('close')">Close</button>
      </div>

      <div class="gif-tabs">
        <button
          v-for="provider in providers"
          :key="provider"
          type="button"
          class="tab-btn"
          :class="{ active: activeProvider === provider }"
          @click="setProvider(provider)"
        >
          {{ provider.toUpperCase() }}
        </button>
      </div>

      <div class="gif-search">
        <input
          v-model="query"
          type="text"
          :placeholder="`Search ${activeProvider.toUpperCase()}`"
          autocomplete="off"
        />
      </div>

      <div v-if="loading" class="gif-state small">Loading GIFs...</div>
      <div v-else-if="error" class="gif-state status-danger small">{{ error }}</div>
      <div v-else-if="results.length === 0" class="gif-state small">No GIFs found.</div>

      <div v-else class="gif-grid">
        <button
          v-for="gif in results"
          :key="`${gif.provider}-${gif.id}`"
          type="button"
          class="gif-tile"
          @click="$emit('select', gif)"
        >
          <img :src="gif.previewUrl" :alt="gif.title || `${gif.provider} gif`" loading="lazy" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { GifProvider, GifResult } from '@penthouse/contracts';
import { getTrendingGifs, searchGifs } from '../services/http';

const props = defineProps<{
  visible: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'select', gif: GifResult): void;
}>();

const providers: GifProvider[] = ['giphy', 'klipy'];
const activeProvider = ref<GifProvider>('giphy');
const query = ref('');
const results = ref<GifResult[]>([]);
const loading = ref(false);
const error = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function loadTrending(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    results.value = (await getTrendingGifs(activeProvider.value)).results;
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'Failed to load GIFs';
    results.value = [];
  } finally {
    loading.value = false;
  }
}

async function runSearch(): Promise<void> {
  const trimmed = query.value.trim();
  if (!trimmed) {
    await loadTrending();
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    results.value = (await searchGifs(activeProvider.value, trimmed)).results;
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'Failed to search GIFs';
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function setProvider(provider: GifProvider): void {
  if (activeProvider.value === provider) return;
  activeProvider.value = provider;
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;
    void loadTrending();
  }
);

watch(activeProvider, () => {
  if (!props.visible) return;
  void runSearch();
});

watch(query, () => {
  if (!props.visible) return;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void runSearch();
  }, 250);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.gif-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.78);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 30;
}

.gif-modal {
  width: min(100%, 720px);
  max-height: 75vh;
  background: linear-gradient(180deg, rgba(22, 33, 84, 0.98), rgba(8, 15, 42, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px 20px 0 0;
  padding: 16px;
  overflow: auto;
}

.gif-header,
.gif-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.gif-tabs {
  justify-content: flex-start;
  margin-top: 14px;
}

.tab-btn,
.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.8rem;
  width: auto;
  min-width: 0;
}

.tab-btn.active {
  background: rgba(114, 214, 255, 0.18);
  border-color: rgba(114, 214, 255, 0.45);
}

.gif-search {
  margin-top: 14px;
}

.gif-search input {
  width: 100%;
}

.gif-state {
  padding: 14px 2px;
}

.gif-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.gif-tile {
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  min-height: 120px;
}

.gif-tile img {
  width: 100%;
  height: 100%;
  min-height: 120px;
  object-fit: cover;
  display: block;
}
</style>
