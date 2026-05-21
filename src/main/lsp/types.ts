export type LanguageServerState =
  | 'stopped'
  | 'starting'
  | 'initializing'
  | 'ready'
  | 'error'

export interface LspStateChangedPayload {
  state: LanguageServerState
  message?: string
}
