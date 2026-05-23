import { ref, computed } from 'vue'
import type { LogEntry, LogCategory } from '../types/log'

const MAX_ENTRIES = 500

const entries = ref<LogEntry[]>([])
let seq = 0

export function useAppLogs() {
  function add(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const log: LogEntry = {
      id: `log-${++seq}`,
      timestamp: Date.now(),
      ...entry
    }
    entries.value.push(log)
    if (entries.value.length > MAX_ENTRIES) {
      entries.value.splice(0, entries.value.length - MAX_ENTRIES)
    }
  }

  function clear(): void {
    entries.value = []
  }

  function filtered(category: LogCategory | 'all'): LogEntry[] {
    return category === 'all'
      ? entries.value
      : entries.value.filter((e) => e.category === category)
  }

  const all = computed(() => entries.value)

  return { entries: all, add, clear, filtered }
}
