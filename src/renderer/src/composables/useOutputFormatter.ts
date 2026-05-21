export type OutputType = 'json' | 'vardump' | 'printr' | 'plain' | 'empty'

export interface Badge {
  label: string
  cls: 'badge-primitive' | 'badge-string' | 'badge-array' | 'badge-object' | 'badge-bool' | 'badge-null' | 'badge-plain'
}

export interface FormattedOutput {
  type: OutputType
  html: string
  badge: Badge | null
  rawText: string
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── JSON ──────────────────────────────────────────────────────────────────────

function highlightJson(json: string): string {
  const esc = escHtml(json)
  return esc
    // strings as values: "value"
    .replace(/(:\s*)((?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))/g,
      (_, colon, val) => `${colon}<span class="hl-str">${val}</span>`)
    // strings as keys: "key":
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g,
      (_, key, colon) => `<span class="hl-key">${key}</span>${colon}`)
    // numbers
    .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g,
      (m, num) => m.replace(num, `<span class="hl-num">${num}</span>`))
    // booleans
    .replace(/:\s*(true|false)/g,
      (m, b) => m.replace(b, `<span class="hl-bool">${b}</span>`))
    // null
    .replace(/:\s*(null)/g,
      (m, n) => m.replace(n, `<span class="hl-null">${n}</span>`))
    // braces / brackets
    .replace(/([{}[\]])/g, '<span class="hl-brace">$1</span>')
}

function formatJson(raw: string): FormattedOutput {
  try {
    const parsed = JSON.parse(raw.trim())
    const pretty = JSON.stringify(parsed, null, 2)
    const html = `<pre class="output-pre">${highlightJson(pretty)}</pre>`

    const type = Array.isArray(parsed) ? 'array' : typeof parsed
    const badge: Badge =
      Array.isArray(parsed) ? { label: `Array[${parsed.length}]`, cls: 'badge-array' }
      : type === 'object' && parsed !== null ? { label: 'Object', cls: 'badge-object' }
      : type === 'string' ? { label: 'String', cls: 'badge-string' }
      : type === 'number' ? { label: 'Number', cls: 'badge-primitive' }
      : type === 'boolean' ? { label: String(parsed), cls: 'badge-bool' }
      : parsed === null ? { label: 'null', cls: 'badge-null' }
      : { label: 'JSON', cls: 'badge-plain' }

    return { type: 'json', html, badge, rawText: pretty }
  } catch {
    return formatPlain(raw)
  }
}

// ── var_dump ──────────────────────────────────────────────────────────────────

function highlightVarDump(raw: string): string {
  return escHtml(raw)
    // type(...) labels: int, float, string, bool, NULL, array, object
    .replace(/\b(int|float|string|bool|NULL|array|object)\b/g,
      '<span class="hl-type">$1</span>')
    // string values: "..."
    .replace(/(&quot;.*?&quot;)/g, '<span class="hl-str">$1</span>')
    // numbers inside parens
    .replace(/\((\d+(?:\.\d+)?)\)/g, '(<span class="hl-num">$1</span>)')
    // bool values
    .replace(/\b(true|false)\b/g, '<span class="hl-bool">$1</span>')
    // class names
    .replace(/\[&quot;(\w+)&quot;\]/g, '[<span class="hl-key">&quot;$1&quot;</span>]')
}

function varDumpBadge(raw: string): Badge {
  if (/^int\(/m.test(raw)) return { label: 'int', cls: 'badge-primitive' }
  if (/^float\(/m.test(raw)) return { label: 'float', cls: 'badge-primitive' }
  if (/^string\(/m.test(raw)) return { label: 'string', cls: 'badge-string' }
  if (/^bool\(/m.test(raw)) return { label: 'bool', cls: 'badge-bool' }
  if (/^NULL$/m.test(raw)) return { label: 'null', cls: 'badge-null' }
  if (/^array\(/m.test(raw)) {
    const m = raw.match(/^array\((\d+)\)/m)
    return { label: `Array[${m?.[1] ?? '?'}]`, cls: 'badge-array' }
  }
  if (/^object\(/m.test(raw)) {
    const m = raw.match(/^object\(([\w\\]+)\)/m)
    const name = m?.[1]?.split('\\').pop() ?? 'Object'
    return { label: name, cls: 'badge-object' }
  }
  return { label: 'dump', cls: 'badge-plain' }
}

// ── print_r ───────────────────────────────────────────────────────────────────

function highlightPrintR(raw: string): string {
  return escHtml(raw)
    .replace(/\b(Array|Object)\b/g, '<span class="hl-type">$1</span>')
    .replace(/\[(\w+)\]/g, '[<span class="hl-key">$1</span>]')
    .replace(/=&gt;\s*(.+)/g, (_, val) => `=&gt; <span class="hl-str">${val}</span>`)
}

// ── plain ─────────────────────────────────────────────────────────────────────

function formatPlain(raw: string): FormattedOutput {
  return {
    type: 'plain',
    html: `<pre class="output-pre">${escHtml(raw)}</pre>`,
    badge: null,
    rawText: raw
  }
}

// ── main entry ────────────────────────────────────────────────────────────────

export function formatOutput(stdout: string): FormattedOutput {
  const text = stdout.trim()
  if (!text) return { type: 'empty', html: '', badge: null, rawText: '' }

  // JSON
  if ((text.startsWith('{') || text.startsWith('[')) && text.length < 500_000) {
    try {
      JSON.parse(text)
      return formatJson(text)
    } catch { /* not JSON */ }
  }

  // var_dump
  if (/^(?:int|float|string|bool|NULL|array|object)\(/m.test(text)) {
    return {
      type: 'vardump',
      html: `<pre class="output-pre">${highlightVarDump(text)}</pre>`,
      badge: varDumpBadge(text),
      rawText: text
    }
  }

  // print_r
  if (/^(?:Array|[\w\\]+ Object)\s*[\r\n]?\s*\(/.test(text)) {
    return {
      type: 'printr',
      html: `<pre class="output-pre">${highlightPrintR(text)}</pre>`,
      badge: { label: 'Array', cls: 'badge-array' },
      rawText: text
    }
  }

  return formatPlain(text)
}

export interface StackFrame {
  index: number
  file: string
  line: number | null
  call: string
}

export interface PhpError {
  errorClass: string
  message: string
  file: string | null
  line: number | null
  frames: StackFrame[]
}

const PHP_ERROR_CLASSES = [
  'ParseError', 'TypeError', 'ValueError', 'ArithmeticError', 'DivisionByZeroError',
  'ArgumentCountError', 'BadFunctionCallException', 'BadMethodCallException',
  'RuntimeException', 'LogicException', 'InvalidArgumentException',
  'OutOfRangeException', 'OutOfBoundsException', 'OverflowException',
  'UnderflowException', 'UnexpectedValueException', 'RangeException',
  'Error', 'Exception', 'Throwable'
]

const ERROR_PATTERN = new RegExp(
  `^(${PHP_ERROR_CLASSES.join('|')}|[\\w\\\\]+(?:Error|Exception|Warning|Notice|Deprecated)[\\w\\\\]*):` +
  `\\s*(.+?)\\s+in\\s+(.+?)\\s+on\\s+line\\s+(\\d+)`,
  'm'
)

function parseFrames(stackRaw: string): StackFrame[] {
  const frames: StackFrame[] = []
  // Stack trace lines: "#0 /path/to/file.php(42): Class->method()"
  const lineRe = /^#(\d+)\s+(.+?)(?:\((\d+)\))?:\s+(.*)$/gm
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(stackRaw)) !== null) {
    const filePart = m[2].trim()
    // Filter out Phplay internal wrapper frames
    if (filePart.includes('phplay-') || filePart === '{main}') continue
    frames.push({
      index: parseInt(m[1]),
      file: filePart,
      line: m[3] ? parseInt(m[3]) : null,
      call: m[4].trim()
    })
  }
  return frames
}

export function parsePhpError(stderr: string): PhpError | null {
  if (!stderr.trim()) return null

  const m = ERROR_PATTERN.exec(stderr)
  if (m) {
    const stackStart = stderr.indexOf('Stack trace:')
    const stackRaw = stackStart !== -1 ? stderr.slice(stackStart) : ''
    return {
      errorClass: m[1].trim(),
      message: m[2].trim(),
      file: m[3].trim(),
      line: parseInt(m[4]),
      frames: parseFrames(stackRaw)
    }
  }

  // Generic PHP error lines: "Fatal error: ... in /file on line N"
  const genericM = stderr.match(/^(?:Fatal error|Warning|Notice|Deprecated|Parse error):\s*(.+?)\s+in\s+(.+?)\s+on\s+line\s+(\d+)/m)
  if (genericM) {
    return {
      errorClass: 'Error',
      message: genericM[1].trim(),
      file: genericM[2].trim(),
      line: parseInt(genericM[3]),
      frames: []
    }
  }

  return { errorClass: 'Error', message: stderr.trim(), file: null, line: null, frames: [] }
}
