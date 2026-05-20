export type OutputFormat = 'json' | 'vardump' | 'printr' | 'plain'

export interface TypeBadge {
  label: string
  color: 'primitive' | 'string' | 'bool' | 'null' | 'array' | 'object' | 'collection'
}

export interface FormattedOutput {
  format: OutputFormat
  html: string
  badge: TypeBadge | null
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── JSON ──────────────────────────────────────────────────────────────────────

function highlightJson(text: string): string {
  const esc = escapeHtml(text)
  return esc.replace(
    /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (_, key, str, bool, nil, num) => {
      if (key !== undefined) return `<span class="hl-key">${key}</span>`
      if (str !== undefined) return `<span class="hl-str">${str}</span>`
      if (bool !== undefined) return `<span class="hl-bool">${bool}</span>`
      if (nil !== undefined) return `<span class="hl-null">${nil}</span>`
      return `<span class="hl-num">${num}</span>`
    }
  )
}

function jsonBadge(parsed: unknown): TypeBadge {
  if (Array.isArray(parsed)) return { label: `Array [${parsed.length}]`, color: 'array' }
  if (parsed === null) return { label: 'null', color: 'null' }
  if (typeof parsed === 'object') return { label: 'Object', color: 'object' }
  if (typeof parsed === 'boolean') return { label: `bool: ${parsed}`, color: 'bool' }
  if (typeof parsed === 'number') return { label: 'number', color: 'primitive' }
  return { label: 'string', color: 'string' }
}

// ── var_dump ──────────────────────────────────────────────────────────────────

function highlightVarDump(text: string): string {
  let s = escapeHtml(text)

  // object(ClassName)#N — must run before generic type highlight
  s = s.replace(/\bobject\(([^)]+)\)(#\d+)/g,
    'object(<span class="hl-class">$1</span>)$2')

  // Type keywords before (
  s = s.replace(/\b(int|float|string|bool|NULL|array|object)\(/g,
    '<span class="hl-type">$1</span>(')

  // bool values
  s = s.replace(/\b(true|false)\b/g, '<span class="hl-bool">$1</span>')

  // NULL standalone
  s = s.replace(/\bNULL\b/g, '<span class="hl-null">NULL</span>')

  // string content (in double-quotes inside var_dump)
  s = s.replace(/"([^"]*)"/g, '<span class="hl-str">"$1"</span>')

  // numbers in parens: (42) or (3.14)
  s = s.replace(/\((\d+(?:\.\d+)?)\)/g, '(<span class="hl-num">$1</span>)')

  // array/object keys: ["key"]=>
  s = s.replace(/\["([^"]+)"\]=&gt;/g, '[<span class="hl-key">"$1"</span>]=&gt;')
  s = s.replace(/\[(\d+)\]=&gt;/g, '[<span class="hl-num">$1</span>]=&gt;')

  // prop names in object: ["prop":"ClassName":"private"]=>
  s = s.replace(/\["([^"]+)":"[^"]*":\w+\]=&gt;/g,
    '[<span class="hl-key">"$1"</span>…]=&gt;')

  return s
}

function varDumpBadge(text: string): TypeBadge | null {
  const t = text.trim()

  if (/^int\(/.test(t)) return { label: 'int', color: 'primitive' }
  if (/^float\(/.test(t)) return { label: 'float', color: 'primitive' }
  if (/^bool\(true\)/.test(t)) return { label: 'bool: true', color: 'bool' }
  if (/^bool\(false\)/.test(t)) return { label: 'bool: false', color: 'bool' }
  if (/^NULL/.test(t)) return { label: 'null', color: 'null' }

  const strM = t.match(/^string\((\d+)\)/)
  if (strM) return { label: `string (${strM[1]}b)`, color: 'string' }

  const arrM = t.match(/^array\((\d+)\)/)
  if (arrM) return { label: `Array [${arrM[1]}]`, color: 'array' }

  const objM = t.match(/^object\(([^)]+)\)/)
  if (objM) {
    const fqn = objM[1]
    const short = fqn.split('\\').pop() ?? fqn
    // Eloquent Collection
    if (fqn.includes('Collection')) return { label: `Collection`, color: 'collection' }
    return { label: short, color: 'object' }
  }

  return null
}

// ── print_r ───────────────────────────────────────────────────────────────────

function highlightPrintR(text: string): string {
  let s = escapeHtml(text)

  // Array / class header
  s = s.replace(/^(Array|[\w\\]+\s+Object)\s*$/gm,
    '<span class="hl-type">$1</span>')

  // Keys: [key] =>
  s = s.replace(/\[([^\]]+)\] =&gt;/g,
    '[<span class="hl-key">$1</span>] =&gt;')

  // Inline primitive values (after => on the same line)
  s = s.replace(/=&gt;\s+([^\n<]+)/g, (match, val) => {
    const trimmed = val.trim()
    if (trimmed === '') return match
    // Numeric
    if (/^-?\d+(\.\d+)?$/.test(trimmed))
      return `=&gt; <span class="hl-num">${val}</span>`
    // Bool-like
    if (trimmed === '1' || trimmed === '')
      return match
    return `=&gt; <span class="hl-str">${val}</span>`
  })

  return s
}

function printRBadge(text: string): TypeBadge | null {
  const t = text.trim()
  if (/^Array/.test(t)) {
    const count = (t.match(/\[/g) ?? []).length
    return { label: `Array [~${count}]`, color: 'array' }
  }
  const objM = t.match(/^([\w\\]+)\s+Object/)
  if (objM) {
    const short = objM[1].split('\\').pop() ?? objM[1]
    if (objM[1].includes('Collection')) return { label: 'Collection', color: 'collection' }
    return { label: short, color: 'object' }
  }
  return null
}

// ── Format detection ──────────────────────────────────────────────────────────

export function detectFormat(stdout: string): OutputFormat {
  const t = stdout.trim()
  if (!t) return 'plain'

  // JSON: must start with { or [ and be parseable
  if (t.startsWith('{') || t.startsWith('[')) {
    try { JSON.parse(t); return 'json' } catch { /* not json */ }
  }

  // var_dump: starts with known type tokens
  if (/^(?:int|float|string|bool|NULL|array|object)\(/m.test(t)) return 'vardump'

  // print_r: starts with "Array" or "ClassName Object"
  if (/^(?:Array|[\w\\]+ Object)/.test(t)) return 'printr'

  return 'plain'
}

// ── Main formatter ────────────────────────────────────────────────────────────

export function formatOutput(stdout: string): FormattedOutput {
  const format = detectFormat(stdout)

  switch (format) {
    case 'json': {
      let pretty = stdout
      try {
        pretty = JSON.stringify(JSON.parse(stdout.trim()), null, 2)
      } catch { /* use as-is */ }
      const parsed = (() => { try { return JSON.parse(stdout.trim()) } catch { return null } })()
      return {
        format,
        html: highlightJson(pretty),
        badge: parsed !== null ? jsonBadge(parsed) : null
      }
    }

    case 'vardump':
      return {
        format,
        html: highlightVarDump(stdout),
        badge: varDumpBadge(stdout)
      }

    case 'printr':
      return {
        format,
        html: highlightPrintR(stdout),
        badge: printRBadge(stdout)
      }

    default:
      return {
        format: 'plain',
        html: escapeHtml(stdout),
        badge: null
      }
  }
}
