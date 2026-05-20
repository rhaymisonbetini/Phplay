<script setup lang="ts">
import { ref } from 'vue'

type Panel = 'explorer' | 'history' | 'snippets'

const emit = defineEmits<{
  'panel-change': [panel: Panel | null]
  'open-settings': []
}>()

const activePanel = ref<Panel | null>(null)

function toggle(panel: Panel): void {
  const next = activePanel.value === panel ? null : panel
  activePanel.value = next
  emit('panel-change', next)
}
</script>

<template>
  <div
    class="flex flex-col items-center border-r border-border-subtle bg-bg-surface py-1"
    style="width: var(--sidebar-width)"
  >
    <!-- Top items -->
    <div class="flex flex-col items-center gap-1 w-full">
      <!-- Explorer -->
      <button
        class="relative flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        :class="activePanel === 'explorer' && 'bg-bg-elevated text-text-primary after:absolute after:left-0 after:top-2 after:bottom-2 after:w-0.5 after:bg-accent after:rounded-r'"
        title="Explorer"
        @click="toggle('explorer')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="1" width="7" height="4" rx="1" />
          <rect x="2" y="6" width="12" height="9" rx="1" />
        </svg>
      </button>

      <!-- History -->
      <button
        class="relative flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        :class="activePanel === 'history' && 'bg-bg-elevated text-text-primary after:absolute after:left-0 after:top-2 after:bottom-2 after:w-0.5 after:bg-accent after:rounded-r'"
        title="History (em breve)"
        @click="toggle('history')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3.5l2 2" />
        </svg>
      </button>

      <!-- Snippets -->
      <button
        class="relative flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        :class="activePanel === 'snippets' && 'bg-bg-elevated text-text-primary after:absolute after:left-0 after:top-2 after:bottom-2 after:w-0.5 after:bg-accent after:rounded-r'"
        title="Snippets (em breve)"
        @click="toggle('snippets')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 4l-3 4 3 4M11 4l3 4-3 4M9.5 2l-3 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1" />

    <!-- Settings -->
    <div class="flex flex-col items-center gap-1 w-full">
      <button
        class="flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        title="Settings (em breve)"
        @click="emit('open-settings')"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      </button>
    </div>
  </div>
</template>
