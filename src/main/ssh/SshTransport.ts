import { Client, type ConnectConfig, type SFTPWrapper } from 'ssh2'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import type { SshConnectionConfig } from './types'

function expandPath(p: string): string {
  return p.replace(/^~(?=\/|$)/, homedir())
}

export class SshTransport {
  private conn: Client | null = null

  connect(config: SshConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new Client()

      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 10_000
      }

      if (config.authType === 'password') {
        connectConfig.password = config.password
      } else {
        connectConfig.privateKey = readFileSync(expandPath(config.privateKeyPath!))
        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase
        }
      }

      client.on('ready', () => {
        this.conn = client
        resolve()
      })

      client.on('error', (err) => {
        reject(err)
      })

      client.connect(connectConfig)
    })
  }

  exec(command: string, onChunk?: (chunk: string, stream: 'stdout' | 'stderr') => void): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.conn) {
        reject(new Error('Not connected'))
        return
      }

      let output = ''

      this.conn.exec(command, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        stream.on('data', (data: Buffer) => {
          const chunk = data.toString()
          output += chunk
          onChunk?.(chunk, 'stdout')
        })

        stream.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString()
          output += chunk
          onChunk?.(chunk, 'stderr')
        })

        stream.on('close', () => {
          resolve(output)
        })

        stream.on('error', reject)
      })
    })
  }

  uploadFile(localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.conn) {
        reject(new Error('Not connected'))
        return
      }

      this.conn.sftp((err, sftp: SFTPWrapper) => {
        if (err) {
          reject(err)
          return
        }

        sftp.fastPut(localPath, remotePath, (putErr) => {
          if (putErr) {
            reject(putErr)
          } else {
            resolve()
          }
        })
      })
    })
  }

  downloadFile(
    remotePath: string,
    localPath: string,
    onProgress?: (transferred: number, total: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.conn) {
        reject(new Error('Not connected'))
        return
      }

      this.conn.sftp((err, sftp: SFTPWrapper) => {
        if (err) {
          reject(err)
          return
        }

        sftp.fastGet(
          remotePath,
          localPath,
          { step: (transferred, _chunk, total) => onProgress?.(transferred, total) },
          (getErr) => {
            if (getErr) {
              reject(getErr)
            } else {
              resolve()
            }
          }
        )
      })
    })
  }

  disconnect(): void {
    this.conn?.end()
    this.conn = null
  }

  isConnected(): boolean {
    return this.conn !== null
  }
}
