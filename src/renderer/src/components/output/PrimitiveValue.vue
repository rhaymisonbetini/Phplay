<script setup lang="ts">
import type { StructuredOutput } from '../../composables/useOutputParser'

defineProps<{
  data: Extract<StructuredOutput, { type: 'null' | 'bool' | 'int' | 'float' | 'string' }>
}>()
</script>

<template>
  <span v-if="data.type === 'null'" class="pv-null">null</span>
  <span v-else-if="data.type === 'bool'" class="pv-bool">{{ (data as { value: boolean }).value ? 'true' : 'false' }}</span>
  <span v-else-if="data.type === 'int' || data.type === 'float'" class="pv-num">{{ (data as { value: number }).value }}</span>
  <span v-else-if="data.type === 'string'" class="pv-str">"{{ (data as { value: string }).value }}"</span>
</template>

<style scoped>
.pv-null { color: var(--text-muted); font-style: italic; }
.pv-bool { color: var(--neon-purple); }
.pv-num  { color: var(--neon-orange, #FFB86C); }
.pv-str  { color: var(--neon-green); }
</style>
