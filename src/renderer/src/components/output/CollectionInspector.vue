<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StructuredOutput, TypedValue } from '../../composables/useOutputParser'

const DEFAULT_EXPANDED_ITEMS = 10

const props = defineProps<{
  data: Extract<StructuredOutput, { type: 'collection' }>
}>()

const collectionExpanded = ref(true)

// Per-item expansion: first DEFAULT_EXPANDED_ITEMS start expanded, rest collapsed
const collapsedItems = ref(new Set<number>(
  props.data.items.slice(DEFAULT_EXPANDED_ITEMS).map((_, i) => i + DEFAULT_EXPANDED_ITEMS)
))

function isItemExpanded(idx: number): boolean {
  return !collapsedItems.value.has(idx)
}

function toggleItem(idx: number): void {
  if (collapsedItems.value.has(idx)) {
    collapsedItems.value.delete(idx)
  } else {
    collapsedItems.value.add(idx)
  }
}

function shortClass(cls: string): string {
  const parts = cls.split('\\')
  return parts[parts.length - 1]
}

function itemLabel(item: StructuredOutput): string {
  switch (item.type) {
    case 'null':   return 'null'
    case 'bool':   return item.value ? 'true' : 'false'
    case 'int':
    case 'float':  return String(item.value)
    case 'string': return `"${item.value}"`
    case 'array':  return `Array(${item.count})`
    case 'model':  return `${shortClass(item.class)}${item.key != null ? ` #${item.key}` : ''}`
    case 'collection': return `${shortClass(item.class)}(${item.count})`
    case 'object': return shortClass(item.class)
    case 'exception': return item.class
    default:       return '?'
  }
}

function itemLabelColor(item: StructuredOutput): string {
  switch (item.type) {
    case 'null':   return 'var(--text-muted)'
    case 'bool':   return 'var(--neon-purple)'
    case 'int':
    case 'float':  return '#FFB86C'
    case 'string': return 'var(--neon-green)'
    case 'model':
    case 'object':
    case 'collection': return 'var(--neon-blue)'
    default:       return 'var(--text-secondary)'
  }
}

function isExpandable(item: StructuredOutput): boolean {
  return item.type === 'model' || item.type === 'object' || item.type === 'array'
}

function itemAttrs(item: StructuredOutput): Record<string, TypedValue> | null {
  if (item.type === 'model') return item.attributes
  if (item.type === 'object') return item.properties
  return null
}

function renderAttrValue(tv: TypedValue): string {
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

function attrValueColor(tv: TypedValue): string {
  switch (tv.type) {
    case 'null':   return 'var(--text-muted)'
    case 'bool':   return 'var(--neon-purple)'
    case 'int':
    case 'float':  return '#FFB86C'
    case 'string': return 'var(--neon-green)'
    default:       return 'var(--text-secondary)'
  }
}

const hiddenCount = computed(() => Math.max(0, props.data.count - props.data.items.length))
</script>

<template>
  <div class="collection-inspector">
    <!-- Collection header -->
    <button class="collection-toggle" @click="collectionExpanded = !collectionExpanded">
      <span class="chevron" :class="{ open: collectionExpanded }">▶</span>
      <span class="badge-type">{{ shortClass(data.class) }}</span>
      <span class="count">({{ data.count }})</span>
    </button>

    <!-- Empty state -->
    <div v-if="collectionExpanded && data.count === 0" class="empty-state">
      Collection (0)
    </div>

    <!-- Items list -->
    <div v-if="collectionExpanded && data.items.length > 0" class="items">
      <div v-for="(item, i) in data.items" :key="i" class="collection-item">
        <!-- Item header row -->
        <div class="item-header" @click="isExpandable(item) ? toggleItem(i) : undefined">
          <span v-if="isExpandable(item)" class="item-chevron" :class="{ open: isItemExpanded(i) }">▶</span>
          <span v-else class="item-chevron-placeholder" />
          <span class="item-idx">{{ i }}</span>
          <span class="item-label" :style="{ color: itemLabelColor(item) }">{{ itemLabel(item) }}</span>
        </div>

        <!-- Expanded attributes (model/object) -->
        <div v-if="isItemExpanded(i) && itemAttrs(item)" class="item-attrs">
          <div
            v-for="(val, attrKey) in itemAttrs(item)!"
            :key="attrKey"
            class="attr-row"
          >
            <span class="attr-key">{{ attrKey }}</span>
            <span class="attr-val" :style="{ color: attrValueColor(val) }">{{ renderAttrValue(val) }}</span>
          </div>
        </div>

        <!-- Expanded array summary -->
        <div v-if="isItemExpanded(i) && item.type === 'array'" class="item-attrs array-summary">
          Array with {{ item.count }} items
        </div>
      </div>

      <!-- Hidden items note -->
      <div v-if="hiddenCount > 0" class="hidden-note">
        … {{ hiddenCount }} more items not loaded
      </div>
    </div>
  </div>
</template>

<style scoped>
.collection-inspector { display: block; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }

.collection-toggle { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; padding: 0; color: var(--text-primary); }
.chevron { font-size: 0.65rem; color: var(--text-muted); transition: transform 0.12s; display: inline-block; }
.chevron.open { transform: rotate(90deg); }

.badge-type { font-size: 0.7rem; background: rgba(189,147,249,0.12); color: var(--neon-purple); padding: 0 5px; border-radius: 3px; }
.count { color: var(--text-muted); }

.empty-state { color: var(--text-disabled); font-style: italic; margin-top: 4px; margin-left: 16px; font-size: 0.75rem; }

.items { margin-left: 16px; border-left: 1px solid var(--border-subtle); padding-left: 10px; margin-top: 4px; }

.collection-item { margin-bottom: 2px; }

.item-header { display: flex; align-items: baseline; gap: 6px; cursor: default; padding: 1px 0; }
.item-header:has(.item-chevron) { cursor: pointer; }

.item-chevron { font-size: 0.6rem; color: var(--text-muted); transition: transform 0.12s; display: inline-block; min-width: 10px; }
.item-chevron.open { transform: rotate(90deg); }
.item-chevron-placeholder { display: inline-block; min-width: 10px; }

.item-idx { color: var(--text-disabled); min-width: 20px; font-size: 0.75rem; }
.item-label { font-size: 0.8rem; }

.item-attrs { margin-left: 22px; border-left: 1px solid var(--border-subtle); padding-left: 8px; margin-top: 2px; margin-bottom: 4px; }
.attr-row { display: grid; grid-template-columns: minmax(70px, 120px) 1fr; gap: 8px; padding: 1px 0; }
.attr-key { color: var(--text-secondary); font-size: 0.75rem; }
.attr-val { font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.array-summary { color: var(--text-muted); font-style: italic; font-size: 0.75rem; }

.hidden-note { color: var(--text-disabled); font-size: 0.7rem; margin-top: 4px; font-style: italic; }
</style>
