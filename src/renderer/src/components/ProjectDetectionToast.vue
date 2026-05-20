<script setup lang="ts">
import { computed } from 'vue'

type Framework = 'laravel' | 'symfony' | 'wordpress' | 'plain'

type ToastState =
  | { type: 'detecting' }
  | { type: 'detected'; framework: Framework; projectName: string }
  | { type: 'no-vendor'; projectName: string }
  | { type: 'not-php'; path: string }
  | null

const props = defineProps<{
  state: ToastState
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const frameworkLabel: Record<Framework, string> = {
  laravel: 'Laravel',
  symfony: 'Symfony',
  wordpress: 'WordPress',
  plain: 'PHP'
}

const frameworkColor: Record<Framework, string> = {
  laravel: 'text-red-400',
  symfony: 'text-zinc-400',
  wordpress: 'text-blue-400',
  plain: 'text-indigo-400'
}

const isVisible = computed(() => props.state !== null)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-slow"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-fast"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible && state"
        class="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border-default bg-bg-elevated shadow-lg px-4 py-3 flex items-center gap-3 min-w-[280px]"
      >
        <!-- Detecting state -->
        <template v-if="state.type === 'detecting'">
          <div class="spinner" />
          <div>
            <p class="text-xs font-medium text-text-primary">Detecting project…</p>
            <p class="text-2xs text-text-muted">Scanning for PHP framework</p>
          </div>
        </template>

        <!-- Detected state -->
        <template v-else-if="state.type === 'detected'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-success shrink-0">
            <circle cx="8" cy="8" r="6" />
            <path d="M5 8l2 2 4-4" />
          </svg>
          <div class="min-w-0">
            <p class="text-xs font-medium text-text-primary">
              <span :class="frameworkColor[state.framework]">{{ frameworkLabel[state.framework] }}</span>
              · {{ state.projectName }}
            </p>
            <p class="text-2xs text-text-muted">Project loaded successfully</p>
          </div>
        </template>

        <!-- Missing vendor/ state -->
        <template v-else-if="state.type === 'no-vendor'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="text-warning shrink-0">
            <path d="M8 1L14.5 12H1.5L8 1z" />
            <path d="M8 6v3M8 11h.01" stroke="white" stroke-width="1.2" stroke-linecap="round" fill="none" />
          </svg>
          <div class="min-w-0">
            <p class="text-xs font-medium text-text-primary">Laravel detected — missing vendor/</p>
            <p class="text-2xs text-text-muted">Run <code class="font-mono text-accent">composer install</code> first</p>
          </div>
        </template>

        <!-- Not a PHP project -->
        <template v-else-if="state.type === 'not-php'">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-text-muted shrink-0">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3M8 11h.01" />
          </svg>
          <div class="min-w-0">
            <p class="text-xs font-medium text-text-primary">No PHP project detected</p>
            <p class="truncate text-2xs text-text-muted" :title="state.path">Running as plain PHP</p>
          </div>
        </template>

        <!-- Dismiss button -->
        <button
          class="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-disabled hover:bg-bg-overlay hover:text-text-primary transition-colors"
          @click="emit('dismiss')"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 1l6 6M7 1l-6 6" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
