<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSessionStore } from '../stores/session'

const sessionStore = useSessionStore()

const tabsContainer = ref<HTMLElement | null>(null)

const tabs = computed(() => sessionStore.sessions)
const activeId = computed(() => sessionStore.activeSessionId)

function selectTab(id: string) {
  sessionStore.activeSessionId = id
}

function closeTab(e: MouseEvent, id: string) {
  e.stopPropagation()
  if (sessionStore.sessions.length === 1) return
  sessionStore.closeSession(id)
}

function addTab() {
  sessionStore.newSession()
}
</script>

<template>
  <div
    class="flex shrink-0 items-center border-b border-border-subtle bg-bg-surface"
    style="height: var(--tabbar-height)"
  >
    <!-- Tabs -->
    <div
      ref="tabsContainer"
      class="flex flex-1 items-center overflow-x-auto overflow-y-hidden"
      style="scrollbar-width: none"
    >
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="group relative flex h-full min-w-0 max-w-[160px] shrink-0 cursor-pointer items-center gap-2 border-r border-border-subtle px-3 transition-colors"
        :class="
          tab.id === activeId
            ? 'bg-bg-elevated text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-accent'
            : 'text-text-muted hover:bg-bg-elevated/50 hover:text-text-secondary'
        "
        :title="tab.name"
        @click="selectTab(tab.id)"
      >
        <!-- Running indicator -->
        <span
          v-if="tab.isRunning"
          class="spinner shrink-0"
          style="width: 8px; height: 8px; border-width: 1.5px"
        />
        <span v-else class="h-2 w-2 shrink-0 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />

        <span class="truncate text-xs">{{ tab.name }}</span>

        <!-- Close button -->
        <button
          v-if="tabs.length > 1"
          class="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-disabled opacity-0 transition-all hover:bg-bg-overlay hover:text-text-primary group-hover:opacity-100"
          :class="{ 'opacity-100': tab.id === activeId }"
          title="Close tab"
          @click="closeTab($event, tab.id)"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
          </svg>
        </button>
      </div>
    </div>

    <!-- New tab button -->
    <button
      class="flex h-full w-8 shrink-0 items-center justify-center text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary border-l border-border-subtle"
      title="New session (Ctrl+T)"
      @click="addTab"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M6 1v10M1 6h10" />
      </svg>
    </button>
  </div>
</template>
