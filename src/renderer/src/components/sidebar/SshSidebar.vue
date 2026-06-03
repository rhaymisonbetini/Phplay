<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SshConnectionConfig } from '../../types/electron'
import SshConnectionForm from '../ssh/SshConnectionForm.vue'

const emit = defineEmits<{
  'connection-activated': [config: SshConnectionConfig | null]
}>()

const connections = ref<SshConnectionConfig[]>([])
const showForm = ref(false)
const editingConnection = ref<SshConnectionConfig | null>(null)
const activeConnectionId = ref<string | null>(null)

async function load(): Promise<void> {
  connections.value = await window.electronAPI.sshList()
}

onMounted(load)

function openNew(): void {
  editingConnection.value = null
  showForm.value = true
}

function openEdit(conn: SshConnectionConfig): void {
  editingConnection.value = conn
  showForm.value = true
}

async function handleSaved(config: SshConnectionConfig): Promise<void> {
  showForm.value = false
  editingConnection.value = null
  await load()

  if (activeConnectionId.value === config.id) {
    emit('connection-activated', config)
  }
}

async function remove(id: string): Promise<void> {
  await window.electronAPI.sshDelete(id)
  if (activeConnectionId.value === id) {
    activeConnectionId.value = null
    emit('connection-activated', null)
  }
  await load()
}

function toggleActive(conn: SshConnectionConfig): void {
  if (activeConnectionId.value === conn.id) {
    activeConnectionId.value = null
    emit('connection-activated', null)
  } else {
    activeConnectionId.value = conn.id
    emit('connection-activated', conn)
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 overflow-hidden">
    <!-- List view -->
    <template v-if="!showForm">
      <div class="flex-1 overflow-y-auto py-2">
        <div v-if="connections.length === 0" class="px-3 py-4 text-center">
          <svg class="mx-auto mb-2 text-text-disabled" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <path d="M6 6h.01M6 18h.01" />
          </svg>
          <p class="text-2xs text-text-disabled mb-3">No SSH connections yet</p>
        </div>

        <div v-else class="space-y-0.5 px-2">
          <div
            v-for="conn in connections"
            :key="conn.id"
            class="group flex items-center gap-2 rounded px-2 py-2 cursor-pointer hover:bg-bg-elevated transition-colors"
            :class="{ 'bg-bg-elevated': activeConnectionId === conn.id }"
          >
            <!-- Color dot -->
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :style="{ background: conn.color }"
            />

            <!-- Info -->
            <div class="flex-1 min-w-0" @click="toggleActive(conn)">
              <p class="text-xs font-medium text-text-primary truncate">{{ conn.name }}</p>
              <p class="text-2xs text-text-disabled truncate">{{ conn.username }}@{{ conn.host }}:{{ conn.port }}</p>
            </div>

            <!-- Active badge -->
            <span
              v-if="activeConnectionId === conn.id"
              class="text-2xs text-green-400 font-medium shrink-0"
            >
              active
            </span>

            <!-- Actions -->
            <div class="hidden group-hover:flex gap-1 shrink-0">
              <button
                class="p-0.5 rounded text-text-disabled hover:text-text-primary transition-colors"
                title="Edit"
                @click.stop="openEdit(conn)"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7.5 1.5l2 2L3 10H1v-2L7.5 1.5z" />
                </svg>
              </button>
              <button
                class="p-0.5 rounded text-text-disabled hover:text-error transition-colors"
                title="Delete"
                @click.stop="remove(conn.id)"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 3h9M4 3V1.5h3V3M2 3l.5 6.5a.75.75 0 0 0 .75.75h5.5a.75.75 0 0 0 .75-.75L10 3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add button -->
      <div class="border-t border-border-subtle p-2">
        <button
          class="w-full flex items-center justify-center gap-1.5 rounded border border-border-subtle bg-bg-app py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          @click="openNew"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M5 1v8M1 5h8" />
          </svg>
          Add Connection
        </button>
      </div>
    </template>

    <!-- Form view -->
    <SshConnectionForm
      v-else
      :initial="editingConnection ?? undefined"
      @saved="handleSaved"
      @cancel="showForm = false"
    />
  </div>
</template>
