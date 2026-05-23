export interface TypedValue {
  type: 'null' | 'bool' | 'int' | 'float' | 'string' | 'array' | 'object' | 'unknown' | 'truncated'
  value?: unknown
  class?: string
  count?: number
  remaining?: number
}

export interface ArrayItem {
  key: string | number
  value: TypedValue
}

export interface TraceFrame {
  file: string
  line: number
  function: string
}

export type StructuredOutput =
  | { type: 'null' }
  | { type: 'bool'; value: boolean }
  | { type: 'int'; value: number }
  | { type: 'float'; value: number }
  | { type: 'string'; value: string }
  | { type: 'array'; count: number; items: ArrayItem[] }
  | { type: 'collection'; class: string; count: number; items: TypedValue[] }
  | { type: 'model'; class: string; attributes: Record<string, TypedValue> }
  | { type: 'object'; class: string; properties: Record<string, TypedValue> }
  | { type: 'exception'; class: string; message: string; file: string; line: number; trace: TraceFrame[] }

export type ParsedOutputChunk =
  | { kind: 'text'; content: string }
  | { kind: 'structured'; data: StructuredOutput }

const PREFIX = '__PHPLAY_OUTPUT__:'

export function parseOutput(stdout: string): ParsedOutputChunk[] {
  const chunks: ParsedOutputChunk[] = []
  const textLines: string[] = []

  for (const line of stdout.split('\n')) {
    if (line.startsWith(PREFIX)) {
      if (textLines.length > 0) {
        const text = textLines.join('\n').trimEnd()
        if (text) chunks.push({ kind: 'text', content: text })
        textLines.length = 0
      }
      try {
        const data = JSON.parse(line.slice(PREFIX.length)) as StructuredOutput
        chunks.push({ kind: 'structured', data })
      } catch {
        textLines.push(line)
      }
    } else {
      textLines.push(line)
    }
  }

  const remaining = textLines.join('\n').trimEnd()
  if (remaining) chunks.push({ kind: 'text', content: remaining })

  return chunks
}

export function hasStructuredOutput(stdout: string): boolean {
  return stdout.includes(PREFIX)
}
