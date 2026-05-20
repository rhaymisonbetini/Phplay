<script setup lang="ts">
import { computed } from 'vue'

type Framework = 'laravel' | 'symfony' | 'wordpress' | 'plain'

const props = withDefaults(
  defineProps<{
    framework?: Framework
    phpVersion?: string
    phpPath?: string
    executionTimeMs?: number | null
    memoryUsedKb?: number | null
    projectPath?: string
    phpVersions?: Array<{ path: string; version: string }>
    selectedPhp?: string
  }>(),
  {
    framework: 'plain',
    phpVersion: undefined,
    phpPath: undefined,
    executionTimeMs: null,
    memoryUsedKb: null,
    projectPath: undefined,
    phpVersions: () => [],
    selectedPhp: ''
  }
)

const emit = defineEmits<{
  'open-project': []
  'select-php': [path: string]
  'open-php-config': []
}>()

const frameworkLabel = computed(() => {
  const map: Record<Framework, string> = {
    laravel: 'Laravel',
    symfony: 'Symfony',
    wordpress: 'WordPress',
    plain: 'PHP'
  }
  return map[props.framework]
})

const frameworkColor = computed(() => {
  const map: Record<Framework, string> = {
    laravel: 'text-red-400',
    symfony: 'text-zinc-400',
    wordpress: 'text-blue-400',
    plain: 'text-indigo-400'
  }
  return map[props.framework]
})

const formattedMemory = computed(() => {
  if (props.memoryUsedKb === null || props.memoryUsedKb === undefined) return null
  if (props.memoryUsedKb >= 1024) return `${(props.memoryUsedKb / 1024).toFixed(1)}MB`
  return `${props.memoryUsedKb}KB`
})

const currentPhpVersion = computed(() => {
  if (!props.selectedPhp || !props.phpVersions.length) return props.phpVersion ?? null
  return props.phpVersions.find((p) => p.path === props.selectedPhp)?.version ?? null
})
</script>

<template>
  <div
    class="flex h-6 shrink-0 items-center justify-between border-t border-border-subtle bg-bg-app px-3"
    style="height: var(--statusbar-height)"
  >
    <!-- Left side: framework + php version -->
    <div class="flex items-center gap-2">
      <!-- Framework badge -->
      <button
        class="status-item-btn gap-1"
        :title="projectPath ? `Project: ${projectPath}` : 'No project open — click to open'"
        @click="emit('open-project')"
      >
        <!-- Laravel flame icon -->
        <svg
          v-if="framework === 'laravel'"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="text-red-400"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
        <!-- Generic dot for others -->
        <span v-else class="h-1.5 w-1.5 rounded-full" :class="frameworkColor" />
        <span :class="frameworkColor">{{ frameworkLabel }}</span>
      </button>

      <!-- PHP version selector -->
      <div class="flex items-center gap-1">
        <button
          class="status-item-btn"
          :title="currentPhpVersion ? `PHP path: ${selectedPhp}` : 'Click to configure PHP'"
          @click="emit('open-php-config')"
        >
          <span v-if="currentPhpVersion" class="text-2xs">PHP {{ currentPhpVersion }}</span>
          <span v-else class="text-2xs text-error">No PHP — click to configure</span>
        </button>

        <!-- Multi-version dropdown -->
        <select
          v-if="phpVersions.length > 1"
          class="cursor-pointer bg-transparent text-2xs text-text-muted outline-none transition-colors hover:text-text-primary"
          :value="selectedPhp"
          @change="emit('select-php', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="php in phpVersions"
            :key="php.path"
            :value="php.path"
          >
            PHP {{ php.version }}
          </option>
        </select>
      </div>

      <!-- Separator -->
      <span v-if="executionTimeMs !== null" class="text-border-strong">·</span>

      <!-- Execution metrics -->
      <div v-if="executionTimeMs !== null" class="status-item gap-2">
        <span class="text-success" title="Execution time">{{ executionTimeMs }}ms</span>
        <span v-if="formattedMemory" class="text-text-muted" title="Memory used">{{ formattedMemory }}</span>
      </div>
    </div>

    <!-- Right side: connection type -->
    <div class="flex items-center gap-2">
      <span class="status-item gap-1">
        <span class="h-1.5 w-1.5 rounded-full bg-success" />
        <span>local</span>
      </span>
    </div>
  </div>
</template>
