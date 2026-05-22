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
    class="flex flex-col items-center border-r border-border-subtle bg-bg-surface py-2"
    style="width: var(--sidebar-width)"
  >
    <!-- Top items -->
    <div class="flex flex-col items-center gap-1.5 w-full px-1">
      <!-- Explorer -->
      <button
        class="rail-btn relative"
        :class="activePanel === 'explorer' ? 'rail-btn--active' : ''"
        title="Explorer"
        @click="toggle('explorer')"
      >
        <span v-if="activePanel === 'explorer'" class="rail-indicator" />
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="1" width="7" height="4" rx="1" />
          <rect x="2" y="6" width="12" height="9" rx="1" />
        </svg>
      </button>

      <!-- History -->
      <button
        class="rail-btn relative"
        :class="activePanel === 'history' ? 'rail-btn--active' : ''"
        title="History"
        @click="toggle('history')"
      >
        <span v-if="activePanel === 'history'" class="rail-indicator" />
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3.5l2 2" />
        </svg>
      </button>

      <!-- Snippets -->
      <button
        class="rail-btn relative"
        :class="activePanel === 'snippets' ? 'rail-btn--active' : ''"
        title="Snippets"
        @click="toggle('snippets')"
      >
        <span v-if="activePanel === 'snippets'" class="rail-indicator" />
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 4l-3 4 3 4M11 4l3 4-3 4M9.5 2l-3 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1" />

    <!-- Bottom items -->
    <div class="flex flex-col items-center gap-1.5 w-full px-1">
      <button
        class="rail-btn"
        title="Settings"
        @click="emit('open-settings')"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.rail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: background 0.1s, color 0.1s;
}
.rail-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.rail-btn--active {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.rail-indicator {
  position: absolute;
  left: -1px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--neon-blue);
  border-radius: 0 2px 2px 0;
}
</style>
