import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Framework, ProjectInfo } from '../types/electron'

export interface OpenProject {
  path: string
  name: string
  framework: Framework
  frameworkVersion: string | null
  bootstrapPath: string | null
  hasVendor: boolean
  phpBinary: string
  openedAt: number
}

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref<OpenProject | null>(null)
  const isDetecting = ref(false)

  const projectName = computed(() => currentProject.value?.name ?? null)
  const framework = computed(() => currentProject.value?.framework ?? 'plain')
  const hasProject = computed(() => currentProject.value !== null)
  const needsVendor = computed(
    () =>
      currentProject.value?.framework === 'laravel' && !currentProject.value?.hasVendor
  )

  async function openProject(path: string, phpBinary: string): Promise<OpenProject> {
    isDetecting.value = true
    try {
      const info: ProjectInfo = await window.electronAPI.detectFramework(path)
      const name = path.split('/').pop() ?? path

      const project: OpenProject = {
        path,
        name,
        framework: info.framework,
        frameworkVersion: info.version,
        bootstrapPath: info.bootstrapPath,
        hasVendor: info.hasVendor,
        phpBinary,
        openedAt: Date.now()
      }

      currentProject.value = project
      return project
    } finally {
      isDetecting.value = false
    }
  }

  function closeProject(): void {
    currentProject.value = null
  }

  function updatePhpBinary(phpBinary: string): void {
    if (currentProject.value) {
      currentProject.value.phpBinary = phpBinary
    }
  }

  return {
    currentProject,
    isDetecting,
    projectName,
    framework,
    hasProject,
    needsVendor,
    openProject,
    closeProject,
    updatePhpBinary
  }
})
