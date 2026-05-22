import { IntelephenseLsp } from './IntelephenseLsp'
import type { Logger } from '../storage/Logger'

interface LspEntry {
  lsp: IntelephenseLsp
  projectPath: string
  lspCachePath: string
}

export class LanguageServerManager {
  private readonly instances = new Map<string, LspEntry>()
  private activeWorkspaceId: string | null = null

  get(workspaceId: string): IntelephenseLsp | null {
    return this.instances.get(workspaceId)?.lsp ?? null
  }

  getActive(): IntelephenseLsp | null {
    if (!this.activeWorkspaceId) return null
    return this.get(this.activeWorkspaceId)
  }

  start(
    workspaceId: string,
    projectPath: string,
    lspCachePath: string,
    logger: Logger,
    onStateChanged: (payload: unknown) => void
  ): IntelephenseLsp {
    // Stop previous instance for this workspace if any
    this.stop(workspaceId)

    const lsp = new IntelephenseLsp()
    lsp.setLogger(logger)
    lsp.on('stateChanged', onStateChanged)
    lsp.start(lspCachePath)

    this.instances.set(workspaceId, { lsp, projectPath, lspCachePath })
    this.activeWorkspaceId = workspaceId

    return lsp
  }

  stop(workspaceId: string): void {
    const entry = this.instances.get(workspaceId)
    if (!entry) return
    entry.lsp.removeAllListeners()
    entry.lsp.stop()
    this.instances.delete(workspaceId)
    if (this.activeWorkspaceId === workspaceId) {
      this.activeWorkspaceId = null
    }
  }

  stopAll(): void {
    for (const [id] of this.instances) {
      this.stop(id)
    }
  }
}
