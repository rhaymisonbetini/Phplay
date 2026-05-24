<script setup lang="ts">
import { computed } from 'vue'
import type { StructuredOutput, TypedValue } from '../../composables/useOutputParser'

const props = defineProps<{
  data: Extract<StructuredOutput, { type: 'model' | 'object' }>
}>()

type ModelOrObject =
  | Extract<StructuredOutput, { type: 'model' }>
  | Extract<StructuredOutput, { type: 'object' }>

const modelKey = computed(() => {
  const d = props.data as ModelOrObject
  return d.type === 'model' && d.key != null ? d.key : null
})

function attrs(d: ModelOrObject): Record<string, TypedValue> {
  return d.type === 'model' ? d.attributes : d.properties
}

function shortClass(cls: string): string {
  const parts = cls.replace(/\\\\/g, '\\').split('\\')
  return parts[parts.length - 1]
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
    default:       return String(tv.value ?? '')
  }
}

function valueColor(tv: TypedValue): string {
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
</script>

<template>
  <div class="inspector">
    <div class="class-header">
      <span class="badge-type">{{ data.type }}</span>
      <span class="class-name" :title="data.class">{{ shortClass(data.class) }}</span>
      <span v-if="modelKey != null" class="model-key">#{{ modelKey }}</span>
    </div>

    <div class="attrs">
      <div v-for="(val, key) in attrs(data as ModelOrObject)" :key="key" class="attr-row">
        <span class="attr-key">{{ key }}</span>
        <span class="attr-val" :style="{ color: valueColor(val) }">{{ renderValue(val) }}</span>
        <span class="attr-type">{{ val.type }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inspector { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
.class-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.badge-type { font-size: 0.7rem; background: rgba(189,147,249,0.12); color: var(--neon-purple); padding: 0 5px; border-radius: 3px; }
.class-name { color: var(--neon-blue); font-weight: 600; }
.model-key { color: var(--text-muted); font-size: 0.75rem; }
.attrs { border-left: 1px solid var(--border-subtle); padding-left: 10px; }
.attr-row { display: grid; grid-template-columns: minmax(80px, 140px) 1fr auto; gap: 8px; padding: 2px 0; align-items: baseline; }
.attr-key { color: var(--text-secondary); font-size: 0.75rem; }
.attr-val { font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.attr-type { font-size: 0.65rem; color: var(--text-disabled); background: var(--bg-elevated); padding: 0 4px; border-radius: 3px; white-space: nowrap; }
</style>
