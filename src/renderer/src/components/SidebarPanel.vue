<script setup lang="ts">
import { ref } from 'vue'
import type { RecentProject } from '../types/electron'
import HistorySidebar from './sidebar/HistorySidebar.vue'
import ThemeSidebar from './sidebar/ThemeSidebar.vue'

const props = defineProps<{
  panel: 'explorer' | 'history' | 'snippets' | 'themes'
  currentProjectPath?: string | null
  currentProjectName?: string | null
  currentFramework?: string
  recentProjects?: RecentProject[]
}>()

const emit = defineEmits<{
  'open-project': []
  'open-recent': [path: string]
  'remove-recent': [path: string]
  'load-snippet': [code: string]
  close: []
}>()

const historySidebar = ref<InstanceType<typeof HistorySidebar> | null>(null)

defineExpose({ reloadHistory: () => historySidebar.value?.reload() })

const frameworkColor: Record<string, string> = {
  laravel: '#f87171',
  symfony: '#a1a1aa',
  wordpress: '#60a5fa',
  plain: '#818cf8'
}

function formatDate(ts: number): string {
  const diffDays = Math.floor((Date.now() - ts) / 86_400_000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays}d atrás`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col border-r border-border-subtle bg-bg-surface" style="width: 240px; min-width: 200px;">
    <!-- Panel header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
      <span class="text-2xs font-semibold uppercase tracking-widest text-text-disabled">
        {{ panel === 'explorer' ? 'Explorer' : panel === 'history' ? 'History' : panel === 'themes' ? 'Theme' : 'Snippets' }}
      </span>
      <button
        class="rounded p-0.5 text-text-disabled hover:text-text-muted transition-colors"
        title="Close panel"
        @click="emit('close')"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
    </div>

    <!-- ── EXPLORER ── -->
    <template v-if="panel === 'explorer'">
      <div class="flex-1 overflow-y-auto py-2">

        <!-- Current project section -->
        <div class="px-3 mb-1">
          <p class="text-2xs font-semibold uppercase tracking-widest text-text-disabled mb-2">
            Projeto atual
          </p>

          <div v-if="currentProjectPath" class="rounded bg-bg-elevated border border-border-subtle p-2.5 mb-3">
            <div class="flex items-center gap-1.5 mb-1">
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :style="{ background: frameworkColor[currentFramework ?? 'plain'] ?? '#818cf8' }"
              />
              <span class="text-xs font-medium text-text-primary truncate">{{ currentProjectName }}</span>
            </div>
            <p class="text-2xs text-text-disabled truncate" :title="currentProjectPath">
              {{ currentProjectPath }}
            </p>
          </div>

          <div v-else class="rounded border border-dashed border-border-subtle p-2.5 mb-3 text-center">
            <p class="text-2xs text-text-disabled mb-2">Nenhum projeto aberto</p>
          </div>

          <button
            class="w-full flex items-center justify-center gap-1.5 rounded border border-border-subtle bg-bg-app py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
            @click="emit('open-project')"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 3.5h9M1 3.5l2.5-2.5h3l2.5 2.5M1 3.5v5.5a.75.75 0 0 0 .75.75h8.5A.75.75 0 0 0 10.25 9V3.5" />
            </svg>
            Abrir projeto
          </button>
        </div>

        <!-- Recent projects section -->
        <div v-if="recentProjects && recentProjects.length > 0" class="px-3 mt-3">
          <p class="text-2xs font-semibold uppercase tracking-widest text-text-disabled mb-2">
            Recentes
          </p>
          <div class="space-y-0.5">
            <div
              v-for="project in recentProjects"
              :key="project.path"
              class="group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-bg-elevated transition-colors"
              :title="project.path"
              :class="{ 'bg-bg-elevated': project.path === currentProjectPath }"
              @click="emit('open-recent', project.path)"
            >
              <span
                class="h-1.5 w-1.5 shrink-0 rounded-full"
                :style="{ background: frameworkColor[project.framework] ?? '#818cf8' }"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs" :class="project.path === currentProjectPath ? 'text-accent font-medium' : 'text-text-primary'">
                  {{ project.name }}
                </p>
                <p class="truncate text-2xs text-text-disabled">{{ formatDate(project.openedAt) }}</p>
              </div>
              <button
                class="hidden shrink-0 rounded p-0.5 text-text-disabled hover:text-error group-hover:flex"
                title="Remover dos recentes"
                @click.stop="emit('remove-recent', project.path)"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M1 1l6 6M7 1l-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!currentProjectPath" class="px-3 mt-3">
          <p class="text-2xs text-text-disabled italic">Nenhum projeto recente.</p>
        </div>
      </div>
    </template>

    <!-- ── HISTORY ── -->
    <template v-else-if="panel === 'history'">
      <HistorySidebar
        ref="historySidebar"
        :project-path="props.currentProjectPath ?? null"
        @load-snippet="emit('load-snippet', $event)"
      />
    </template>

    <!-- ── THEMES ── -->
    <template v-else-if="panel === 'themes'">
      <ThemeSidebar />
    </template>

    <!-- ── SNIPPETS — coming soon ── -->
    <template v-else>
      <div class="flex flex-1 flex-col items-center justify-center gap-2 text-center px-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" class="text-text-disabled">
          <path d="M9 6l-5 8 5 8M19 6l5 8-5 8M16 4l-4 20" />
        </svg>
        <p class="text-xs text-text-disabled">Em breve</p>
      </div>
    </template>
  </div>
</template>
