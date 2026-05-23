<script setup lang="ts">
import { useTheme } from '../../theme/theme-provider'
import type { Theme } from '../../theme/theme'

const { current, apply, list } = useTheme()
const themes = list()

const SWATCHES: Record<string, string[]> = {
  'dracula-neon': ['#161B22', '#1E2430', '#00D8FF', '#BD93F9', '#50FA7B'],
  'midnight':     ['#0D1117', '#161B22', '#58A6FF', '#C9A0DC', '#3FB950'],
  'nord':         ['#2E3440', '#3B4252', '#88C0D0', '#B48EAD', '#A3BE8C'],
  'system':       ['#1a1a1a', '#2d2d2d', '#6b7dff', '#9b59b6', '#2ecc71'],
}

function swatches(t: Theme): string[] {
  return SWATCHES[t.name] ?? []
}

function select(t: Theme): void {
  apply(t.name)
}
</script>

<template>
  <div class="theme-sidebar">
    <!-- Header -->
    <div class="panel-header">
      <span class="text-xs text-text-muted font-medium tracking-wide uppercase">Theme</span>
    </div>

    <!-- Theme list -->
    <div class="theme-list">
      <button
        v-for="theme in themes"
        :key="theme.name"
        class="theme-option"
        :class="{ active: current === theme.name }"
        @click="select(theme)"
      >
        <!-- Radio indicator -->
        <span class="radio" :class="{ 'radio--on': current === theme.name }">
          <span v-if="current === theme.name" class="radio-dot" />
        </span>

        <!-- Info -->
        <div class="theme-info">
          <span class="theme-name">{{ theme.label }}</span>
          <!-- Color swatches -->
          <div class="swatches">
            <span
              v-for="(color, i) in swatches(theme)"
              :key="i"
              class="swatch"
              :style="{ background: color }"
            />
          </div>
        </div>

        <!-- Active check -->
        <span v-if="current === theme.name" class="active-check">✓</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-sidebar { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.theme-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; }

.theme-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s, border-color 0.1s;
  width: 100%;
}
.theme-option:hover { background: var(--bg-elevated); }
.theme-option.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }

.radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--border-default);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.1s;
}
.radio--on { border-color: var(--accent); }
.radio-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }

.theme-info { flex: 1; min-width: 0; }
.theme-name { display: block; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 5px; }

.swatches { display: flex; gap: 3px; }
.swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }

.active-check { color: var(--accent); font-size: 0.75rem; flex-shrink: 0; }
</style>
