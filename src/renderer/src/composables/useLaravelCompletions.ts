import type * as Monaco from 'monaco-editor'

interface RouteEntry {
  name: string | null
  uri: string
  method: string
  action: string
}

interface LaravelMetadata {
  routes: RouteEntry[]
  artisanCommands: Array<{ name: string; description: string }>
  models: string[]
  composer: { laravelVersion: string | null }
}

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: unknown }

function unwrap<T>(result: unknown): T | null {
  if (result && typeof result === 'object' && 'ok' in result) {
    const r = result as IpcResult<T>
    return r.ok ? r.data : null
  }
  return null
}

// Matches: config(' | route(' | app(' | Artisan::call('
const STRING_ARG_RE = /\b(config|route|app|Artisan::call)\(['"]([^'"]*)?$/

export function registerLaravelCompletionProvider(
  monaco: typeof Monaco,
  meta: LaravelMetadata
): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('php', {
    triggerCharacters: ["'", '"'],
    provideCompletionItems(model, position) {
      const lineText = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      })

      const match = lineText.match(STRING_ARG_RE)
      if (!match) return { suggestions: [] }

      const fn = match[1]
      const partial = match[2] ?? ''

      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - partial.length,
        endColumn: position.column
      }

      if (fn === 'route') {
        return {
          suggestions: meta.routes
            .filter((r) => r.name && r.name.startsWith(partial))
            .map((r) => ({
              label: r.name!,
              kind: monaco.languages.CompletionItemKind.Value,
              detail: `${r.method} /${r.uri}`,
              insertText: r.name!,
              range,
              sortText: '0' + r.name
            }))
        }
      }

      if (fn === 'config') {
        return { suggestions: [] } // populated when config keys are discovered
      }

      if (fn === 'Artisan::call') {
        return {
          suggestions: meta.artisanCommands
            .filter((c) => c.name.startsWith(partial))
            .map((c) => ({
              label: c.name,
              kind: monaco.languages.CompletionItemKind.Function,
              detail: c.description,
              insertText: c.name,
              range,
              sortText: '0' + c.name
            }))
        }
      }

      return { suggestions: [] }
    }
  })
}

export async function loadLaravelMeta(
  projectPath: string,
  phpBinary: string
): Promise<LaravelMetadata | null> {
  try {
    const result = await window.electronAPI.laravelDiscover(projectPath, phpBinary)
    return unwrap<LaravelMetadata>(result)
  } catch {
    return null
  }
}
