<script setup lang="ts">
import type { SshConnectionConfig } from '../types/electron'

defineProps<{
  projectName?: string
  sessionName?: string
  activeSsh?: SshConnectionConfig | null
}>()
</script>

<template>
  <div
    class="drag-region flex h-8 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-app px-4"
    style="height: var(--titlebar-height)"
  >
    <div class="flex items-center gap-2 no-drag">
      <!-- Phplay logo mark — PHP purple glow -->
      <svg width="15" height="15" viewBox="0 0 14 14" fill="none" class="logo-mark">
        <rect width="14" height="14" rx="3" fill="currentColor" fill-opacity="0.18" />
        <path
          d="M3 4h3.5a2 2 0 0 1 0 4H3V4z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          fill="none"
        />
        <path d="M6.5 8v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M9.5 4v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="text-xs font-semibold tracking-wide" style="color: var(--text-primary)">Phplay</span>
    </div>

    <div class="text-2xs flex items-center gap-1.5" style="color: var(--text-disabled)">
      <!-- SSH mode: show SSH badge + connection name -->
      <template v-if="activeSsh">
        <span
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-semibold"
          :style="{ background: activeSsh.color + '28', color: activeSsh.color, border: '1px solid ' + activeSsh.color + '55' }"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="0.5" y="0.5" width="9" height="4" rx="0.75" />
            <rect x="0.5" y="5.5" width="9" height="4" rx="0.75" />
          </svg>
          SSH
        </span>
        <span style="color: var(--text-secondary)" class="font-medium">{{ activeSsh.name }}</span>
        <span class="opacity-40 mx-0.5">·</span>
        <span class="opacity-50">{{ activeSsh.username }}@{{ activeSsh.host }}</span>
      </template>

      <!-- Normal mode -->
      <template v-else>
        <span v-if="projectName" style="color: var(--text-secondary)">{{ projectName }}</span>
        <span v-if="projectName && sessionName" class="mx-1 opacity-40">·</span>
        <span v-if="sessionName" style="color: var(--text-disabled)">{{ sessionName }}</span>
        <span v-else-if="!projectName" class="opacity-50">PHP REPL</span>
      </template>
    </div>

    <div class="no-drag">
      <span
        class="rounded-full px-2 py-0.5 text-2xs"
        style="background: var(--bg-overlay); color: var(--text-disabled)"
      >v0.3.0</span>
    </div>
  </div>
</template>

<style scoped>
.logo-mark {
  color: var(--php-glow);
  filter: drop-shadow(0 0 4px rgba(157, 91, 255, 0.45));
}
</style>
