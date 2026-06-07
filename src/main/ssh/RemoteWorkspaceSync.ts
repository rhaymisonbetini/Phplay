import { mkdir, writeFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { x as extractTar } from 'tar'
import { SshTransport } from './SshTransport'
import type { SshConnectionConfig } from './types'

export type SyncPhase = 'connecting' | 'archiving' | 'downloading' | 'extracting' | 'done' | 'error'

export interface SyncProgress {
  phase: SyncPhase
  percent?: number
  message?: string
  transferredBytes?: number
  totalBytes?: number
}

export type SyncProgressCallback = (progress: SyncProgress) => void

// Heavy / runtime dirs that hold no PHP source worth indexing. vendor/ is kept
// on purpose so the LSP can resolve framework base classes (Eloquent, etc.).
const EXCLUDES = [
  './node_modules',
  './.git',
  './storage',
  './tests',
  './public/storage'
]

/**
 * Mirrors a remote PHP project into a local cache so the local Intelephense
 * instance can index it (autocomplete, go-to-definition, hover) exactly as it
 * does for local projects.
 *
 * Transfer strategy: archive the project remotely with tar (keeping vendor/),
 * pull the single tarball over SFTP (binary-safe, fast for many small files),
 * then extract locally. A synced.json marker enables per-connection caching.
 */
export class RemoteWorkspaceSync {
  constructor(private readonly userData: string) {}

  private baseDir(connId: string): string {
    return join(this.userData, 'ssh-workspaces', connId)
  }

  projectPath(connId: string): string {
    return join(this.baseDir(connId), 'project')
  }

  /** Returns the local project path if a previous sync is cached, else null. */
  getCachedPath(connId: string): string | null {
    const marker = join(this.baseDir(connId), 'synced.json')
    return existsSync(marker) ? this.projectPath(connId) : null
  }

  async sync(config: SshConnectionConfig, onProgress?: SyncProgressCallback): Promise<string> {
    const base = this.baseDir(config.id)
    const projectDir = this.projectPath(config.id)
    const tgzLocal = join(base, 'snapshot.tgz')
    const tgzRemote = `/tmp/phplay-sync-${config.id}-${Date.now()}.tgz`

    const transport = new SshTransport()
    try {
      onProgress?.({ phase: 'connecting', message: `Connecting to ${config.host}…` })
      await transport.connect(config)

      onProgress?.({ phase: 'archiving', message: 'Archiving project on remote…' })
      await this.archiveRemote(transport, config.remotePath, tgzRemote)

      await mkdir(base, { recursive: true })
      onProgress?.({ phase: 'downloading', percent: 0, message: 'Downloading snapshot…' })
      await this.download(transport, tgzRemote, tgzLocal, onProgress)

      onProgress?.({ phase: 'extracting', message: 'Extracting locally…' })
      await rm(projectDir, { recursive: true, force: true })
      await mkdir(projectDir, { recursive: true })
      await extractTar({ file: tgzLocal, cwd: projectDir })

      // Cleanup: remote tarball + local archive (no longer needed once extracted).
      // Awaited so the remote rm completes before the connection is torn down.
      await transport.exec(`rm -f '${tgzRemote}'`).catch(() => undefined)
      await rm(tgzLocal, { force: true }).catch(() => undefined)

      await writeFile(
        join(base, 'synced.json'),
        JSON.stringify({ remotePath: config.remotePath, syncedAt: Date.now() }, null, 2),
        'utf-8'
      )

      onProgress?.({ phase: 'done', percent: 100, message: 'Remote project indexed.' })
      return projectDir
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      onProgress?.({ phase: 'error', message })
      throw err
    } finally {
      transport.disconnect()
    }
  }

  private async archiveRemote(transport: SshTransport, remotePath: string, tgzRemote: string): Promise<void> {
    const excludes = EXCLUDES.map((e) => `--exclude='${e}'`).join(' ')
    // tar may exit non-zero on live servers ("file changed as we read it"); that
    // is a warning, not a failure — we validate the resulting tarball instead.
    const cmd =
      `cd '${remotePath}' && tar czf '${tgzRemote}' ${excludes} . 2>/dev/null; ` +
      `test -s '${tgzRemote}' && echo __OK__ || echo __FAIL__`
    const out = await transport.exec(cmd)
    if (!out.includes('__OK__')) {
      throw new Error('Failed to archive remote project (tar produced no output — check remotePath and that tar is installed).')
    }
  }

  private async download(
    transport: SshTransport,
    tgzRemote: string,
    tgzLocal: string,
    onProgress?: SyncProgressCallback
  ): Promise<void> {
    let lastPercent = -1
    await transport.downloadFile(tgzRemote, tgzLocal, (transferred, total) => {
      if (!total) return
      const percent = Math.round((transferred / total) * 100)
      if (percent === lastPercent) return
      lastPercent = percent
      onProgress?.({
        phase: 'downloading',
        percent,
        transferredBytes: transferred,
        totalBytes: total,
        message: `Downloading snapshot… ${percent}%`
      })
    })
  }
}
