<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PhpBinary } from '../types/electron'

const props = withDefaults(
  defineProps<{
    phpVersions: PhpBinary[]
    selectedPath: string
  }>(),
  {
    phpVersions: () => [],
    selectedPath: ''
  }
)

const emit = defineEmits<{
  'select': [path: string]
  'configure-manual': []
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedPhp = computed(() =>
  props.phpVersions.find((p) => p.path === props.selectedPath)
)

function select(php: PhpBinary) {
  emit('select', php.path)
  isOpen.value = false
}

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

// Close on click outside
function onDocumentClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    close()
  }
}

import { onMounted, onBeforeUnmount } from 'vue'
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger -->
    <button
      class="status-item-btn gap-1"
      :title="selectedPhp ? `Using: ${selectedPhp.path}` : 'No PHP detected'"
      @click.stop="toggle"
    >
      <span v-if="selectedPhp" class="text-2xs">
        PHP {{ selectedPhp.version }}
      </span>
      <span v-else class="text-2xs text-error">No PHP</span>

      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="currentColor"
        class="transition-transform"
        :class="{ 'rotate-180': isOpen }"
      >
        <path d="M1 2.5l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" />
      </svg>
    </button>

    <!-- Dropdown panel -->
    <Transition
      enter-active-class="transition-all duration-fast"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-fast"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute bottom-full left-0 mb-1 min-w-[220px] rounded border border-border-default bg-bg-overlay shadow-lg z-50 animate-slide-up"
      >
        <!-- Header -->
        <div class="px-3 py-2 border-b border-border-subtle">
          <p class="text-2xs text-text-disabled uppercase tracking-wider">PHP Interpreter</p>
        </div>

        <!-- PHP versions list -->
        <div class="max-h-48 overflow-y-auto py-1">
          <!-- No PHP found state -->
          <div v-if="phpVersions.length === 0" class="px-3 py-3 text-center">
            <div class="flex flex-col items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" class="text-error opacity-60">
                <circle cx="10" cy="10" r="8" />
                <path d="M10 6v5M10 13.5h.01" stroke-linecap="round" />
              </svg>
              <p class="text-xs text-text-muted">No PHP detected on PATH</p>
              <p class="text-2xs text-text-disabled">Install PHP or configure manually below</p>
            </div>
          </div>

          <!-- PHP versions -->
          <button
            v-for="php in phpVersions"
            :key="php.path"
            class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-elevated"
            :class="php.path === selectedPath ? 'text-text-primary' : 'text-text-secondary'"
            @click="select(php)"
          >
            <span
              class="h-1.5 w-1.5 rounded-full shrink-0"
              :class="php.path === selectedPath ? 'bg-accent' : 'bg-border'"
            />
            <div class="min-w-0">
              <div class="text-xs font-medium">PHP {{ php.version }}</div>
              <div class="truncate text-2xs text-text-disabled" :title="php.path">{{ php.path }}</div>
            </div>
            <svg
              v-if="php.path === selectedPath"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              class="ml-auto shrink-0 text-accent"
            >
              <path d="M1.5 5l2.5 2.5 4.5-5" />
            </svg>
          </button>
        </div>

        <!-- Divider + manual config -->
        <div class="border-t border-border-subtle">
          <button
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
            @click="emit('configure-manual'); isOpen = false"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
              <circle cx="6" cy="6" r="2" />
              <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.64 2.64l1.06 1.06M8.3 8.3l1.06 1.06M2.64 9.36l1.06-1.06M8.3 3.7l1.06-1.06" />
            </svg>
            Configure manually…
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
