<script setup lang="ts">
defineProps<{
  projectName?: string
  sessionName?: string
}>()
</script>

<template>
  <div
    class="drag-region flex h-8 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-app px-4"
    style="height: var(--titlebar-height)"
  >
    <div class="flex items-center gap-2 no-drag">
      <!-- Phplay logo mark -->
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-accent">
        <rect width="14" height="14" rx="3" fill="currentColor" fill-opacity="0.15" />
        <path
          d="M3 4h3.5a2 2 0 0 1 0 4H3V4z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          fill="none"
        />
        <path d="M6.5 8v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M9.5 4v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="text-xs font-semibold tracking-wide text-text-primary">Phplay</span>
    </div>

    <div class="text-2xs text-text-disabled">
      <span v-if="projectName" class="text-text-muted">{{ projectName }}</span>
      <span v-if="projectName && sessionName" class="mx-1 opacity-40">›</span>
      <span v-if="sessionName">{{ sessionName }}</span>
      <span v-else class="opacity-60">PHP REPL</span>
    </div>

    <div class="text-2xs text-text-disabled no-drag">v0.1.0</div>
  </div>
</template>
