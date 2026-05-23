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
    projectName?: string
    phpVersions?: Array<{ path: string; version: string }>
    selectedPhp?: string
    isSaved?: boolean
    lspReady?: boolean
    lspState?: string
    hasProject?: boolean
  }>(),
  {
    framework: 'plain',
    phpVersion: undefined,
    phpPath: undefined,
    executionTimeMs: null,
    memoryUsedKb: null,
    projectPath: undefined,
    projectName: undefined,
    phpVersions: () => [],
    selectedPhp: '',
    isSaved: true,
    lspReady: true,
    lspState: 'stopped',
    hasProject: false
  }
)

const emit = defineEmits<{
  'open-project': []
  'select-php': [path: string]
  'open-php-config': []
  'restart-lsp': []
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

const isIndexing = computed(() => props.hasProject && (props.lspState === 'initializing' || props.lspState === 'starting'))
const isLspError = computed(() => props.lspState === 'error')
const isLspReady = computed(() => props.hasProject && props.lspState === 'ready')
</script>

<template>
  <div
    class="flex h-6 shrink-0 items-center justify-between border-t border-border-subtle bg-bg-app px-3"
    style="height: var(--statusbar-height)"
  >
    <!-- Left side -->
    <div class="flex items-center gap-2">
      <!-- Framework + project name -->
      <button
        class="status-item-btn gap-1"
        :title="projectPath ? `Projeto: ${projectPath}` : 'Nenhum projeto aberto — clique para abrir'"
        @click="emit('open-project')"
      >
        <!-- Laravel flame dot -->
        <span
          class="h-1.5 w-1.5 rounded-full shrink-0"
          :class="{
            'bg-red-400': framework === 'laravel',
            'bg-blue-400': framework === 'wordpress',
            'bg-zinc-400': framework === 'symfony',
            'bg-indigo-400': framework === 'plain'
          }"
        />
        <span :class="frameworkColor">{{ frameworkLabel }}</span>

        <!-- Project folder name -->
        <template v-if="projectName">
          <span class="text-border-strong mx-0.5">·</span>
          <span class="text-text-muted font-medium">{{ projectName }}</span>
        </template>
      </button>

      <!-- PHP version -->
      <div class="flex items-center gap-1">
        <button
          class="status-item-btn"
          :title="currentPhpVersion ? `PHP path: ${selectedPhp}` : 'Clique para configurar PHP'"
          @click="emit('open-php-config')"
        >
          <span v-if="currentPhpVersion" class="text-2xs">PHP {{ currentPhpVersion }}</span>
          <span v-else class="text-2xs text-error">Sem PHP — configurar</span>
        </button>

        <select
          v-if="phpVersions.length > 1"
          class="cursor-pointer bg-transparent text-2xs text-text-muted outline-none transition-colors hover:text-text-primary"
          :value="selectedPhp"
          @change="emit('select-php', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="php in phpVersions" :key="php.path" :value="php.path">
            PHP {{ php.version }}
          </option>
        </select>
      </div>

      <!-- Execution metrics -->
      <template v-if="executionTimeMs !== null">
        <span class="text-border-strong">·</span>
        <div class="status-item gap-2">
          <span class="text-success" title="Tempo de execução">{{ executionTimeMs }}ms</span>
          <span v-if="formattedMemory" class="text-text-muted" title="Memória usada">{{ formattedMemory }}</span>
        </div>
      </template>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2">
      <!-- LSP Indexing indicator -->
      <span
        v-if="isIndexing"
        class="status-item gap-1 text-text-disabled"
        title="Intelephense está indexando o projeto…"
      >
        <span class="spinner" style="width: 7px; height: 7px; border-width: 1px; border-color: currentColor transparent transparent transparent" />
        <span class="text-2xs">Indexando…</span>
      </span>

      <!-- LSP error indicator -->
      <span
        v-if="isLspError"
        class="status-item gap-1 text-error cursor-pointer"
        title="PHP Intelligence com erro — clique para reiniciar"
        @click="$emit('restart-lsp')"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <path d="M4 0L7.5 7H0.5L4 0z" />
          <path d="M4 3v1.5M4 5.5h.01" stroke="white" stroke-width="1" fill="none" />
        </svg>
        <span class="text-2xs">LSP error</span>
      </span>

      <!-- LSP ready indicator -->
      <span
        v-if="isLspReady"
        class="status-item gap-1 status-ready"
        title="PHP Intelligence pronto"
        style="color: var(--neon-green)"
      >
        <span class="h-1.5 w-1.5 rounded-full" style="background: var(--neon-green)" />
        <span class="text-2xs">PHP ✓</span>
      </span>

      <span v-if="(isIndexing || isLspError || isLspReady) && projectPath" class="text-border-strong">·</span>

      <!-- Saved indicator -->
      <span
        v-if="projectPath"
        class="status-item gap-1 transition-opacity"
        :class="isSaved ? 'opacity-40' : 'opacity-100'"
        :title="isSaved ? 'Salvo' : 'Salvando…'"
      >
        <svg v-if="isSaved" width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" class="text-success">
          <path d="M1 4l2 2 4-3" />
        </svg>
        <span v-else class="spinner" style="width: 7px; height: 7px; border-width: 1px" />
        <span class="text-2xs">{{ isSaved ? 'saved' : 'saving…' }}</span>
      </span>

      <span class="text-border-strong" v-if="projectPath">·</span>

      <span class="status-item gap-1">
        <span class="h-1.5 w-1.5 rounded-full bg-success" />
        <span>local</span>
      </span>
    </div>
  </div>
</template>
