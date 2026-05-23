<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { ExecutionResult } from '../types/electron'
import { formatOutput, parsePhpError } from '../composables/useOutputFormatter'
import { parseOutput, hasStructuredOutput } from '../composables/useOutputParser'
import { highlightOutput } from '../composables/useOutputHighlight'
import SmartOutput from './output/SmartOutput.vue'

const props = defineProps<{
  result: ExecutionResult | null
  isRunning: boolean
  liveOutput?: string
}>()

const emit = defineEmits<{ clear: [] }>()

const outputContainer = ref<HTMLElement | null>(null)
const stackExpanded = ref(false)
const copyLabel = ref('Copy')
const autoScrollPaused = ref(false)

const hasOutput = computed(() => props.result !== null)
const hasError = computed(
  () => props.result && (props.result.exitCode !== 0 || !!props.result.stderr)
)

const formatted = computed(() => {
  if (!props.result?.stdout) return null
  return formatOutput(props.result.stdout)
})

const phpError = computed(() => {
  if (!props.result?.stderr) return null
  return parsePhpError(props.result.stderr)
})

const formattedMemory = computed(() => {
  if (!props.result) return null
  const kb = props.result.memoryUsedKb
  if (!kb) return null
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb}KB`
})

function isAtBottom(): boolean {
  const el = outputContainer.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

function onScroll(): void {
  autoScrollPaused.value = !isAtBottom()
}

async function scrollToBottom(): Promise<void> {
  if (autoScrollPaused.value) return
  await nextTick()
  if (outputContainer.value) {
    outputContainer.value.scrollTop = outputContainer.value.scrollHeight
  }
}

watch(() => props.result, async () => {
  stackExpanded.value = false
  autoScrollPaused.value = false
  await scrollToBottom()
})

watch(() => props.liveOutput, scrollToBottom)

const MAX_LINES = 5000
const DISPLAY_LINES = 2000
const displayLinesCount = DISPLAY_LINES

const displayOutput = computed(() => {
  const text = props.result?.stdout ?? ''
  if (!text) return null
  const lines = text.split('\n')
  if (lines.length <= MAX_LINES) return { text, truncated: false, total: lines.length }
  const shown = lines.slice(-DISPLAY_LINES).join('\n')
  return { text: shown, truncated: true, total: lines.length }
})

const formattedDisplay = computed(() => {
  if (!displayOutput.value) return null
  return formatOutput(displayOutput.value.text)
})

const parsedChunks = computed(() => {
  const text = props.result?.stdout ?? ''
  if (!hasStructuredOutput(text)) return null
  return parseOutput(text)
})

async function copyOutput(): Promise<void> {
  const text = props.result?.stdout ?? ''
  if (!text) return
  await navigator.clipboard.writeText(text)
  copyLabel.value = 'Copied!'
  setTimeout(() => { copyLabel.value = 'Copy' }, 2000)
}

async function saveOutput(): Promise<void> {
  const text = props.result?.stdout ?? ''
  if (!text) return
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  await window.electronAPI.saveOutputFile(text, `phplay-output-${ts}.txt`)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="panel-header justify-between">
      <div class="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
          <rect x="1" y="1" width="10" height="10" rx="1.5" />
          <path d="M3 4h6M3 6h4M3 8h5" />
        </svg>
        <span class="text-xs text-text-muted">Output</span>

        <!-- Type badge -->
        <span
          v-if="formatted?.badge"
          class="output-type-badge"
          :class="formatted.badge.cls"
        >
          {{ formatted.badge.label }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Metrics -->
        <div v-if="result && !isRunning" class="flex items-center gap-1.5 text-2xs font-mono">
          <span :class="hasError ? 'text-error' : 'text-success'">
            {{ result.executionTimeMs }}ms
          </span>
          <span v-if="formattedMemory" class="text-text-disabled">{{ formattedMemory }}</span>
        </div>

        <!-- Save -->
        <button
          v-if="result?.stdout"
          class="btn-ghost text-2xs"
          title="Save output as .txt"
          @click="saveOutput"
        >
          Save
        </button>

        <!-- Copy -->
        <button
          v-if="formattedDisplay && formattedDisplay.type !== 'empty'"
          class="btn-ghost text-2xs"
          :title="copyLabel"
          @click="copyOutput"
        >
          {{ copyLabel }}
        </button>

        <!-- Clear -->
        <button
          v-if="hasOutput"
          class="btn-ghost text-2xs"
          @click="emit('clear')"
        >
          clear
        </button>
      </div>
    </div>

    <!-- Content -->
    <div ref="outputContainer" class="flex-1 overflow-auto" @scroll="onScroll">

      <!-- Running with live output -->
      <div v-if="isRunning" class="relative h-full">
        <div
          v-if="liveOutput"
          class="p-4 font-mono text-xs text-text-primary select-text whitespace-pre-wrap break-all"
        >{{ liveOutput }}<span class="inline-block w-1.5 h-3 bg-text-muted animate-pulse ml-0.5 align-middle" /></div>
        <div v-else class="flex h-full flex-col items-center justify-center gap-3 text-text-muted pt-20">
          <div class="spinner" style="width: 20px; height: 20px; border-width: 2px" />
          <span class="text-xs">Running…</span>
        </div>
        <!-- Scroll paused indicator -->
        <button
          v-if="autoScrollPaused && liveOutput"
          class="scroll-resume-btn"
          @click="autoScrollPaused = false; scrollToBottom()"
        >
          ↓ Resume scroll
        </button>
      </div>

      <!-- Empty state: compact, max 80px -->
      <div
        v-else-if="!hasOutput"
        class="flex items-center justify-center gap-2 text-text-disabled py-5"
        style="max-height: 80px"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5">
          <rect x="1" y="1" width="12" height="12" rx="2" />
          <path d="M4 5h6M4 7.5h4M4 10h5" stroke-linecap="round" />
        </svg>
        <span class="text-xs">Run <kbd class="rounded bg-bg-elevated px-1 font-mono text-2xs text-text-muted">Ctrl+Enter</kbd> to execute</span>
      </div>

      <!-- Output content -->
      <div v-else class="flex flex-col h-full">

        <!-- Truncation notice -->
        <div
          v-if="displayOutput?.truncated"
          class="mx-4 mt-4 mb-1 rounded bg-bg-elevated px-3 py-1.5 text-2xs text-text-muted"
        >
          Output truncated — showing last {{ displayLinesCount.toLocaleString() }} of {{ displayOutput.total.toLocaleString() }} lines.
          Use <strong>Save</strong> to get the full output.
        </div>

        <!-- stdout: structured (SmartOutput) -->
        <div
          v-if="parsedChunks"
          class="flex-1 overflow-auto p-4 select-text space-y-2"
        >
          <template v-for="(chunk, i) in parsedChunks" :key="i">
            <SmartOutput v-if="chunk.kind === 'structured'" :data="chunk.data" />
            <pre v-else class="output-pre" v-html="highlightOutput(chunk.content)" />
          </template>
        </div>

        <!-- stdout: plain text (formatted) -->
        <div
          v-else-if="formattedDisplay && formattedDisplay.type !== 'empty'"
          class="flex-1 overflow-auto p-4 select-text"
          v-html="formattedDisplay.html"
        />

        <!-- Error block -->
        <div
          v-if="phpError"
          class="mx-4 mb-4 rounded border border-error/25 bg-error/5 p-3 space-y-2 select-text"
        >
          <div class="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" class="text-error shrink-0">
              <path d="M6 1L11 10H1L6 1z" />
              <path d="M6 5v2.5M6 9h.01" stroke="white" stroke-width="1.2" stroke-linecap="round" fill="none" />
            </svg>
            <span class="text-xs font-semibold text-error font-mono">{{ phpError.errorClass }}</span>
          </div>

          <p class="text-xs text-error/90 leading-relaxed">{{ phpError.message }}</p>

          <div v-if="phpError.file" class="flex items-center gap-1.5 text-2xs text-text-muted">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="1" y="1" width="8" height="8" rx="1" />
              <path d="M3 4h4M3 6h2" stroke-linecap="round" />
            </svg>
            <code class="text-text-secondary truncate" :title="phpError.file">{{ phpError.file }}</code>
            <span v-if="phpError.line" class="shrink-0 text-text-disabled">line {{ phpError.line }}</span>
          </div>

          <!-- Stack trace (collapsible, structured frames) -->
          <div v-if="phpError.frames.length > 0">
            <button
              class="flex items-center gap-1 text-2xs text-text-disabled hover:text-text-muted transition-colors"
              @click="stackExpanded = !stackExpanded"
            >
              <svg
                width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5"
                :class="stackExpanded ? 'rotate-90' : ''"
                class="transition-transform"
              >
                <path d="M2 1l4 3-4 3" />
              </svg>
              Stack trace ({{ phpError.frames.length }} frame{{ phpError.frames.length !== 1 ? 's' : '' }})
            </button>
            <div v-if="stackExpanded" class="mt-2 space-y-1">
              <div
                v-for="frame in phpError.frames"
                :key="frame.index"
                class="flex items-start gap-2 text-2xs leading-relaxed"
              >
                <span class="text-text-disabled shrink-0 font-mono">#{{ frame.index }}</span>
                <div class="min-w-0">
                  <code class="text-text-secondary break-all">{{ frame.file }}<span v-if="frame.line" class="text-text-disabled">:{{ frame.line }}</span></code>
                  <div class="text-text-disabled font-mono truncate" :title="frame.call">{{ frame.call }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Raw stderr fallback (when no error pattern matched) -->
        <div
          v-else-if="result?.stderr && (!formatted || formatted.type === 'empty')"
          class="mx-4 mb-4 rounded border border-error/25 bg-error/5 p-3"
        >
          <pre class="whitespace-pre-wrap break-words text-xs text-error/90 select-text">{{ result.stderr }}</pre>
        </div>

        <!-- Metrics bar -->
        <div
          v-if="result"
          class="shrink-0 flex items-center gap-2 border-t border-border-subtle px-4 py-1.5 text-2xs text-text-disabled font-mono"
        >
          <span :class="hasError ? 'text-error' : 'text-success'">exit {{ result.exitCode }}</span>
          <span>·</span>
          <span>{{ result.executionTimeMs }}ms</span>
          <template v-if="formattedMemory">
            <span>·</span>
            <span>{{ formattedMemory }}</span>
          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Output syntax highlighting ──────────────────────────────────────────── */
:deep(.output-pre) {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-primary, #e4e4e7);
}

:deep(.hl-key)   { color: var(--neon-blue); }
:deep(.hl-str)   { color: var(--neon-green); }
:deep(.hl-num)   { color: #FFB86C; }
:deep(.hl-bool)  { color: var(--neon-purple); }
:deep(.hl-null)  { color: var(--text-muted); font-style: italic; }
:deep(.hl-type)  { color: var(--neon-blue); font-weight: 600; }
:deep(.hl-brace) { color: var(--text-muted); }

/* Stack trace */
:deep(.hl-trace-idx)   { color: var(--text-disabled); }
:deep(.hl-trace-file)  { color: var(--neon-blue); }
:deep(.hl-trace-paren) { color: var(--text-muted); }
:deep(.hl-trace-call)  { color: var(--text-secondary); }
:deep(.hl-trace-kw)    { color: var(--text-muted); font-style: italic; }
:deep(.hl-error-class) { color: var(--error); font-weight: 700; }
:deep(.hl-error-msg)   { color: rgba(255,85,85,0.85); }

/* ── Type badges ─────────────────────────────────────────────────────────── */
.output-type-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.02em;
}
.badge-primitive { background: rgba(251,146,60,0.15); color: #fb923c; }
.badge-string    { background: rgba(74,222,128,0.12); color: #4ade80; }
.badge-array     { background: rgba(56,189,248,0.12); color: #38bdf8; }
.badge-object    { background: rgba(167,139,250,0.12); color: #a78bfa; }
.badge-bool      { background: rgba(167,139,250,0.12); color: #a78bfa; }
.badge-null      { background: rgba(113,113,122,0.15); color: #71717a; }
.badge-plain     { background: rgba(228,228,231,0.08); color: #a1a1aa; }

.scroll-resume-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.scroll-resume-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
</style>
