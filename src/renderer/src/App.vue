<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from './stores/session'
import { useProjectStore } from './stores/project'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useSnippetPersistence } from './composables/useSnippetPersistence'
import AppTitleBar from './components/AppTitleBar.vue'
import SessionTabBar from './components/SessionTabBar.vue'
import SidebarRail from './components/SidebarRail.vue'
import SidebarPanel from './components/SidebarPanel.vue'
import SplitPane from './components/SplitPane.vue'
import EditorPanel from './components/EditorPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import AppStatusBar from './components/AppStatusBar.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import PhpConfigModal from './components/PhpConfigModal.vue'
import ProjectDetectionToast from './components/ProjectDetectionToast.vue'
import type { ExecutionResult, Framework, RecentProject } from './types/electron'

type ToastState =
  | { type: 'detecting' }
  | { type: 'detected'; framework: Framework; projectName: string }
  | { type: 'no-vendor'; projectName: string }
  | { type: 'not-php'; path: string }
  | null

type SidebarPanelType = 'explorer' | 'history' | 'snippets'

const sessionStore = useSessionStore()
const projectStore = useProjectStore()
const { sessions } = storeToRefs(sessionStore)

const phpVersions = ref<Array<{ path: string; version: string }>>([])
const selectedPhp = ref<string>('')
const showPhpConfig = ref(false)
const toastState = ref<ToastState>(null)
const lastMetrics = ref<{ timeMs: number; memKb: number } | null>(null)
const recentProjects = ref<RecentProject[]>([])
const lspReady = ref(false)
const lspState = ref<string>('stopped')
const activeSidebarPanel = ref<SidebarPanelType | null>(null)

const activeSession = computed(() => sessionStore.activeSession)
const currentPath = computed(() => projectStore.currentProject?.path ?? null)
const currentName = computed(() => projectStore.currentProject?.name ?? null)

const { isSaved, restore } = useSnippetPersistence(sessions, currentPath)

onMounted(async () => {
  // Listen for File > Open Project from Electron menu
  window.electronAPI.onMenuOpenProject(() => openProject())

  // Track real LSP state from main process
  window.electronAPI.onLspStateChanged(({ state }) => {
    lspState.value = state
    lspReady.value = state === 'ready'
  })

  try {
    phpVersions.value = await window.electronAPI.detectPhp()
    if (phpVersions.value.length > 0) {
      selectedPhp.value = phpVersions.value[0].path
    }
  } catch {
    // PHP not found
  }

  recentProjects.value = (await window.electronAPI.listRecentProjects()) as RecentProject[]
})

async function runCode(): Promise<void> {
  const session = activeSession.value
  if (!session || session.isRunning || !selectedPhp.value) return

  sessionStore.setRunning(session.id, true)
  sessionStore.setOutput(session.id, null)
  lastMetrics.value = null

  try {
    const result: ExecutionResult = await window.electronAPI.executePhp(session.code, {
      projectPath: projectStore.currentProject?.path ?? '',
      phpBinary: selectedPhp.value,
      framework: projectStore.framework,
      bootstrapPath: projectStore.currentProject?.bootstrapPath ?? undefined
    })
    sessionStore.setOutput(session.id, result)
    lastMetrics.value = { timeMs: result.executionTimeMs, memKb: result.memoryUsedKb }
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
  await loadProject(path)
}

async function loadProject(path: string): Promise<void> {
  toastState.value = { type: 'detecting' }

  try {
    const project = await projectStore.openProject(path, selectedPhp.value)

    await restore(path)

    await window.electronAPI.addRecentProject({
      path: project.path,
      name: project.name,
      framework: project.framework
    })
    recentProjects.value = (await window.electronAPI.listRecentProjects()) as RecentProject[]

    // Start LSP non-blocking — state updates come via onLspStateChanged
    lspReady.value = false
    lspState.value = 'stopped'
    window.electronAPI.lspStart(path)

    if (project.framework === 'laravel' && !project.hasVendor) {
      toastState.value = { type: 'no-vendor', projectName: project.name }
    } else {
      toastState.value = { type: 'detected', framework: project.framework, projectName: project.name }
    }
  } catch {
    toastState.value = { type: 'not-php', path }
  }

  setTimeout(() => { toastState.value = null }, 3500)
}

function clearOutput(): void {
  const session = activeSession.value
  if (session) sessionStore.setOutput(session.id, null)
}

async function openRecentProject(path: string): Promise<void> {
  await loadProject(path)
}

async function removeRecentProject(path: string): Promise<void> {
  await window.electronAPI.removeRecentProject(path)
  recentProjects.value = recentProjects.value.filter((p) => p.path !== path)
}

function applyCustomPhp(path: string): void {
  if (!phpVersions.value.find((p) => p.path === path)) {
    phpVersions.value.push({ path, version: 'custom' })
  }
  selectedPhp.value = path
  projectStore.updatePhpBinary(path)
}

function onSidebarPanelChange(panel: SidebarPanelType | null): void {
  activeSidebarPanel.value = panel
}

function restartLsp(): void {
  lspReady.value = false
  lspState.value = 'stopped'
  window.electronAPI.lspRestart()
}

useKeyboardShortcuts([
  { key: 'Enter', ctrl: true, handler: runCode },
  { key: 'c', ctrl: true, shift: true, handler: clearOutput },
  { key: 't', ctrl: true, handler: () => sessionStore.newSession() },
  { key: 'w', ctrl: true, handler: () => sessionStore.closeSession(sessionStore.activeSessionId) },
  { key: 'o', ctrl: true, handler: openProject }
])
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-bg-app text-text-primary select-none">
    <AppTitleBar
      :project-name="currentName ?? undefined"
      :session-name="activeSession?.name"
    />

    <SessionTabBar />

    <div class="flex flex-1 overflow-hidden">
      <SidebarRail
        @panel-change="onSidebarPanelChange"
        @open-settings="() => {}"
      />

      <!-- Sidebar panel (Explorer / History / Snippets) -->
      <SidebarPanel
        v-if="activeSidebarPanel"
        :panel="activeSidebarPanel"
        :current-project-path="currentPath"
        :current-project-name="currentName"
        :current-framework="projectStore.framework"
        :recent-projects="recentProjects"
        @open-project="openProject"
        @open-recent="openRecentProject"
        @remove-recent="removeRecentProject"
        @close="activeSidebarPanel = null"
      />

      <!-- Welcome screen: always show when no project is open -->
      <WelcomeScreen
        v-if="!projectStore.hasProject"
        :recent-projects="recentProjects"
        @open-project="openProject"
        @open-recent="openRecentProject"
        @remove-recent="removeRecentProject"
      />

      <SplitPane v-else class="flex-1">
        <template #left>
          <EditorPanel
            :code="activeSession?.code ?? '<?php\n\n'"
            :is-running="activeSession?.isRunning ?? false"
            :can-run="!!selectedPhp && !!activeSession"
            :project-path="currentPath"
            :lsp-ready="lspReady"
            :framework="projectStore.framework"
            :selected-php="selectedPhp"
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

    <AppStatusBar
      :framework="projectStore.framework"
      :php-versions="phpVersions"
      :selected-php="selectedPhp"
      :execution-time-ms="lastMetrics?.timeMs ?? null"
      :memory-used-kb="lastMetrics?.memKb ?? null"
      :project-path="projectStore.currentProject?.path"
      :project-name="currentName ?? undefined"
      :has-project="projectStore.hasProject"
      :is-saved="isSaved"
      :lsp-ready="lspReady"
      :lsp-state="lspState"
      @open-project="openProject"
      @select-php="selectedPhp = $event; projectStore.updatePhpBinary($event)"
      @open-php-config="showPhpConfig = true"
      @restart-lsp="restartLsp"
    />

    <PhpConfigModal v-if="showPhpConfig" @close="showPhpConfig = false" @apply="applyCustomPhp" />

    <ProjectDetectionToast :state="toastState" @dismiss="toastState = null" />
  </div>
</template>
