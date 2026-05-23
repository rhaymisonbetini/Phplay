<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StructuredOutput, TypedValue } from '../../composables/useOutputParser'

const props = defineProps<{
  data: Extract<StructuredOutput, { type: 'collection' }>
}>()

const expanded = ref(false)
const page = ref(0)
const PAGE_SIZE = 10

const visibleItems = computed(() => {
  const end = (page.value + 1) * PAGE_SIZE
  return props.data.items.slice(0, end)
})

const hasMore = computed(() => visibleItems.value.length < props.data.items.length)

function shortClass(cls: string): string {
  const parts = cls.split('\\')
  return parts[parts.length - 1]
}

function renderItem(tv: TypedValue): string {
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

function itemColor(tv: TypedValue): string {
  switch (tv.type) {
    case 'null':   return 'var(--text-muted)'
    case 'bool':   return 'var(--neon-purple)'
    case 'int':
    case 'float':  return '#FFB86C'
    case 'string': return 'var(--neon-green)'
    default:       return 'var(--neon-blue)'
  }
}
</script>

<template>
  <div class="inspector">
    <button class="toggle" @click="expanded = !expanded">
      <span class="chevron" :class="{ open: expanded }">▶</span>
      <span class="badge-type">{{ shortClass(data.class) }}</span>
      <span class="count">({{ data.count }})</span>
    </button>

    <div v-if="expanded" class="items">
      <div v-for="(item, i) in visibleItems" :key="i" class="item-row">
        <span class="item-idx">{{ i }}</span>
        <span class="item-val" :style="{ color: itemColor(item) }">{{ renderItem(item) }}</span>
      </div>

      <button v-if="hasMore" class="load-more" @click="page++">
        … {{ data.items.length - visibleItems.length }} more (click to load)
      </button>

      <div v-if="data.count > data.items.length" class="truncated-note">
        Showing {{ data.items.length }} of {{ data.count }} items
      </div>
    </div>
  </div>
</template>

<style scoped>
.inspector { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
.toggle { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; padding: 0; color: var(--text-primary); }
.chevron { font-size: 0.65rem; color: var(--text-muted); transition: transform 0.15s; display: inline-block; }
.chevron.open { transform: rotate(90deg); }
.badge-type { font-size: 0.7rem; background: rgba(189,147,249,0.12); color: var(--neon-purple); padding: 0 5px; border-radius: 3px; }
.count { color: var(--text-muted); }
.items { margin-left: 16px; border-left: 1px solid var(--border-subtle); padding-left: 10px; margin-top: 4px; }
.item-row { display: flex; align-items: baseline; gap: 8px; padding: 1px 0; }
.item-idx { color: var(--text-disabled); min-width: 24px; font-size: 0.75rem; }
.item-val { font-size: 0.8rem; }
.load-more { margin-top: 4px; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.75rem; font-family: inherit; padding: 2px 0; }
.load-more:hover { color: var(--text-primary); }
.truncated-note { color: var(--text-disabled); font-size: 0.7rem; margin-top: 4px; font-style: italic; }
</style>
