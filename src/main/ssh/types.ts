export interface SshConnectionConfig {
  id: string
  name: string
  color: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKeyPath?: string
  passphrase?: string
  remotePath: string
  phpBinary?: string
}
