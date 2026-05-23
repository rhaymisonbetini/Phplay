<script setup lang="ts">
import { ref } from 'vue'
import type { StructuredOutput, ArrayItem, TypedValue } from '../../composables/useOutputParser'

defineProps<{
  data: Extract<StructuredOutput, { type: 'array' }>
}>()

const expanded = ref(false)

function typeColor(tv: TypedValue): string {
  switch (tv.type) {
    case 'null':   return 'var(--text-muted)'
    case 'bool':   return 'var(--neon-purple)'
    case 'int':
    case 'float':  return '#FFB86C'
    case 'string': return 'var(--neon-green)'
    case 'array':
    case 'object': return 'var(--neon-blue)'
    default:       return 'var(--text-secondary)'
  }
}

function renderValue(tv: TypedValue): string {
  switch (tv.type) {
    case 'null':   return 'null'
    case 'bool':   return (tv.value as boolean) ? 'true' : 'false'
    case 'int':
    case 'float':  return String(tv.value)
    case 'string': return `"${tv.value as string}"`
    case 'array':  return `Array(${tv.count ?? '?'})`
    case 'object': return tv.class ?? 'object'
    case 'truncated': return `… ${tv.remaining ?? ''} more`
    default:       return String(tv.value ?? '')
  }
}

function itemKey(item: ArrayItem): string {
  return typeof item.key === 'number' ? String(item.key) : `"${item.key}"`
}
</script>

<template>
  <span class="inspector">
    <button class="toggle" @click="expanded = !expanded">
      <span class="chevron" :class="{ open: expanded }">▶</span>
      <span class="badge-type">array</span>
      <span class="count">({{ data.count }})</span>
    </button>

    <div v-if="expanded" class="entries">
      <div v-for="(item, i) in data.items" :key="i" class="entry">
        <span class="entry-key">{{ itemKey(item) }}</span>
        <span class="entry-arrow">→</span>
        <span class="entry-val" :style="{ color: typeColor(item.value) }">{{ renderValue(item.value) }}</span>
      </div>
    </div>
  </span>
</template>

<style scoped>
.inspector { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
.toggle { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; padding: 0; color: var(--text-primary); }
.toggle:hover .badge-type { opacity: 0.85; }
.chevron { font-size: 0.65rem; color: var(--text-muted); transition: transform 0.15s; display: inline-block; }
.chevron.open { transform: rotate(90deg); }
.badge-type { font-size: 0.7rem; background: rgba(0,216,255,0.1); color: var(--neon-blue); padding: 0 5px; border-radius: 3px; }
.count { color: var(--text-muted); font-size: 0.8rem; }
.entries { margin-left: 16px; border-left: 1px solid var(--border-subtle); padding-left: 10px; margin-top: 4px; }
.entry { display: flex; align-items: baseline; gap: 8px; padding: 1px 0; }
.entry-key { color: var(--neon-blue); min-width: 40px; font-size: 0.75rem; }
.entry-arrow { color: var(--text-disabled); font-size: 0.7rem; }
.entry-val { font-size: 0.8rem; }
</style>
