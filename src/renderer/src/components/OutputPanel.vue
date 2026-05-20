<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { ExecutionResult } from '../types/electron'

const props = defineProps<{
  result: ExecutionResult | null
  isRunning: boolean
}>()

const emit = defineEmits<{
  clear: []
}>()

const outputContainer = ref<HTMLElement | null>(null)

const hasOutput = computed(() => props.result !== null)
const hasError = computed(
  () => props.result && (props.result.exitCode !== 0 || props.result.stderr || props.result.error)
)
const hasStdout = computed(() => props.result && props.result.stdout)

const formattedMemory = computed(() => {
  if (!props.result) return null
  const kb = props.result.memoryUsedKb
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)}MB`
  return `${kb}KB`
})

// Parse PHP error from stderr
const phpError = computed(() => {
  if (!props.result?.stderr) return null
  const stderr = props.result.stderr

  // Match PHP error format: "PHP Fatal error: ... in file.php on line N"
  const errorMatch = stderr.match(/PHP\s+([\w\s]+):\s+(.*?)\s+in\s+(.*?)\s+on\s+line\s+(\d+)/i)
  if (errorMatch) {
    return {
      type: errorMatch[1].trim(),
      message: errorMatch[2].trim(),
      file: errorMatch[3].trim(),
      line: parseInt(errorMatch[4]),
      raw: stderr
    }
  }

  // Parse error type from stderr (simpler format)
  const simpleMatch = stderr.match(/^(.*?Error|.*?Warning|.*?Notice|.*?Deprecated):\s*(.*)/s)
  if (simpleMatch) {
    return {
      type: simpleMatch[1].trim(),
      message: simpleMatch[2].trim(),
      file: null,
      line: null,
      raw: stderr
    }
  }

  return { type: 'Error', message: stderr, file: null, line: null, raw: stderr }
})

// Auto-scroll to bottom when new output arrives
watch(
  () => props.result,
  async () => {
    if (!outputContainer.value) return
    await nextTick()
    outputContainer.value.scrollTop = outputContainer.value.scrollHeight
  }
)
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Panel header -->
    <div class="panel-header justify-between">
      <div class="flex items-center gap-2 text-xs text-text-muted">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
          <rect x="1" y="1" width="10" height="10" rx="1.5" />
          <path d="M3 4h6M3 6h4M3 8h5" />
        </svg>
        <span>Output</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Metrics badge (shown after execution) -->
        <div v-if="result && !isRunning" class="flex items-center gap-2 text-2xs">
          <span
            class="font-mono"
            :class="hasError ? 'text-error' : 'text-success'"
          >
            {{ result.executionTimeMs }}ms
          </span>
          <span v-if="formattedMemory" class="text-text-disabled font-mono">{{ formattedMemory }}</span>
        </div>

        <!-- Clear button -->
        <button
          v-if="hasOutput"
          class="btn-ghost text-2xs"
          title="Clear output"
          @click="emit('clear')"
        >
          clear
        </button>
      </div>
    </div>

    <!-- Output content area -->
    <div ref="outputContainer" class="flex-1 overflow-auto">
      <!-- Loading state -->
      <div v-if="isRunning" class="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
        <div class="spinner" style="width: 20px; height: 20px; border-width: 2px" />
        <span class="text-xs">Running…</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!hasOutput"
        class="flex h-full flex-col items-center justify-center gap-2 text-text-disabled"
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4">
          <rect x="4" y="4" width="24" height="24" rx="3" />
          <path d="M9 12h14M9 17h10M9 22h12" stroke-linecap="round" />
        </svg>
        <p class="text-xs">Press <kbd class="rounded bg-bg-elevated px-1 py-0.5 font-mono text-2xs text-text-muted">▶ Run</kbd> or <kbd class="rounded bg-bg-elevated px-1 py-0.5 font-mono text-2xs text-text-muted">Ctrl+Enter</kbd> to execute</p>
      </div>

      <!-- Output content -->
      <div v-else class="p-4 font-mono text-sm space-y-3 animate-fade-in">

        <!-- stdout -->
        <div v-if="hasStdout">
          <pre class="whitespace-pre-wrap break-words text-text-primary leading-relaxed">{{ result!.stdout }}</pre>
        </div>

        <!-- stderr / PHP error -->
        <div
          v-if="phpError"
          class="rounded border border-error/20 bg-error/5 p-3 space-y-1.5"
        >
          <!-- Error type badge -->
          <div class="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" class="text-error shrink-0">
              <path d="M6 1L11 10H1L6 1z" />
              <path d="M6 5v2.5M6 9h.01" stroke="white" stroke-width="1.2" stroke-linecap="round" fill="none" />
            </svg>
            <span class="text-xs font-medium text-error">{{ phpError.type }}</span>
          </div>

          <!-- Error message -->
          <p class="text-xs text-error/90 leading-relaxed">{{ phpError.message }}</p>

          <!-- File + line info -->
          <div v-if="phpError.file" class="flex items-center gap-1.5 text-2xs text-text-muted">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="1" y="1" width="8" height="8" rx="1" />
              <path d="M3 4h4M3 6h2" stroke-linecap="round" />
            </svg>
            <code class="text-text-secondary">{{ phpError.file }}</code>
            <span v-if="phpError.line" class="text-text-disabled">line {{ phpError.line }}</span>
          </div>
        </div>

        <!-- Raw stderr fallback (when no PHP error pattern matched) -->
        <div
          v-else-if="result?.stderr && !hasStdout"
          class="rounded border border-error/20 bg-error/5 p-3"
        >
          <pre class="whitespace-pre-wrap break-words text-xs text-error/90">{{ result.stderr }}</pre>
        </div>

        <!-- Execution metrics bar -->
        <div
          class="flex items-center gap-3 border-t border-border-subtle pt-2 text-2xs text-text-disabled"
        >
          <span :class="hasError ? 'text-error' : 'text-success'">
            exit {{ result!.exitCode }}
          </span>
          <span>·</span>
          <span>{{ result!.executionTimeMs }}ms</span>
          <span v-if="formattedMemory">·</span>
          <span v-if="formattedMemory">{{ formattedMemory }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
