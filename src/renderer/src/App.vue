<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PhplayEditor from './components/PhplayEditor.vue'
import { useSessionStore } from './stores/session'

const sessionStore = useSessionStore()
const phpVersions = ref<Array<{ path: string; version: string }>>([])
const selectedPhp = ref<string>('')

onMounted(async () => {
  try {
    phpVersions.value = await window.electronAPI.detectPhp()
    if (phpVersions.value.length > 0) {
      selectedPhp.value = phpVersions.value[0].path
    }
  } catch {
    // PHP detection failed — user will need to configure manually
  }
})

async function runCode(): Promise<void> {
  const session = sessionStore.activeSession
  if (!session || session.isRunning || !selectedPhp.value) return

  sessionStore.setRunning(session.id, true)
  sessionStore.setOutput(session.id, '')

  try {
    const result = await window.electronAPI.executePhp(session.code, {
      projectPath: '',
      phpBinary: selectedPhp.value,
      framework: 'plain'
    })

    const output = result.stdout || result.stderr || '(no output)'
    const metrics = `\n\n─── ${result.executionTimeMs}ms ───`
    sessionStore.setOutput(session.id, output + metrics)
  } catch (err) {
    sessionStore.setOutput(session.id, `Error: ${String(err)}`)
  } finally {
    sessionStore.setRunning(session.id, false)
  }
}

async function openProject(): Promise<void> {
  const path = await window.electronAPI.openProjectDialog()
  if (path) {
    // Project detection will be implemented in issue T-11
    console.log('Project opened:', path)
  }
}
</script>

<template>
  <div class="flex h-screen flex-col bg-zinc-900 text-zinc-100 select-none">
    <!-- Title Bar -->
    <div
      class="flex h-8 shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4"
    >
      <span class="text-sm font-semibold tracking-wide text-zinc-200">Phplay</span>
      <span class="text-xs text-zinc-500">v0.1.0 — PHP REPL</span>
    </div>

    <!-- Tab Bar (single session for now, multiple tabs in T-09) -->
    <div
      class="flex h-8 shrink-0 items-center border-b border-zinc-700 bg-zinc-800/50 px-2 gap-1"
    >
      <div
        v-for="session in sessionStore.sessions"
        :key="session.id"
        class="flex items-center gap-1.5 rounded px-3 py-0.5 text-xs cursor-pointer transition-colors"
        :class="
          session.id === sessionStore.activeSessionId
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-300'
        "
        @click="sessionStore.activeSessionId = session.id"
      >
        <span>{{ session.name }}</span>
        <span
          v-if="session.isRunning"
          class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
        />
      </div>

      <button
        class="ml-1 rounded px-2 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        title="New session (Ctrl+T)"
        @click="sessionStore.newSession()"
      >
        +
      </button>
    </div>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Editor Panel -->
      <div class="flex flex-1 flex-col border-r border-zinc-700 min-w-0">
        <div
          class="flex shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-800/30 px-3 py-1"
        >
          <span class="text-xs text-zinc-500">Editor · PHP</span>
          <button
            class="rounded bg-emerald-700 px-3 py-0.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="sessionStore.activeSession?.isRunning || !selectedPhp"
            @click="runCode"
          >
            {{ sessionStore.activeSession?.isRunning ? 'Running…' : '▶ Run' }}
          </button>
        </div>

        <PhplayEditor
          v-if="sessionStore.activeSession"
          :model-value="sessionStore.activeSession.code"
          class="flex-1"
          @update:model-value="sessionStore.setCode(sessionStore.activeSessionId, $event)"
        />
      </div>

      <!-- Output Panel -->
      <div class="flex flex-1 flex-col min-w-0">
        <div
          class="flex shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-800/30 px-3 py-1"
        >
          <span class="text-xs text-zinc-500">Output</span>
          <button
            v-if="sessionStore.activeSession?.output"
            class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="sessionStore.setOutput(sessionStore.activeSessionId, '')"
          >
            clear
          </button>
        </div>

        <div class="flex-1 overflow-auto p-4 font-mono text-sm">
          <pre
            v-if="sessionStore.activeSession?.output"
            class="whitespace-pre-wrap break-words text-zinc-200"
            >{{ sessionStore.activeSession.output }}</pre
          >
          <div v-else class="flex h-full items-center justify-center">
            <p class="text-xs text-zinc-600">Press ▶ Run or Ctrl+Enter to execute</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div
      class="flex h-6 shrink-0 items-center justify-between border-t border-zinc-700 bg-zinc-800 px-4"
    >
      <div class="flex items-center gap-3">
        <span class="text-xs text-zinc-500">Plain PHP</span>
        <span v-if="selectedPhp" class="text-xs text-zinc-400">
          PHP {{ phpVersions.find((p) => p.path === selectedPhp)?.version ?? '?' }}
        </span>
        <span v-else class="text-xs text-red-400">No PHP detected</span>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          @click="openProject"
        >
          Open Project
        </button>

        <select
          v-if="phpVersions.length > 1"
          v-model="selectedPhp"
          class="bg-transparent text-xs text-zinc-400 border-none outline-none cursor-pointer"
        >
          <option v-for="php in phpVersions" :key="php.path" :value="php.path">
            PHP {{ php.version }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
