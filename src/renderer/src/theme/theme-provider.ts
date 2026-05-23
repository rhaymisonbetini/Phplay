import { ref } from 'vue'
import type { ThemeVariant, Theme } from './theme'
import { draculaNeon } from './dracula-neon'
import { midnight } from './midnight'
import { nord } from './nord'

const STORAGE_KEY = 'phplay-theme'

const registry: Record<string, Theme> = {
  'dracula-neon': draculaNeon,
  'midnight': midnight,
  'nord': nord,
}

const current = ref<ThemeVariant>('dracula-neon')

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
  current.value = theme.name
}

export function registerTheme(theme: Theme): void {
  registry[theme.name] = theme
}

export function useTheme() {
  function apply(variant?: ThemeVariant): void {
    const theme = registry[variant ?? current.value] ?? draculaNeon
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme.name)
  }

  function init(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeVariant | null
    apply(saved ?? 'dracula-neon')
  }

  function list(): Theme[] {
    return Object.values(registry)
  }

  return { current, apply, init, list }
}
