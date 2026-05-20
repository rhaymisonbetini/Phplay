import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExecutionResult } from '../types/electron'

export interface Session {
  id: string
  name: string
  code: string
  output: ExecutionResult | null
  isRunning: boolean
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([
    { id: '1', name: 'Session 1', code: '<?php\n\n', output: null, isRunning: false }
  ])
  const activeSessionId = ref('1')

  const activeSession = computed(() => sessions.value.find((s) => s.id === activeSessionId.value))

  function newSession(): void {
    const id = String(Date.now())
    sessions.value.push({
      id,
      name: `Session ${sessions.value.length + 1}`,
      code: '<?php\n\n',
      output: null,
      isRunning: false
    })
    activeSessionId.value = id
  }

  function closeSession(id: string): void {
    if (sessions.value.length <= 1) return
    const index = sessions.value.findIndex((s) => s.id === id)
    if (index === -1) return
    sessions.value.splice(index, 1)
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[Math.max(0, index - 1)].id
    }
  }

  function setCode(id: string, code: string): void {
    const session = sessions.value.find((s) => s.id === id)
    if (session) session.code = code
  }

  function setOutput(id: string, output: ExecutionResult | null): void {
    const session = sessions.value.find((s) => s.id === id)
    if (session) session.output = output
  }

  function setRunning(id: string, running: boolean): void {
    const session = sessions.value.find((s) => s.id === id)
    if (session) session.isRunning = running
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    newSession,
    closeSession,
    setCode,
    setOutput,
    setRunning
  }
})
