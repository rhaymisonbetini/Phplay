import { ref, readonly } from 'vue'

export interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  handler: () => void | Promise<void>
}

const commands = ref<Command[]>([])

export function useCommandRegistry() {
  function register(command: Command): void {
    const existing = commands.value.findIndex((c) => c.id === command.id)
    if (existing !== -1) {
      commands.value.splice(existing, 1, command)
    } else {
      commands.value.push(command)
    }
  }

  function unregister(id: string): void {
    const idx = commands.value.findIndex((c) => c.id === id)
    if (idx !== -1) commands.value.splice(idx, 1)
  }

  function execute(id: string): void {
    commands.value.find((c) => c.id === id)?.handler()
  }

  return {
    commands: readonly(commands),
    register,
    unregister,
    execute
  }
}
