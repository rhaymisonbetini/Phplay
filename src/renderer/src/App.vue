<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSessionStore } from './stores/session'
import AppTitleBar from './components/AppTitleBar.vue'
import SessionTabBar from './components/SessionTabBar.vue'
import SidebarRail from './components/SidebarRail.vue'
import SplitPane from './components/SplitPane.vue'
import EditorPanel from './components/EditorPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import AppStatusBar from './components/AppStatusBar.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'

const sessionStore = useSessionStore()

const phpVersions = ref<Array<{ path: string; version: string }>>([])
const selectedPhp = ref<string>('')
const projectPath = ref<string | null>(null)
const lastMetrics = ref<{ timeMs: number; memKb: number } | null>(null)

const activeSession = computed(() => sessionStore.activeSession)

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
  const session = activeSession.value
  if (!session || session.isRunning || !selectedPhp.value) return

  sessionStore.setRunning(session.id, true)
  sessionStore.setOutput(session.id, null)
  lastMetrics.value = null

  try {
    const result = await window.electronAPI.executePhp(session.code, {
      projectPath: projectPath.value ?? '',
      phpBinary: selectedPhp.value,
      framework: 'plain'
    })
    sessionStore.setOutput(session.id, result)
    lastMetrics.value = {
      timeMs: result.executionTimeMs,
      memKb: result.memoryUsedKb
    }
  } catch (err) {
    sessionStore.setOutput(session.id, {
      stdout: '',
      stderr: String(err),
      exitCode: 1,
      executionTimeMs: 0,
      memoryUsedKb: 0
    })
  } finally {
    sessionStore.setRunning(session.id, false)
  }
}

async function openProject(): Promise<void> {
  const path = await window.electronAPI.openProjectDialog()
  if (path) {
    projectPath.value = path
  }
}

function clearOutput(): void {
  const session = activeSession.value
  if (session) sessionStore.setOutput(session.id, null)
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-bg-app text-text-primary select-none">
    <!-- Title bar -->
    <AppTitleBar
      :project-name="projectPath ? projectPath.split('/').pop() : undefined"
      :session-name="activeSession?.name"
    />

    <!-- Tab bar -->
    <SessionTabBar />

    <!-- Main content area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar rail -->
      <SidebarRail @open-project="openProject" @open-settings="() => {}" />

      <!-- Welcome screen or editor/output split -->
      <WelcomeScreen v-if="!projectPath && phpVersions.length === 0" @open-project="openProject" />

      <SplitPane v-else class="flex-1">
        <template #left>
          <EditorPanel
            :code="activeSession?.code ?? '<?php\n\n'"
            :is-running="activeSession?.isRunning ?? false"
            :can-run="!!selectedPhp && !!activeSession"
            @update:code="sessionStore.setCode(sessionStore.activeSessionId, $event)"
            @run="runCode"
          />
        </template>

        <template #right>
          <OutputPanel
            :result="activeSession?.output ?? null"
            :is-running="activeSession?.isRunning ?? false"
            @clear="clearOutput"
          />
        </template>
      </SplitPane>
    </div>

    <!-- Status bar -->
    <AppStatusBar
      framework="plain"
      :php-versions="phpVersions"
      :selected-php="selectedPhp"
      :execution-time-ms="lastMetrics?.timeMs ?? null"
      :memory-used-kb="lastMetrics?.memKb ?? null"
      :project-path="projectPath ?? undefined"
      @open-project="openProject"
      @select-php="selectedPhp = $event"
    />
  </div>
</template>
