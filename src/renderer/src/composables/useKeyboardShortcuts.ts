import { onMounted, onBeforeUnmount } from 'vue'

type ShortcutHandler = () => void

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  function onKeydown(e: KeyboardEvent) {
    for (const s of shortcuts) {
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
      const altMatch = s.alt ? e.altKey : !e.altKey
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault()
        s.handler()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown, true))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
}
