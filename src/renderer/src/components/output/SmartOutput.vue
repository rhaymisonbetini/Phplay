<script setup lang="ts">
import type { StructuredOutput } from '../../composables/useOutputParser'
import PrimitiveValue from './PrimitiveValue.vue'
import ArrayInspector from './ArrayInspector.vue'
import ModelInspector from './ModelInspector.vue'
import CollectionInspector from './CollectionInspector.vue'
import ExceptionDisplay from './ExceptionDisplay.vue'

defineProps<{ data: StructuredOutput }>()
</script>

<template>
  <div class="smart-output">
    <PrimitiveValue
      v-if="['null','bool','int','float','string'].includes(data.type)"
      :data="data as Extract<StructuredOutput, { type: 'null'|'bool'|'int'|'float'|'string' }>"
    />
    <ArrayInspector
      v-else-if="data.type === 'array'"
      :data="data as Extract<StructuredOutput, { type: 'array' }>"
    />
    <CollectionInspector
      v-else-if="data.type === 'collection'"
      :data="data as Extract<StructuredOutput, { type: 'collection' }>"
    />
    <ModelInspector
      v-else-if="data.type === 'model' || data.type === 'object'"
      :data="data as Extract<StructuredOutput, { type: 'model'|'object' }>"
    />
    <ExceptionDisplay
      v-else-if="data.type === 'exception'"
      :data="data as Extract<StructuredOutput, { type: 'exception' }>"
    />
  </div>
</template>

<style scoped>
.smart-output {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
}
</style>
