<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StructuredOutput, TraceFrame } from '../../composables/useOutputParser'

const props = defineProps<{
  data: Extract<StructuredOutput, { type: 'exception' }>
}>()

const stackExpanded = ref(false)

function shortClass(cls: string): string {
  const parts = cls.split('\\')
  return parts[parts.length - 1]
}

function shortFile(file: string): string {
  const idx = file.indexOf('/vendor/')
  if (idx !== -1) return '…/vendor/…'
  const parts = file.split('/')
  return parts.slice(-3).join('/')
}

const isVendor = (f: TraceFrame): boolean => f.file.includes('/vendor/')

const projectFrames = computed(() => props.data.trace.filter((f) => !isVendor(f)))
const vendorCount = computed(() => props.data.trace.length - projectFrames.value.length)
</script>

<template>
  <div class="exc-wrap">
    <!-- Header -->
    <div class="exc-header">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor" class="exc-icon">
        <path d="M6 1L11 10H1L6 1z" />
        <path d="M6 5v2.5M6 9h.01" stroke="white" stroke-width="1.2" stroke-linecap="round" fill="none" />
      </svg>
      <span class="exc-class" :title="data.class">{{ shortClass(data.class) }}</span>
    </div>

    <!-- Message -->
    <p class="exc-msg">{{ data.message }}</p>

    <!-- Location -->
    <div class="exc-loc">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="1" y="1" width="8" height="8" rx="1" />
        <path d="M3 4h4M3 6h2" stroke-linecap="round" />
      </svg>
      <code class="exc-file" :title="data.file">{{ shortFile(data.file) }}</code>
      <span class="exc-line">line {{ data.line }}</span>
    </div>

    <!-- Stack trace toggle -->
    <div v-if="data.trace.length > 0" class="exc-trace">
      <button class="trace-toggle" @click="stackExpanded = !stackExpanded">
        <span class="chevron" :class="{ open: stackExpanded }">▶</span>
        Stack trace
        <span class="trace-count">({{ projectFrames.length }} project frame{{ projectFrames.length !== 1 ? 's' : '' }}<template v-if="vendorCount > 0">, {{ vendorCount }} vendor hidden</template>)</span>
      </button>

      <div v-if="stackExpanded" class="trace-frames">
        <div v-for="(frame, i) in projectFrames" :key="i" class="frame">
          <span class="frame-fn">{{ frame.function || '(closure)' }}</span>
          <code class="frame-file">{{ shortFile(frame.file) }}<span class="frame-line">:{{ frame.line }}</span></code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exc-wrap { border: 1px solid rgba(255,85,85,0.25); background: rgba(255,85,85,0.05); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.exc-header { display: flex; align-items: center; gap: 8px; }
.exc-icon { color: var(--error); flex-shrink: 0; }
.exc-class { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; color: var(--error); }
.exc-msg { font-size: 0.8rem; color: rgba(255,85,85,0.9); line-height: 1.5; margin: 0; }
.exc-loc { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
.exc-file { font-size: 0.75rem; color: var(--text-secondary); }
.exc-line { font-size: 0.75rem; color: var(--text-disabled); flex-shrink: 0; }
.exc-trace { display: flex; flex-direction: column; gap: 4px; }
.trace-toggle { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--text-disabled); font-size: 0.75rem; padding: 0; font-family: inherit; }
.trace-toggle:hover { color: var(--text-muted); }
.chevron { font-size: 0.6rem; transition: transform 0.15s; display: inline-block; }
.chevron.open { transform: rotate(90deg); }
.trace-count { color: var(--text-disabled); }
.trace-frames { border-left: 1px solid var(--border-subtle); padding-left: 10px; display: flex; flex-direction: column; gap: 4px; margin-top: 2px; }
.frame { display: flex; flex-direction: column; gap: 1px; }
.frame-fn { font-size: 0.75rem; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }
.frame-file { font-size: 0.7rem; color: var(--text-muted); }
.frame-line { color: var(--text-disabled); }
</style>
