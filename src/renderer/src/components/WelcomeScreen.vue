<script setup lang="ts">
import RecentProjectsList from './RecentProjectsList.vue'
import type { RecentProject } from '../types/electron'

defineProps<{
  recentProjects?: RecentProject[]
}>()

const emit = defineEmits<{
  'open-project': []
  'open-recent': [path: string]
  'remove-recent': [path: string]
}>()

const shortcuts = [
  { keys: ['Ctrl', 'Enter'], label: 'Run code' },
  { keys: ['Ctrl', 'T'], label: 'New session' },
  { keys: ['Ctrl', 'W'], label: 'Close session' },
  { keys: ['Ctrl', 'O'], label: 'Open project' }
]
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center bg-bg-app gap-6 animate-fade-in">
    <!-- Logo + name -->
    <div class="flex flex-col items-center gap-3">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-surface border border-border-subtle welcome-logo-card">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" class="welcome-logo-svg">
          <rect width="36" height="36" rx="8" fill="currentColor" fill-opacity="0.12" />
          <path d="M8 10h9a5 5 0 0 1 0 10H8V10z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none" />
          <path d="M17 20v7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          <path d="M24 10v17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
      </div>
      <div class="text-center">
        <h1 class="text-lg font-semibold text-text-primary tracking-wide">Phplay</h1>
        <p class="text-xs text-text-muted mt-0.5">Desktop PHP REPL</p>
      </div>
    </div>

    <!-- CTA -->
    <button class="btn-primary px-6 py-2.5 text-sm flex items-center gap-2" @click="emit('open-project')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 4.5h12M1 4.5l3-3h5l3 3M1 4.5v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" />
      </svg>
      Open Project
    </button>

    <!-- Recent projects -->
    <RecentProjectsList
      v-if="recentProjects && recentProjects.length > 0"
      :projects="recentProjects"
      @open="emit('open-recent', $event)"
      @remove="emit('remove-recent', $event)"
    />

    <!-- Keyboard shortcuts -->
    <div class="rounded-lg border border-border-subtle bg-bg-surface p-4 w-72">
      <p class="text-2xs text-text-disabled uppercase tracking-wider mb-3">Keyboard shortcuts</p>
      <div class="space-y-2">
        <div v-for="shortcut in shortcuts" :key="shortcut.label" class="flex items-center justify-between">
          <span class="text-xs text-text-muted">{{ shortcut.label }}</span>
          <div class="flex items-center gap-1">
            <kbd v-for="key in shortcut.keys" :key="key"
              class="rounded bg-bg-elevated border border-border-subtle px-1.5 py-0.5 text-2xs font-mono text-text-secondary">
              {{ key }}
            </kbd>
          </div>
        </div>
      </div>
    </div>

    <p class="text-2xs text-text-disabled">v0.1.0 · MIT License</p>
  </div>
</template>

<style scoped>
.welcome-logo-card {
  box-shadow: 0 0 24px rgba(157, 91, 255, 0.20), 0 4px 12px rgba(0, 0, 0, 0.35);
}
.welcome-logo-svg {
  color: var(--php-glow);
  filter: drop-shadow(0 0 6px rgba(157, 91, 255, 0.5));
}
</style>
