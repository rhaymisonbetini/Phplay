<script setup lang="ts">
import type { RecentProject } from '../types/electron'

defineProps<{
  projects: RecentProject[]
}>()

const emit = defineEmits<{
  open: [path: string]
  remove: [path: string]
}>()

const frameworkColor: Record<string, string> = {
  laravel: 'text-red-400',
  symfony: 'text-zinc-400',
  wordpress: 'text-blue-400',
  plain: 'text-indigo-400'
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diffMs = now - ts
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="w-72 space-y-1">
    <p class="text-2xs text-text-disabled uppercase tracking-wider mb-2">Recent projects</p>

    <div
      v-for="project in projects"
      :key="project.path"
      class="group flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-bg-elevated cursor-pointer"
      :title="project.path"
      @click="emit('open', project.path)"
    >
      <!-- Framework dot -->
      <span
        class="h-2 w-2 shrink-0 rounded-full"
        :class="frameworkColor[project.framework] ?? 'text-text-muted'"
        style="background: currentColor"
      />

      <!-- Project info -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs text-text-primary">{{ project.name }}</p>
        <p class="truncate text-2xs text-text-disabled">{{ project.path }}</p>
      </div>

      <!-- Date -->
      <span class="shrink-0 text-2xs text-text-disabled">{{ formatDate(project.openedAt) }}</span>

      <!-- Remove button -->
      <button
        class="hidden shrink-0 rounded p-0.5 text-text-disabled hover:bg-bg-overlay hover:text-error group-hover:flex"
        title="Remove from recents"
        @click.stop="emit('remove', project.path)"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M1 1l6 6M7 1l-6 6" />
        </svg>
      </button>
    </div>
  </div>
</template>
