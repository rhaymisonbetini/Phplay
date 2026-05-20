<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    initialSplit?: number
    minSize?: number
  }>(),
  {
    initialSplit: 50,
    minSize: 20
  }
)

const container = ref<HTMLElement | null>(null)
const splitPercent = ref(props.initialSplit)
const isDragging = ref(false)

function onMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !container.value) return
  const rect = container.value.getBoundingClientRect()
  const newPercent = ((e.clientX - rect.left) / rect.width) * 100
  splitPercent.value = Math.max(props.minSize, Math.min(100 - props.minSize, newPercent))
}

function onMouseUp() {
  if (!isDragging.value) return
  isDragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div ref="container" class="flex h-full w-full overflow-hidden">
    <!-- Left pane -->
    <div class="flex flex-col overflow-hidden" :style="{ width: splitPercent + '%' }">
      <slot name="left" />
    </div>

    <!-- Drag handle -->
    <div
      class="relative z-10 flex w-px shrink-0 cursor-col-resize items-center justify-center bg-border-subtle transition-colors hover:bg-accent"
      :class="{ 'bg-accent': isDragging }"
      @mousedown="onMouseDown"
    >
      <div
        class="absolute h-8 w-3 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        :class="isDragging ? 'opacity-100' : ''"
      />
    </div>

    <!-- Right pane -->
    <div
      class="flex flex-col overflow-hidden"
      :style="{ width: 100 - splitPercent + '%' }"
    >
      <slot name="right" />
    </div>
  </div>
</template>
