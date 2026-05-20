import { watch, ref } from 'vue'
import type { Ref } from 'vue'
import type { Session } from '../stores/session'

const DEBOUNCE_MS = 500

export function useSnippetPersistence(
  sessions: Ref<Session[]>,
  projectPath: Ref<string | null>
) {
  const isSaved = ref(true)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    sessions,
    () => {
      if (!projectPath.value) return
      isSaved.value = false
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => persist(), DEBOUNCE_MS)
    },
    { deep: true }
  )

  async function persist(): Promise<void> {
    if (!projectPath.value) return
    try {
      const payload = sessions.value.map((s) => ({ id: s.id, name: s.name, code: s.code }))
      await window.electronAPI.saveSession(projectPath.value, payload)
      isSaved.value = true
    } catch {
      // silent — persistence is best-effort
    }
  }

  async function restore(path: string): Promise<void> {
    try {
      const raw = await window.electronAPI.loadSession(path)
      if (!Array.isArray(raw) || raw.length === 0) return
      // Handled by caller (project store) to avoid circular dependency
    } catch {
      // no saved session — start fresh
    }
  }

  return { isSaved, restore }
}
