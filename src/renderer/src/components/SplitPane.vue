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

const PADDING = 6  // px padding around the container
const HANDLE_W = 10 // px width of drag handle

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
  const innerWidth = rect.width - PADDING * 2 - HANDLE_W
  const mouseX = Math.max(0, e.clientX - rect.left - PADDING)
  const newPercent = (mouseX / innerWidth) * 100
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
  <div
    ref="container"
    class="flex h-full w-full"
    style="padding: 6px; background: var(--bg-app);"
  >
    <!-- Left pane -->
    <div
      class="flex flex-col overflow-hidden rounded-xl border border-border-subtle"
      style="background: var(--bg-elevated);"
      :style="{ flex: splitPercent + ' 0 0' }"
    >
      <slot name="left" />
    </div>

    <!-- Drag handle -->
    <div
      class="relative flex shrink-0 cursor-col-resize items-center justify-center"
      :style="{ width: HANDLE_W + 'px' }"
      @mousedown="onMouseDown"
    >
      <div
        class="h-10 w-px rounded-full transition-all duration-150"
        :class="isDragging ? 'bg-accent !h-16 opacity-100' : 'bg-border-subtle opacity-60 hover:opacity-100 hover:bg-accent'"
      />
    </div>

    <!-- Right pane -->
    <div
      class="flex flex-col overflow-hidden rounded-xl border border-border-subtle"
      style="background: var(--bg-elevated);"
      :style="{ flex: (100 - splitPercent) + ' 0 0' }"
    >
      <slot name="right" />
    </div>
  </div>
</template>
