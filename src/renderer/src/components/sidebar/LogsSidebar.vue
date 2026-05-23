<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useAppLogs } from '../../composables/useAppLogs'
import type { LogCategory } from '../../types/log'

const { entries, clear, filtered } = useAppLogs()

const activeFilter = ref<LogCategory | 'all'>('all')
const searchQuery = ref('')
const listEl = ref<HTMLElement | null>(null)

const CATEGORIES: Array<{ value: LogCategory | 'all'; label: string }> = [
  { value: 'all',         label: 'All' },
  { value: 'execution',   label: 'Exec' },
  { value: 'lsp',         label: 'LSP' },
  { value: 'discovery',   label: 'Discovery' },
  { value: 'error',       label: 'Errors' },
  { value: 'performance', label: 'Perf' },
]

const CATEGORY_COLOR: Record<LogCategory | 'all', string> = {
  all:         'var(--text-muted)',
  execution:   'var(--neon-green)',
  lsp:         'var(--neon-blue)',
  discovery:   '#FFB86C',
  error:       '#FF5555',
  performance: 'var(--neon-purple)',
}

const visibleEntries = computed(() => {
  const base = filtered(activeFilter.value)
  if (!searchQuery.value) return base
  const q = searchQuery.value.toLowerCase()
  return base.filter((e) => e.message.toLowerCase().includes(q) || (e.detail ?? '').toLowerCase().includes(q))
})

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

watch(
  () => entries.value.length,
  () => nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
)
</script>

<template>
  <div class="logs-sidebar">
    <!-- Filter strip -->
    <div class="filter-strip">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.value"
        class="filter-chip"
        :class="{ 'filter-chip--active': activeFilter === cat.value }"
        :style="activeFilter === cat.value ? { color: CATEGORY_COLOR[cat.value], borderColor: CATEGORY_COLOR[cat.value] } : {}"
        @click="activeFilter = cat.value"
      >{{ cat.label }}</button>
      <button class="clear-btn" title="Clear logs" @click="clear">Clear</button>
    </div>

    <!-- Search -->
    <div class="search-wrap">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="Search logs…"
        spellcheck="false"
      />
    </div>

    <!-- Log list -->
    <div ref="listEl" class="log-list">
      <div v-if="visibleEntries.length === 0" class="empty">No logs yet.</div>
      <div
        v-for="entry in visibleEntries"
        :key="entry.id"
        class="log-entry"
      >
        <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
        <span class="log-badge" :style="{ color: CATEGORY_COLOR[entry.category] }">
          [{{ entry.category.toUpperCase() }}]
        </span>
        <span class="log-msg">{{ entry.message }}</span>
        <span v-if="entry.detail" class="log-detail">{{ entry.detail }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logs-sidebar { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.filter-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.filter-chip {
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid var(--border-default);
  font-size: 0.68rem;
  color: var(--text-muted);
  background: none;
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
}
.filter-chip:hover { color: var(--text-primary); }
.filter-chip--active { background: color-mix(in srgb, currentColor 10%, transparent); }

.clear-btn {
  margin-left: auto;
  font-size: 0.68rem;
  color: var(--text-muted);
  background: none;
  cursor: pointer;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
}
.clear-btn:hover { color: #FF5555; border-color: #FF5555; }

.search-wrap { padding: 6px 8px; border-bottom: 1px solid var(--border-subtle); }
.search-input {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.75rem;
  padding: 3px 7px;
  outline: none;
}
.search-input::placeholder { color: var(--text-disabled); }
.search-input:focus { border-color: var(--accent); }

.log-list { flex: 1; overflow-y: auto; padding: 4px 0; font-family: 'JetBrains Mono', monospace; }

.empty { padding: 16px 12px; font-size: 0.72rem; color: var(--text-disabled); text-align: center; }

.log-entry {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
  padding: 2px 8px;
  font-size: 0.7rem;
  line-height: 1.5;
}
.log-entry:hover { background: var(--bg-elevated); }

.log-time { color: var(--text-disabled); flex-shrink: 0; }
.log-badge { font-weight: 600; flex-shrink: 0; }
.log-msg { color: var(--text-primary); word-break: break-word; }
.log-detail { color: var(--text-muted); font-size: 0.65rem; width: 100%; padding-left: 0; word-break: break-all; }
</style>
