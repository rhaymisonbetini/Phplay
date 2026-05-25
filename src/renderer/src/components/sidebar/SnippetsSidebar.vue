<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SavedSnippet } from '../../types/electron'

const props = defineProps<{
  projectPath?: string | null
}>()

const emit = defineEmits<{
  'load-snippet': [code: string]
}>()

const snippets = ref<SavedSnippet[]>([])
const deletingId = ref<string | null>(null)

async function reload(): Promise<void> {
  if (!props.projectPath) { snippets.value = []; return }
  snippets.value = await window.electronAPI.snippetList(props.projectPath)
}

async function remove(id: string): Promise<void> {
  if (!props.projectPath) return
  deletingId.value = id
  await window.electronAPI.snippetDelete(props.projectPath, id)
  await reload()
  deletingId.value = null
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const diffDays = Math.floor((Date.now() - ts) / 86_400_000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays}d atrás`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

watch(() => props.projectPath, reload, { immediate: true })

defineExpose({ reload })
</script>

<template>
  <div class="snippets-sidebar">
    <div v-if="!projectPath" class="empty-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" class="text-text-disabled">
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <p>Abra um projeto para ver snippets salvos</p>
    </div>

    <div v-else-if="snippets.length === 0" class="empty-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" class="text-text-disabled">
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <p>Nenhum snippet salvo ainda</p>
      <span class="hint">Clique em <strong>Save</strong> no editor para salvar</span>
    </div>

    <ul v-else class="snippet-list">
      <li v-for="s in snippets" :key="s.id" class="snippet-item">
        <div class="snippet-info">
          <span class="snippet-name" :title="s.name">{{ s.name }}</span>
          <span class="snippet-date">{{ formatDate(s.savedAt) }}</span>
        </div>
        <div class="snippet-actions">
          <button class="action-btn load-btn" title="Carregar no editor" @click="emit('load-snippet', s.code)">
            Load
          </button>
          <button
            class="action-btn delete-btn"
            title="Excluir snippet"
            :disabled="deletingId === s.id"
            @click="remove(s.id)"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.snippets-sidebar { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  padding: 24px;
  text-align: center;
}
.empty-state p { font-size: 0.75rem; color: var(--text-disabled); }
.empty-state .hint { font-size: 0.7rem; color: var(--text-disabled); margin-top: -4px; }

.snippet-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  flex: 1;
}

.snippet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.1s;
}
.snippet-item:hover { background: var(--bg-elevated); }

.snippet-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.snippet-name {
  font-size: 0.75rem;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.snippet-date { font-size: 0.65rem; color: var(--text-disabled); }

.snippet-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s;
}

.load-btn {
  font-size: 0.65rem;
  color: var(--text-muted);
  padding: 2px 6px;
}
.load-btn:hover { border-color: var(--accent); color: var(--accent); }

.delete-btn {
  width: 20px;
  height: 20px;
  color: var(--text-disabled);
  padding: 0;
}
.delete-btn:hover { border-color: var(--error); color: var(--error); }
.delete-btn:disabled { opacity: 0.4; cursor: default; }
</style>
