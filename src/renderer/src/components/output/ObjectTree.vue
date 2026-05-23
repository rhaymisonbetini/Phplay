<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  data: unknown
  depth?: number
  maxDepth?: number
  seen?: Set<object>
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  maxDepth: 5
})

const MAX_ITEMS_INITIAL = 10
const MAX_STRING_LENGTH = 100

const showMore = ref(false)
const expanded = ref(props.depth <= 1)
const strExpanded = ref(false)

const seen = props.seen ?? new Set<object>()

type DataType = 'null' | 'bool' | 'int' | 'float' | 'string' | 'array' | 'object' | 'circular' | 'maxdepth'

const dataType = computed((): DataType => {
  const v = props.data
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return 'bool'
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'float'
  if (typeof v === 'string') return 'string'
  if (Array.isArray(v)) {
    if (seen.has(v as object)) return 'circular'
    if (props.depth >= props.maxDepth) return 'maxdepth'
    return 'array'
  }
  if (typeof v === 'object') {
    if (seen.has(v as object)) return 'circular'
    if (props.depth >= props.maxDepth) return 'maxdepth'
    return 'object'
  }
  return 'string'
})

const isExpandable = computed(() => dataType.value === 'array' || dataType.value === 'object')

const entries = computed<Array<{ key: string; value: unknown }>>(() => {
  if (!isExpandable.value) return []
  const v = props.data as Record<string, unknown> | unknown[]
  if (Array.isArray(v)) {
    return v.map((item, i) => ({ key: String(i), value: item }))
  }
  return Object.entries(v as Record<string, unknown>).map(([k, val]) => ({ key: k, value: val }))
})

const visibleEntries = computed(() =>
  showMore.value ? entries.value : entries.value.slice(0, MAX_ITEMS_INITIAL)
)

const childSeen = computed(() => {
  if (!isExpandable.value) return seen
  const s = new Set<object>(seen)
  s.add(props.data as object)
  return s
})

const label = computed((): string => {
  switch (dataType.value) {
    case 'null':    return 'null'
    case 'bool':    return (props.data as boolean) ? 'true' : 'false'
    case 'int':
    case 'float':   return String(props.data)
    case 'string':  return formatString(props.data as string)
    case 'array':   return `Array (${(props.data as unknown[]).length})`
    case 'object':  {
      const cls = (props.data as { __class?: string }).__class
        ?? Object.getPrototypeOf(props.data as object)?.constructor?.name
        ?? 'Object'
      return `${cls} {${entries.value.length}}`
    }
    case 'circular': return '[Circular]'
    case 'maxdepth': return '[Max depth reached]'
    default:        return ''
  }
})

function formatString(s: string): string {
  if (s.length <= MAX_STRING_LENGTH || strExpanded.value) return `"${s}"`
  return `"${s.slice(0, MAX_STRING_LENGTH)}…"`
}

const isLongString = computed(
  () => dataType.value === 'string' && (props.data as string).length > MAX_STRING_LENGTH
)
</script>

<template>
  <!-- Circular / max depth -->
  <span v-if="dataType === 'circular'" class="tree-circular">[Circular]</span>
  <span v-else-if="dataType === 'maxdepth'" class="tree-maxdepth">[…]</span>

  <!-- Primitives -->
  <span v-else-if="dataType === 'null'" class="tree-null">null</span>
  <span v-else-if="dataType === 'bool'" class="tree-bool">{{ label }}</span>
  <span v-else-if="dataType === 'int' || dataType === 'float'" class="tree-num">{{ label }}</span>
  <span v-else-if="dataType === 'string'" class="tree-str">
    {{ formatString(data as string) }}
    <button v-if="isLongString" class="tree-show-more-str" @click.stop="strExpanded = !strExpanded">
      {{ strExpanded ? 'less' : 'more' }}
    </button>
  </span>

  <!-- Expandable: array or object -->
  <span v-else class="tree-node">
    <button class="tree-toggle" @click.stop="expanded = !expanded">
      <span class="tree-chevron" :class="{ open: expanded }">▶</span>
      <span class="tree-label">{{ label }}</span>
    </button>

    <div v-if="expanded" class="tree-children">
      <div v-for="entry in visibleEntries" :key="entry.key" class="tree-row">
        <span class="tree-key">{{ entry.key }}</span>
        <span class="tree-colon">:</span>
        <ObjectTree
          :data="entry.value"
          :depth="(depth ?? 0) + 1"
          :max-depth="maxDepth"
          :seen="childSeen"
        />
      </div>

      <button
        v-if="!showMore && entries.length > MAX_ITEMS_INITIAL"
        class="tree-show-more"
        @click="showMore = true"
      >
        … {{ entries.length - MAX_ITEMS_INITIAL }} more items
      </button>
    </div>
  </span>
</template>

<style scoped>
.tree-null     { color: var(--text-muted); font-style: italic; }
.tree-bool     { color: var(--neon-purple); }
.tree-num      { color: #FFB86C; }
.tree-str      { color: var(--neon-green); word-break: break-all; }
.tree-circular { color: var(--text-disabled); font-style: italic; }
.tree-maxdepth { color: var(--text-disabled); font-style: italic; }

.tree-node { display: block; }
.tree-toggle { display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; padding: 0; color: var(--text-primary); font-family: inherit; font-size: inherit; }
.tree-toggle:hover .tree-label { color: var(--neon-blue); }

.tree-chevron { font-size: 0.55rem; color: var(--text-muted); transition: transform 0.12s; display: inline-block; }
.tree-chevron.open { transform: rotate(90deg); }

.tree-label { color: var(--text-secondary); font-size: 0.8rem; }

.tree-children { border-left: 1px solid var(--border-subtle); margin-left: 6px; padding-left: 10px; margin-top: 2px; display: flex; flex-direction: column; gap: 2px; }
.tree-row { display: flex; align-items: baseline; gap: 6px; }
.tree-key { color: var(--neon-blue); font-size: 0.75rem; flex-shrink: 0; }
.tree-colon { color: var(--text-disabled); }

.tree-show-more { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.7rem; font-family: inherit; padding: 2px 0; }
.tree-show-more:hover { color: var(--text-primary); }
.tree-show-more-str { background: none; border: none; cursor: pointer; color: var(--neon-blue); font-size: 0.7rem; font-family: inherit; padding: 0 4px; text-decoration: underline; }
</style>
