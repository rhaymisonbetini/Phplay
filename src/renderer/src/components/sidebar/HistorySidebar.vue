<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { HistoryEntry } from '../../types/electron'

const props = defineProps<{
  projectPath: string | null
}>()

const emit = defineEmits<{
  'load-snippet': [code: string]
}>()

const entries = ref<HistoryEntry[]>([])
const search = ref('')
const loading = ref(false)

async function load(): Promise<void> {
  if (!props.projectPath) { entries.value = []; return }
  loading.value = true
  try {
    entries.value = await window.electronAPI.historyList(props.projectPath)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.projectPath, load)

// Expose reload so parent can call after execution
defineExpose({ reload: load })

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return q ? entries.value.filter((e) => e.code.toLowerCase().includes(q)) : entries.value
})

function groupLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff <= 7) return 'Last Week'
  return 'Older'
}

const grouped = computed(() => {
  const groups: Record<string, HistoryEntry[]> = {}
  const order = ['Today', 'Yesterday', 'Last Week', 'Older']
  for (const e of filtered.value) {
    const label = groupLabel(e.executedAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  }
  return order.filter((k) => groups[k]).map((k) => ({ label: k, items: groups[k] }))
})

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function snippet(code: string): string {
  const first = code.replace(/^<\?php\s*/i, '').trim().split('\n')[0]
  return first.length > 50 ? first.slice(0, 50) + '…' : first
}

async function toggleFavorite(e: HistoryEntry): Promise<void> {
  if (!props.projectPath) return
  const newVal = await window.electronAPI.historyToggleFavorite(props.projectPath, e.id)
  e.favorite = newVal
}

async function remove(id: string): Promise<void> {
  if (!props.projectPath) return
  await window.electronAPI.historyRemove(props.projectPath, id)
  entries.value = entries.value.filter((e) => e.id !== id)
}
</script>

<template>
  <div class="history-sidebar">
    <!-- Header -->
    <div class="panel-header justify-between">
      <span class="text-xs text-text-muted font-medium tracking-wide uppercase">History</span>
      <button v-if="entries.length > 0" class="btn-ghost text-2xs" @click="load">↻</button>
    </div>

    <!-- Search -->
    <div class="px-2 py-1.5 border-b border-border-subtle">
      <input
        v-model="search"
        type="text"
        placeholder="Search snippets…"
        class="search-input"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!projectPath" class="empty-state">
      Open a project to see history
    </div>
    <div v-else-if="loading" class="empty-state">
      <div class="spinner" style="width: 14px; height: 14px; border-width: 1.5px" />
    </div>
    <div v-else-if="filtered.length === 0" class="empty-state">
      {{ search ? 'No results' : 'No history yet' }}
    </div>

    <!-- Groups -->
    <div v-else class="history-list">
      <div v-for="group in grouped" :key="group.label" class="group">
        <div class="group-label">{{ group.label }}</div>

        <div
          v-for="entry in group.items"
          :key="entry.id"
          class="history-item group/item"
          @click="emit('load-snippet', entry.code)"
        >
          <div class="item-top">
            <span class="item-time">{{ timeLabel(entry.executedAt) }}</span>
            <span class="item-dur">{{ entry.durationMs }}ms</span>
          </div>
          <div class="item-code">{{ snippet(entry.code) }}</div>

          <div class="item-actions">
            <button
              class="action-btn"
              :class="{ 'text-yellow-400': entry.favorite, 'opacity-0 group-hover/item:opacity-100': !entry.favorite }"
              :title="entry.favorite ? 'Remove from favorites' : 'Add to favorites'"
              @click.stop="toggleFavorite(entry)"
            >
              {{ entry.favorite ? '★' : '☆' }}
            </button>
            <button
              class="action-btn opacity-0 group-hover/item:opacity-100"
              title="Remove"
              @click.stop="remove(entry.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-sidebar { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.search-input {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-primary);
  outline: none;
}
.search-input::placeholder { color: var(--text-disabled); }
.search-input:focus { border-color: var(--border-default); }

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-disabled);
  font-size: 0.75rem;
  padding: 24px;
  text-align: center;
}

.history-list { flex: 1; overflow-y: auto; }

.group-label {
  padding: 6px 12px 2px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-disabled);
}

.history-item {
  position: relative;
  padding: 6px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}
.history-item:hover { background: var(--bg-elevated); }

.item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
.item-time { font-size: 0.65rem; color: var(--text-disabled); font-family: 'JetBrains Mono', monospace; }
.item-dur  { font-size: 0.65rem; color: var(--text-disabled); }
.item-code { font-size: 0.75rem; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.item-actions { position: absolute; top: 6px; right: 8px; display: flex; gap: 4px; transition: opacity 0.1s; }
.action-btn { background: none; border: none; cursor: pointer; font-size: 0.75rem; color: var(--text-muted); padding: 0 2px; transition: color 0.1s, opacity 0.1s; }
.action-btn:hover { color: var(--text-primary); }
</style>
