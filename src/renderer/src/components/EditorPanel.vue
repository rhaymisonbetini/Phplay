<script setup lang="ts">
import { computed } from 'vue'
import PhplayEditor from './PhplayEditor.vue'

const props = defineProps<{
  code: string
  isRunning: boolean
  canRun: boolean
  projectPath?: string | null
  lspReady?: boolean
  framework?: string
  selectedPhp?: string
  canStop?: boolean
}>()

const emit = defineEmits<{
  'update:code': [value: string]
  run: []
  stop: []
}>()

const runLabel = computed(() => (props.isRunning ? 'Running…' : '▶ Run'))
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Panel header -->
    <div class="panel-header justify-between">
      <div class="flex items-center gap-2 text-xs text-text-muted">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
          <path d="M2 3l4 3-4 3M6 9h4" />
        </svg>
        <span>Editor · PHP</span>
      </div>

      <Transition name="fade" mode="out-in">
        <button
          v-if="isRunning && canStop"
          key="stop"
          class="btn-primary flex items-center gap-1.5 !bg-error hover:!bg-red-600"
          title="Stop execution (Esc)"
          @click="emit('stop')"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><rect width="8" height="8" rx="1"/></svg>
          Stop
        </button>
        <button
          v-else
          key="run"
          class="btn-primary flex items-center gap-1.5"
          :class="{ 'running-pulse': isRunning }"
          :disabled="isRunning || !canRun"
          :title="canRun ? 'Run code (Ctrl+Enter)' : 'No PHP interpreter detected'"
          @click="emit('run')"
        >
          <span
            v-if="isRunning"
            class="spinner"
            style="width: 8px; height: 8px; border-width: 1.5px"
          />
          {{ runLabel }}
        </button>
      </Transition>
    </div>

    <!-- Monaco Editor -->
    <PhplayEditor
      :model-value="code"
      :project-path="projectPath"
      :lsp-ready="lspReady ?? false"
      :framework="framework"
      :selected-php="selectedPhp"
      class="flex-1 overflow-hidden"
      @update:model-value="emit('update:code', $event)"
      @run="emit('run')"
    />
  </div>
</template>
