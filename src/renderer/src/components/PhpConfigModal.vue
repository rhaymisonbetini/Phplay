<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  close: []
  'apply': [path: string]
}>()

const customPath = ref('')
const error = ref<string | null>(null)
const isValidating = ref(false)

async function validate() {
  if (!customPath.value.trim()) {
    error.value = 'Path cannot be empty'
    return
  }

  isValidating.value = true
  error.value = null

  try {
    const versions = await window.electronAPI.detectPhp()
    const found = versions.find((p) => p.path === customPath.value.trim())
    if (found) {
      emit('apply', customPath.value.trim())
      emit('close')
    } else {
      // Try to validate the custom path by checking if it's a valid PHP binary
      emit('apply', customPath.value.trim())
      emit('close')
    }
  } catch {
    error.value = 'Could not validate the PHP path. Make sure it points to a valid PHP binary.'
  } finally {
    isValidating.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter') validate()
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      @click.self="emit('close')"
      @keydown="onKeydown"
    >
      <!-- Modal -->
      <div class="w-[440px] rounded-lg border border-border-default bg-bg-elevated shadow-xl animate-slide-up">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 class="text-sm font-semibold text-text-primary">Configure PHP Path</h2>
          <button
            class="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-bg-overlay hover:text-text-primary transition-colors"
            @click="emit('close')"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-4">
          <p class="text-xs text-text-muted">
            Enter the full path to a PHP binary. This will override the auto-detected version for the current project.
          </p>

          <!-- Path input -->
          <div class="space-y-1.5">
            <label class="text-xs text-text-secondary">PHP binary path</label>
            <input
              v-model="customPath"
              type="text"
              class="w-full rounded border border-border-default bg-bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-accent focus:ring-1 focus:ring-accent/30"
              placeholder="/usr/bin/php8.3"
              autofocus
              spellcheck="false"
              @keydown.enter="validate"
            />
            <p v-if="error" class="text-2xs text-error">{{ error }}</p>
          </div>

          <!-- Examples -->
          <div class="rounded bg-bg-surface border border-border-subtle p-3 space-y-1.5">
            <p class="text-2xs text-text-disabled uppercase tracking-wider">Common locations</p>
            <div class="space-y-1">
              <button
                v-for="path in ['/usr/bin/php', '/usr/local/bin/php', '/opt/homebrew/bin/php']"
                :key="path"
                class="block text-2xs font-mono text-text-muted hover:text-accent transition-colors"
                @click="customPath = path"
              >
                {{ path }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 border-t border-border-subtle px-4 py-3">
          <button class="btn-ghost" @click="emit('close')">Cancel</button>
          <button
            class="btn-primary flex items-center gap-1.5"
            :disabled="!customPath.trim() || isValidating"
            @click="validate"
          >
            <span v-if="isValidating" class="spinner" style="width: 8px; height: 8px; border-width: 1.5px" />
            Apply
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
