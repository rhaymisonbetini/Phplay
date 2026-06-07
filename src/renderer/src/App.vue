<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from './stores/session'
import { useProjectStore } from './stores/project'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useSnippetPersistence } from './composables/useSnippetPersistence'
import { useCommandRegistry } from './composables/useCommandRegistry'
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
import CommandPalette from './components/CommandPalette.vue'
import type { ExecutionResult, Framework, RecentProject, SshConnectionConfig, SshSyncProgress } from './types/electron'
import { useAppLogs } from './composables/useAppLogs'

type ToastState =
  | { type: 'detecting' }
  | { type: 'detected'; framework: Framework; projectName: string }
  | { type: 'no-vendor'; projectName: string }
  | { type: 'not-php'; path: string }
  | null

type SidebarPanelType = 'explorer' | 'history' | 'snippets' | 'themes' | 'logs' | 'ai' | 'ssh'

const sessionStore = useSessionStore()
const projectStore = useProjectStore()
const { sessions } = storeToRefs(sessionStore)
const { commands, register, execute } = useCommandRegistry()

const phpVersions = ref<Array<{ path: string; version: string }>>([])
const selectedPhp = ref<string>('')
const showPhpConfig = ref(false)
const toastState = ref<ToastState>(null)
const lastMetrics = ref<{ timeMs: number; memKb: number } | null>(null)
const recentProjects = ref<RecentProject[]>([])
const lspReady = ref(false)
const lspState = ref<string>('stopped')
const activeSidebarPanel = ref<SidebarPanelType | null>(null)
const sidebarPanelRef = ref<InstanceType<typeof SidebarPanel> | null>(null)
const activeExecutionId = ref<string | null>(null)
const liveOutput = ref<string>('')
const showCommandPalette = ref(false)
const activeSshConnection = ref<SshConnectionConfig | null>(null)
const sshWorkspacePath = ref<string | null>(null)
const sshSyncProgress = ref<SshSyncProgress | null>(null)
const aiEnabled = ref(false)

// In SSH mode the editor must point Intelephense at the synced local cache, not
// the (absent) local project. Falls back to the local project path otherwise.
const editorProjectPath = computed(() =>
  activeSshConnection.value ? sshWorkspacePath.value : currentPath.value
)
const editorFramework = computed<Framework>(() =>
  activeSshConnection.value
    ? (activeSshConnection.value.framework ?? 'plain')
    : projectStore.framework
)

const activeSession = computed(() => sessionStore.activeSession)
const currentPath = computed(() => projectStore.currentProject?.path ?? null)
const currentName = computed(() => projectStore.currentProject?.name ?? null)

const { isSaved, restore } = useSnippetPersistence(sessions, currentPath)
const { add: addLog } = useAppLogs()

onMounted(async () => {
  // Listen for File > Open Project from Electron menu
  window.electronAPI.onMenuOpenProject(() => openProject())

  // Track real LSP state from main process
  window.electronAPI.onLspStateChanged(({ state, message }) => {
    lspState.value = state
    lspReady.value = state === 'ready'
    addLog({ category: 'lsp', level: state === 'error' ? 'error' : 'info', message: `state → ${state}`, detail: message })
  })

  // Track remote project sync progress (SSH code intelligence)
  window.electronAPI.onSshSyncProgress((payload) => {
    if (payload.connectionId !== activeSshConnection.value?.id) return
    sshSyncProgress.value = payload
    if (payload.phase === 'done' || payload.phase === 'error') {
      setTimeout(() => { sshSyncProgress.value = null }, payload.phase === 'error' ? 6000 : 1500)
    }
  })

  // Track active execution ID for cancel support
  window.electronAPI.onExecutionStarted(({ executionId }) => {
    activeExecutionId.value = executionId
    liveOutput.value = ''
    stdoutBuffer = ''
    addLog({ category: 'execution', level: 'info', message: `started`, detail: executionId })
  })

  // Accumulate streaming output chunks via RAF to avoid per-byte DOM updates
  let stdoutBuffer = ''
  let rafId: number | null = null
  window.electronAPI.onExecutionOutput(({ chunk, stream }) => {
    if (stream !== 'stdout') return
    stdoutBuffer += chunk
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      liveOutput.value += stdoutBuffer
      stdoutBuffer = ''
    })
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
  aiEnabled.value = await window.electronAPI.aiGetAutocompleteEnabled()
})

async function runCode(): Promise<void> {
  const session = activeSession.value
  if (!session || session.isRunning) return

  if (activeSshConnection.value) {
    await runCodeSsh(session)
  } else {
    await runCodeLocal(session)
  }
}

async function runCodeLocal(session: { id: string; code: string; isRunning: boolean }): Promise<void> {
  if (!selectedPhp.value) return

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
    sidebarPanelRef.value?.reloadHistory()
    addLog({
      category: result.exitCode !== 0 ? 'error' : 'execution',
      level: result.exitCode !== 0 ? 'error' : 'info',
      message: `local — completed in ${result.executionTimeMs}ms — exit ${result.exitCode}`,
      detail: result.stderr ? result.stderr.slice(0, 200) : undefined
    })
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
    activeExecutionId.value = null
  }
}

async function runCodeSsh(session: { id: string; code: string; isRunning: boolean }): Promise<void> {
  const ssh = activeSshConnection.value!
  sessionStore.setRunning(session.id, true)
  sessionStore.setOutput(session.id, null)
  liveOutput.value = ''
  lastMetrics.value = null

  try {
    const result = await window.electronAPI.sshExecute(session.code, ssh.id) as ExecutionResult
    sessionStore.setOutput(session.id, result)
    lastMetrics.value = { timeMs: result.executionTimeMs, memKb: 0 }
    addLog({
      category: result.exitCode !== 0 ? 'error' : 'execution',
      level: result.exitCode !== 0 ? 'error' : 'info',
      message: `SSH:${ssh.name} — completed in ${result.executionTimeMs}ms — exit ${result.exitCode}`,
      detail: result.stderr ? result.stderr.slice(0, 200) : undefined
    })
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

async function stopExecution(): Promise<void> {
  if (activeSshConnection.value) {
    await window.electronAPI.sshCancel()
  } else if (activeExecutionId.value) {
    await window.electronAPI.cancelExecution(activeExecutionId.value)
    activeExecutionId.value = null
  }
}

async function handleSshActivated(config: SshConnectionConfig | null): Promise<void> {
  activeSshConnection.value = config

  if (!config) {
    sshWorkspacePath.value = null
    sshSyncProgress.value = null
    lspReady.value = false
    lspState.value = 'stopped'
    window.electronAPI.lspStop()
    return
  }

  await syncRemoteWorkspace(config, false)
}

async function syncRemoteWorkspace(config: SshConnectionConfig, force: boolean): Promise<void> {
  lspReady.value = false
  lspState.value = 'stopped'

  if (!force) {
    const cached = await window.electronAPI.sshGetWorkspacePath(config.id)
    if (cached) {
      sshWorkspacePath.value = cached
      window.electronAPI.lspStart(cached)
      addLog({ category: 'lsp', level: 'info', message: `SSH:${config.name} — using cached remote index` })
      return
    }
  }

  sshSyncProgress.value = { connectionId: config.id, phase: 'connecting', message: 'Connecting…' }
  const result = await window.electronAPI.sshSyncWorkspace(config.id, force)

  // The connection may have been switched off while syncing.
  if (activeSshConnection.value?.id !== config.id) return

  if (result.ok && result.data) {
    sshWorkspacePath.value = result.data.localPath
    window.electronAPI.lspStart(result.data.localPath)
    addLog({ category: 'lsp', level: 'info', message: `SSH:${config.name} — remote project indexed` })
  } else {
    sshSyncProgress.value = { connectionId: config.id, phase: 'error', message: result.error?.message ?? 'Sync failed' }
    addLog({ category: 'error', level: 'error', message: `SSH:${config.name} — index failed`, detail: result.error?.message })
  }
}

async function reindexRemoteWorkspace(): Promise<void> {
  if (!activeSshConnection.value) return
  await syncRemoteWorkspace(activeSshConnection.value, true)
}

function loadSnippetFromHistory(code: string): void {
  const session = activeSession.value
  if (!session) return
  sessionStore.setCode(session.id, code)
}

function autoNameFromCode(code: string): string {
  const skip = /^(<\?php|\/\/|#|\/\*|\s*$)/
  for (const line of code.split('\n')) {
    const t = line.trim()
    if (!skip.test(t)) return t.length > 40 ? t.slice(0, 40) + '…' : t
  }
  return `Snippet ${new Date().toLocaleTimeString()}`
}

async function saveCurrentSnippet(): Promise<void> {
  const path = projectStore.currentProject?.path
  const code = activeSession.value?.code ?? ''
  if (!path || !code.trim()) return
  const name = autoNameFromCode(code)
  await window.electronAPI.snippetSave(path, name, code)
  sidebarPanelRef.value?.reloadSnippets()
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

// Register command palette entries
register({ id: 'open-project', label: 'Open Project', shortcut: 'Ctrl+O', handler: openProject })
register({ id: 'run-snippet', label: 'Run Current Snippet', shortcut: 'Ctrl+Enter', handler: runCode })
register({ id: 'stop-execution', label: 'Stop Execution', shortcut: 'Esc', handler: stopExecution })
register({ id: 'restart-lsp', label: 'Restart PHP Intelligence', handler: restartLsp })
register({ id: 'ssh-reindex', label: 'Reindex Remote Project (SSH)', handler: reindexRemoteWorkspace })
register({ id: 'clear-output', label: 'Clear Output', shortcut: 'Ctrl+Shift+C', handler: clearOutput })
register({ id: 'new-tab', label: 'New Tab', shortcut: 'Ctrl+T', handler: () => sessionStore.newSession() })
register({ id: 'close-tab', label: 'Close Tab', shortcut: 'Ctrl+W', handler: () => sessionStore.closeSession(sessionStore.activeSessionId) })

useKeyboardShortcuts([
  { key: 'Enter', ctrl: true, handler: runCode },
  { key: 'Escape', handler: stopExecution },
  { key: 'p', ctrl: true, shift: true, handler: () => { showCommandPalette.value = true } },
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
      :active-ssh="activeSshConnection"
    />

    <SessionTabBar />

    <div class="flex flex-1 overflow-hidden">
      <SidebarRail
        @panel-change="onSidebarPanelChange"
      />

      <!-- Sidebar panel (Explorer / History / Snippets / etc.) -->
      <Transition name="sidebar-slide">
        <SidebarPanel
          v-if="activeSidebarPanel"
          ref="sidebarPanelRef"
          :panel="activeSidebarPanel"
          :current-project-path="currentPath"
          :current-project-name="currentName"
          :current-framework="projectStore.framework"
          :recent-projects="recentProjects"
          :current-code="activeSession?.code"
          :last-error="activeSession?.output?.stderr || undefined"
          @open-project="openProject"
          @open-recent="openRecentProject"
          @remove-recent="removeRecentProject"
          @load-snippet="loadSnippetFromHistory"
          @ssh-activated="handleSshActivated"
          @ssh-reindex="reindexRemoteWorkspace"
          @autocomplete-changed="aiEnabled = $event"
          @close="activeSidebarPanel = null"
        />
      </Transition>

      <!-- Welcome screen: show when no project AND no active SSH -->
      <WelcomeScreen
        v-if="!projectStore.hasProject && !activeSshConnection"
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
            :can-run="(!!selectedPhp || !!activeSshConnection) && !!activeSession"
          :active-ssh="activeSshConnection"
          :ai-enabled="aiEnabled"
            :can-stop="!!activeExecutionId"
            :project-path="editorProjectPath"
            :lsp-ready="lspReady"
            :framework="editorFramework"
            :selected-php="selectedPhp"
            @update:code="sessionStore.setCode(sessionStore.activeSessionId, $event)"
            @run="runCode"
            @stop="stopExecution"
            @save-snippet="saveCurrentSnippet"
          />
        </template>

        <template #right>
          <OutputPanel
            :result="activeSession?.output ?? null"
            :is-running="activeSession?.isRunning ?? false"
            :live-output="liveOutput"
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
      :active-ssh="activeSshConnection"
      @open-project="openProject"
      @select-php="selectedPhp = $event; projectStore.updatePhpBinary($event)"
      @open-php-config="showPhpConfig = true"
      @restart-lsp="restartLsp"
    />

    <PhpConfigModal v-if="showPhpConfig" @close="showPhpConfig = false" @apply="applyCustomPhp" />

    <ProjectDetectionToast :state="toastState" @dismiss="toastState = null" />

    <!-- Remote project sync progress (SSH code intelligence) -->
    <Transition name="sidebar-slide">
      <div
        v-if="sshSyncProgress && sshSyncProgress.phase !== 'done'"
        class="fixed bottom-8 right-4 z-50 w-72 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2.5 shadow-lg"
      >
        <div class="flex items-center gap-2">
          <svg
            v-if="sshSyncProgress.phase !== 'error'"
            class="animate-spin shrink-0 text-accent"
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
          >
            <path d="M6 1a5 5 0 0 1 5 5" />
          </svg>
          <svg
            v-else
            class="shrink-0 text-error"
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
          >
            <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zM6 3.5v3M6 8.5h.01" />
          </svg>
          <span class="text-2xs font-semibold text-text-primary">
            {{ sshSyncProgress.phase === 'error' ? 'Remote index failed' : 'Indexing remote project' }}
          </span>
        </div>
        <p class="mt-1 text-2xs text-text-muted break-all">{{ sshSyncProgress.message }}</p>
        <div
          v-if="sshSyncProgress.phase === 'downloading' && sshSyncProgress.percent !== undefined"
          class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-bg-app"
        >
          <div class="h-full rounded-full bg-accent transition-all" :style="{ width: sshSyncProgress.percent + '%' }" />
        </div>
      </div>
    </Transition>

    <CommandPalette
      v-if="showCommandPalette"
      :commands="commands"
      @close="showCommandPalette = false"
      @execute="execute"
    />
  </div>
</template>
