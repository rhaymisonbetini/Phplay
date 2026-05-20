<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { ExecutionResult } from '../types/electron'
import { formatOutput } from '../composables/useOutputFormatter'
import type { TypeBadge } from '../composables/useOutputFormatter'

const props = defineProps<{
  result: ExecutionResult | null
  isRunning: boolean
}>()

const emit = defineEmits<{
  clear: []
}>()

const outputContainer = ref<HTMLElement | null>(null)
const copied = ref(false)

const hasOutput = computed(() => props.result !== null)
const hasError = computed(
  () => props.result && (props.result.exitCode !== 0 || props.result.stderr)
)
const hasStdout = computed(() => !!props.result?.stdout)

const formattedMemory = computed(() => {
  if (!props.result) return null
  const kb = props.result.memoryUsedKb
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)}MB`
  return kb > 0 ? `${kb}KB` : null
})

// ── Output formatting ────────────────────────────────────────────────────────

const formatted = computed(() =>
  props.result?.stdout ? formatOutput(props.result.stdout) : null
)

// ── PHP error parsing from stderr ────────────────────────────────────────────

const phpError = computed(() => {
  if (!props.result?.stderr) return null
  const stderr = props.result.stderr

  // Laravel/Phplay structured error from STDERR
  const structuredMatch = stderr.match(
    /^([\w\\]+):\s+(.*?)\s+in\s+(.*?)\s+on\s+line\s+(\d+)/s
  )
  if (structuredMatch) {
    const className = structuredMatch[1]
    const short = className.split('\\').pop() ?? className
    return {
      type: short,
      message: structuredMatch[2].trim(),
      file: structuredMatch[3].trim(),
      line: parseInt(structuredMatch[4]),
      trace: stderr.includes('Stack trace:')
        ? stderr.split('Stack trace:')[1]?.trim() ?? null
        : null,
      raw: stderr
    }
  }

  // PHP native error: "PHP Fatal error: ..."
  const phpMatch = stderr.match(
    /PHP\s+([\w\s]+):\s+(.*?)\s+in\s+(.*?)\s+on\s+line\s+(\d+)/i
  )
  if (phpMatch) {
    return {
      type: phpMatch[1].trim(),
      message: phpMatch[2].trim(),
      file: phpMatch[3].trim(),
      line: parseInt(phpMatch[4]),
      trace: null,
      raw: stderr
    }
  }

  return { type: 'Error', message: stderr, file: null, line: null, trace: null, raw: stderr }
})

const showTrace = ref(false)

// ── Copy ─────────────────────────────────────────────────────────────────────

async function copyOutput(): Promise<void> {
  const text = props.result?.stdout ?? ''
  if (!text) return
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// ── Auto-scroll ───────────────────────────────────────────────────────────────

watch(
  () => props.result,
  async () => {
    await nextTick()
    if (outputContainer.value) {
      outputContainer.value.scrollTop = outputContainer.value.scrollHeight
    }
  }
)

// ── Badge color map ───────────────────────────────────────────────────────────

const BADGE_COLORS: Record<TypeBadge['color'], string> = {
  primitive: 'badge-primitive',
  string: 'badge-string',
  bool: 'badge-bool',
  null: 'badge-null',
  array: 'badge-array',
  object: 'badge-object',
  collection: 'badge-collection'
}

function badgeClass(color: TypeBadge['color']): string {
  return BADGE_COLORS[color] ?? 'badge-primitive'
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- ── Panel header ── -->
    <div class="panel-header justify-between">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 text-xs text-text-muted">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <rect x="1" y="1" width="10" height="10" rx="1.5" />
            <path d="M3 4h6M3 6h4M3 8h5" />
          </svg>
          <span>Output</span>
        </div>

        <!-- Type badge -->
        <span
          v-if="formatted?.badge"
          class="output-type-badge"
          :class="badgeClass(formatted.badge.color)"
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

        <!-- Copy button -->
        <button
          v-if="hasStdout && !isRunning"
          class="btn-ghost text-2xs flex items-center gap-1"
          :title="copied ? 'Copied!' : 'Copy output'"
          @click="copyOutput"
        >
          <svg v-if="!copied" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <path d="M7 3V2a1 1 0 00-1-1H2a1 1 0 00-1 1v4a1 1 0 001 1h1" />
          </svg>
          <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" class="text-success">
            <path d="M1.5 5l2.5 2.5L8.5 2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ copied ? 'Copied' : 'Copy' }}
        </button>

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

    <!-- ── Content area ── -->
    <div ref="outputContainer" class="flex-1 overflow-auto">

      <!-- Loading -->
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
        <p class="text-xs">
          Press
          <kbd class="rounded bg-bg-elevated px-1 py-0.5 font-mono text-2xs text-text-muted">▶ Run</kbd>
          or
          <kbd class="rounded bg-bg-elevated px-1 py-0.5 font-mono text-2xs text-text-muted">Ctrl+Enter</kbd>
          to execute
        </p>
      </div>

      <!-- Output content -->
      <div v-else class="p-4 space-y-3 animate-fade-in">

        <!-- ── stdout (formatted) ── -->
        <div v-if="hasStdout" class="output-block">
          <!-- Format hint pill -->
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xs text-text-disabled uppercase tracking-wider font-medium">
              {{ formatted?.format === 'json' ? 'JSON' :
                 formatted?.format === 'vardump' ? 'var_dump' :
                 formatted?.format === 'printr' ? 'print_r' : 'output' }}
            </span>
          </div>

          <!-- Formatted output — selectable -->
          <pre
            class="output-pre select-text"
            v-html="formatted?.html ?? ''"
          />
        </div>

        <!-- ── Error block ── -->
        <div
          v-if="phpError"
          class="rounded border border-error/20 bg-error/5 p-3 space-y-2"
        >
          <!-- Error header -->
          <div class="flex items-start gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" class="text-error shrink-0 mt-0.5">
              <path d="M6 1L11 10H1L6 1z" />
              <path d="M6 5v2.5M6 9h.01" stroke="white" stroke-width="1.2" stroke-linecap="round" fill="none" />
            </svg>
            <span class="text-xs font-semibold text-error leading-tight">{{ phpError.type }}</span>
          </div>

          <!-- Message -->
          <p class="text-xs text-error/90 leading-relaxed font-mono">{{ phpError.message }}</p>

          <!-- File + line -->
          <div v-if="phpError.file" class="flex items-center gap-1.5 text-2xs text-text-muted">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="1" y="1" width="8" height="8" rx="1" />
              <path d="M3 4h4M3 6h2" stroke-linecap="round" />
            </svg>
            <code class="text-text-secondary break-all">{{ phpError.file }}</code>
            <span v-if="phpError.line" class="text-text-disabled shrink-0">line {{ phpError.line }}</span>
          </div>

          <!-- Stack trace toggle -->
          <div v-if="phpError.trace">
            <button
              class="text-2xs text-text-muted hover:text-text-secondary transition-colors"
              @click="showTrace = !showTrace"
            >
              {{ showTrace ? '▾ hide trace' : '▸ show stack trace' }}
            </button>
            <pre
              v-if="showTrace"
              class="mt-2 text-2xs text-text-muted leading-relaxed whitespace-pre-wrap break-all select-text"
            >{{ phpError.trace }}</pre>
          </div>
        </div>

        <!-- ── Raw stderr fallback ── -->
        <div
          v-else-if="result?.stderr && !hasStdout"
          class="rounded border border-error/20 bg-error/5 p-3"
        >
          <pre class="whitespace-pre-wrap break-words text-xs text-error/90 select-text">{{ result.stderr }}</pre>
        </div>

        <!-- ── Metrics bar ── -->
        <div class="flex items-center gap-3 border-t border-border-subtle pt-2 text-2xs text-text-disabled font-mono">
          <span :class="hasError ? 'text-error' : 'text-success'">exit {{ result!.exitCode }}</span>
          <span>·</span>
          <span>{{ result!.executionTimeMs }}ms</span>
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
/* ── Output type badge ────────────────────────────────────────────────── */
.output-type-badge {
  @apply px-1.5 py-0.5 rounded text-2xs font-mono font-medium;
}
.badge-primitive { @apply bg-accent/10 text-accent; }
.badge-string    { @apply bg-success/10 text-success; }
.badge-bool      { @apply bg-warning/10 text-warning; }
.badge-null      { @apply bg-text-disabled/10 text-text-muted; }
.badge-array     { @apply bg-info/10 text-info; }
.badge-object    { @apply bg-framework-laravel/10 text-framework-laravel; }
.badge-collection { @apply bg-framework-laravel/10 text-framework-laravel; }

/* ── Output block ─────────────────────────────────────────────────────── */
.output-block {
  @apply rounded border border-border-subtle bg-bg-base p-3;
}

.output-pre {
  @apply font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-text-primary;
}

/* ── Syntax highlight tokens ──────────────────────────────────────────── */
:deep(.hl-key)  { color: var(--info); }
:deep(.hl-str)  { color: var(--success); }
:deep(.hl-num)  { color: var(--warning); }
:deep(.hl-bool) { color: var(--accent); }
:deep(.hl-null) { color: var(--text-muted); opacity: 0.7; }
:deep(.hl-type) { color: var(--info); font-weight: 600; }
:deep(.hl-class){ color: #ff2d20; font-style: italic; }
</style>
