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
import PhpConfigModal from './components/PhpConfigModal.vue'
import ProjectDetectionToast from './components/ProjectDetectionToast.vue'
import type { ExecutionResult } from './types/electron'

type Framework = 'laravel' | 'symfony' | 'wordpress' | 'plain'

type ToastState =
  | { type: 'detecting' }
  | { type: 'detected'; framework: Framework; projectName: string }
  | { type: 'no-vendor'; projectName: string }
  | { type: 'not-php'; path: string }
  | null

const sessionStore = useSessionStore()

const phpVersions = ref<Array<{ path: string; version: string }>>([])
const selectedPhp = ref<string>('')
const projectPath = ref<string | null>(null)
const projectFramework = ref<Framework>('plain')
const showPhpConfig = ref(false)
const toastState = ref<ToastState>(null)
const lastMetrics = ref<{ timeMs: number; memKb: number } | null>(null)

const activeSession = computed(() => sessionStore.activeSession)

onMounted(async () => {
  try {
    phpVersions.value = await window.electronAPI.detectPhp()
    if (phpVersions.value.length > 0) {
      selectedPhp.value = phpVersions.value[0].path
    }
  } catch {
    // PHP not found — user will configure manually
  }
})

async function runCode(): Promise<void> {
  const session = activeSession.value
  if (!session || session.isRunning || !selectedPhp.value) return

  sessionStore.setRunning(session.id, true)
  sessionStore.setOutput(session.id, null)
  lastMetrics.value = null

  try {
    const result: ExecutionResult = await window.electronAPI.executePhp(session.code, {
      projectPath: projectPath.value ?? '',
      phpBinary: selectedPhp.value,
      framework: projectFramework.value
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
  if (!path) return

  projectPath.value = path
  const projectName = path.split('/').pop() ?? path

  // Show detecting toast
  toastState.value = { type: 'detecting' }

  // Simulate framework detection (real detection will be in issue T-11)
  await new Promise((r) => setTimeout(r, 600))

  // For now, default to plain PHP (real detection in T-11 / FrameworkDetector.ts)
  projectFramework.value = 'plain'
  toastState.value = { type: 'detected', framework: 'plain', projectName }

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    toastState.value = null
  }, 3000)
}

function clearOutput(): void {
  const session = activeSession.value
  if (session) sessionStore.setOutput(session.id, null)
}

function applyCustomPhp(path: string): void {
  // Add custom PHP path to the list if not already there
  if (!phpVersions.value.find((p) => p.path === path)) {
    phpVersions.value.push({ path, version: 'custom' })
  }
  selectedPhp.value = path
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
      <WelcomeScreen
        v-if="!projectPath && phpVersions.length === 0"
        @open-project="openProject"
      />

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
      :framework="projectFramework"
      :php-versions="phpVersions"
      :selected-php="selectedPhp"
      :execution-time-ms="lastMetrics?.timeMs ?? null"
      :memory-used-kb="lastMetrics?.memKb ?? null"
      :project-path="projectPath ?? undefined"
      @open-project="openProject"
      @select-php="selectedPhp = $event"
      @open-php-config="showPhpConfig = true"
    />

    <!-- PHP Config Modal (Issue #5) -->
    <PhpConfigModal
      v-if="showPhpConfig"
      @close="showPhpConfig = false"
      @apply="applyCustomPhp"
    />

    <!-- Project Detection Toast (Issue #6) -->
    <ProjectDetectionToast
      :state="toastState"
      @dismiss="toastState = null"
    />
  </div>
</template>
