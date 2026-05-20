<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'open-project': []
  'open-settings': []
}>()

type SidebarItem = {
  id: string
  label: string
  title: string
  icon: string
  action?: () => void
}

const activeItem = ref<string | null>(null)

const items: SidebarItem[] = [
  {
    id: 'explorer',
    label: 'EX',
    title: 'Explorer',
    icon: 'explorer'
  },
  {
    id: 'history',
    label: 'HI',
    title: 'History (coming soon)',
    icon: 'history'
  },
  {
    id: 'snippets',
    label: 'SN',
    title: 'Snippets (coming soon)',
    icon: 'snippets'
  }
]

const bottomItems: SidebarItem[] = [
  {
    id: 'settings',
    label: 'SE',
    title: 'Settings',
    icon: 'settings',
    action: () => emit('open-settings')
  }
]

function selectItem(item: SidebarItem) {
  if (item.action) {
    item.action()
    return
  }
  activeItem.value = activeItem.value === item.id ? null : item.id
}
</script>

<template>
  <div
    class="flex flex-col items-center border-r border-border-subtle bg-bg-surface py-1"
    style="width: var(--sidebar-width)"
  >
    <!-- Top items -->
    <div class="flex flex-col items-center gap-1 w-full">
      <button
        v-for="item in items"
        :key="item.id"
        class="relative flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        :class="{
          'bg-bg-elevated text-text-primary after:absolute after:left-0 after:top-2 after:bottom-2 after:w-0.5 after:bg-accent after:rounded-r': activeItem === item.id
        }"
        :title="item.title"
        @click="selectItem(item)"
      >
        <!-- Explorer icon -->
        <template v-if="item.icon === 'explorer'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="1" width="7" height="4" rx="1" />
            <rect x="2" y="6" width="12" height="9" rx="1" />
          </svg>
        </template>

        <!-- History icon -->
        <template v-if="item.icon === 'history'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3.5l2 2" />
          </svg>
        </template>

        <!-- Snippets icon -->
        <template v-if="item.icon === 'snippets'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 4l-3 4 3 4" />
            <path d="M11 4l3 4-3 4" />
            <path d="M9.5 2l-3 12" />
          </svg>
        </template>
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Bottom items -->
    <div class="flex flex-col items-center gap-1 w-full">
      <button
        v-for="item in bottomItems"
        :key="item.id"
        class="flex h-9 w-9 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
        :title="item.title"
        @click="selectItem(item)"
      >
        <!-- Settings icon -->
        <template v-if="item.icon === 'settings'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
          </svg>
        </template>
      </button>
    </div>
  </div>
</template>
