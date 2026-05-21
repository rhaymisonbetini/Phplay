<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { Command } from '../composables/useCommandRegistry'

const props = defineProps<{
  commands: readonly Command[]
}>()

const emit = defineEmits<{
  close: []
  execute: [id: string]
}>()

const query = ref('')
const selectedIndex = ref(0)
const input = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return props.commands.slice(0, 20) as Command[]
  return props.commands.filter(
    (c) => c.label.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
  ).slice(0, 20) as Command[]
})

watch(filtered, () => { selectedIndex.value = 0 })

watch(() => props.commands, async () => {
  await nextTick()
  input.value?.focus()
}, { immediate: true })

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % Math.max(1, filtered.value.length)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value - 1 + filtered.value.length) % Math.max(1, filtered.value.length)
  } else if (e.key === 'Enter') {
    const cmd = filtered.value[selectedIndex.value]
    if (cmd) { emit('execute', cmd.id); emit('close') }
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

function select(cmd: Command): void {
  emit('execute', cmd.id)
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
    style="background: rgba(0,0,0,0.5)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg rounded-lg border border-border-subtle bg-bg-elevated shadow-2xl overflow-hidden"
      @keydown="onKeydown"
    >
      <!-- Search input -->
      <div class="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-disabled shrink-0">
          <circle cx="6" cy="6" r="4.5" />
          <path d="M9.5 9.5L13 13" stroke-linecap="round" />
        </svg>
        <input
          ref="input"
          v-model="query"
          class="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-disabled"
          placeholder="Type a command…"
          autofocus
        />
        <kbd class="text-2xs text-text-disabled bg-bg-app rounded px-1.5 py-0.5">Esc</kbd>
      </div>

      <!-- Command list -->
      <div class="max-h-72 overflow-y-auto py-1">
        <div v-if="filtered.length === 0" class="px-4 py-6 text-center text-xs text-text-disabled">
          No commands found
        </div>

        <button
          v-for="(cmd, idx) in filtered"
          :key="cmd.id"
          class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
          :class="idx === selectedIndex ? 'bg-accent/10 text-text-primary' : 'text-text-muted hover:bg-bg-app hover:text-text-primary'"
          @click="select(cmd)"
          @mousemove="selectedIndex = idx"
        >
          <span class="flex-1 text-sm">{{ cmd.label }}</span>
          <span v-if="cmd.shortcut" class="text-2xs text-text-disabled shrink-0">{{ cmd.shortcut }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
