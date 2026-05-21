export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }

export function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

export function fail(code: string, message: string, details?: unknown): IpcResult<never> {
  return { ok: false, error: { code, message, details } }
}
