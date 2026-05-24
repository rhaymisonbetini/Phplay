<script setup lang="ts">
import { computed } from 'vue'
import type { StructuredOutput } from '../../composables/useOutputParser'

type PrimitiveData = Extract<StructuredOutput, { type: 'null' | 'bool' | 'int' | 'float' | 'string' }>

const props = defineProps<{ data: PrimitiveData }>()

const boolVal = computed(() => props.data.type === 'bool' ? (props.data as Extract<PrimitiveData, { type: 'bool' }>).value : false)
const numVal = computed(() => (props.data.type === 'int' || props.data.type === 'float') ? (props.data as Extract<PrimitiveData, { type: 'int' }>).value : 0)
const strVal = computed(() => props.data.type === 'string' ? (props.data as Extract<PrimitiveData, { type: 'string' }>).value : '')
</script>

<template>
  <span v-if="data.type === 'null'" class="pv-null">null</span>
  <span v-else-if="data.type === 'bool'" class="pv-bool">{{ boolVal ? 'true' : 'false' }}</span>
  <span v-else-if="data.type === 'int' || data.type === 'float'" class="pv-num">{{ numVal }}</span>
  <span v-else-if="data.type === 'string'" class="pv-str">"{{ strVal }}"</span>
</template>

<style scoped>
.pv-null { color: var(--text-muted); font-style: italic; }
.pv-bool { color: var(--neon-purple); }
.pv-num  { color: var(--neon-orange, #FFB86C); }
.pv-str  { color: var(--neon-green); }
</style>
