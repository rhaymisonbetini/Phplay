function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightVarDumpLine(line: string): string {
  return escHtml(line)
    // type labels: int, float, string, bool, NULL, array, object
    .replace(/\b(int|float|string|bool|NULL|array|object)\b/g, '<span class="hl-type">$1</span>')
    // quoted strings
    .replace(/(&quot;.*?&quot;)/g, '<span class="hl-str">$1</span>')
    // numbers in parens
    .replace(/\((\d+(?:\.\d+)?)\)/g, '(<span class="hl-num">$1</span>)')
    // bool values
    .replace(/\b(true|false)\b/g, '<span class="hl-bool">$1</span>')
    // array keys
    .replace(/\[&quot;(\w+)&quot;\]/g, '[<span class="hl-key">&quot;$1&quot;</span>]')
}

function highlightJsonLine(line: string): string {
  const esc = escHtml(line)
  return esc
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="hl-key">$1</span>$2')
    .replace(/(:\s*)((?:"(?:[^"\\]|\\.)*"))/g, '$1<span class="hl-str">$2</span>')
    .replace(/(:\s*)(-?\d+\.?\d*)/g, '$1<span class="hl-num">$2</span>')
    .replace(/(:\s*)(true|false)/g, '$1<span class="hl-bool">$2</span>')
    .replace(/(:\s*)(null)/g, '$1<span class="hl-null">$2</span>')
    .replace(/([{}[\]])/g, '<span class="hl-brace">$1</span>')
}

// PHP stack trace frame: #N /path/to/file.php(line): Class->method(...)
function highlightStackTraceLine(line: string): string {
  const frameMatch = line.match(/^(#\d+)\s+(.+\.php)\((\d+)\):\s*(.*)$/)
  if (frameMatch) {
    const [, idx, file, lineNum, call] = frameMatch
    return (
      `<span class="hl-trace-idx">${escHtml(idx)}</span> ` +
      `<span class="hl-trace-file">${escHtml(file)}</span>` +
      `<span class="hl-trace-paren">(</span>` +
      `<span class="hl-num">${escHtml(lineNum)}</span>` +
      `<span class="hl-trace-paren">)</span>: ` +
      `<span class="hl-trace-call">${escHtml(call)}</span>`
    )
  }

  // Error header: Exception: message in /file on line N
  const errorMatch = line.match(/^([A-Z]\w+(?:\\[A-Z]\w+)*(?:Error|Exception)?): (.+)$/)
  if (errorMatch) {
    const [, cls, msg] = errorMatch
    return (
      `<span class="hl-error-class">${escHtml(cls)}</span>: ` +
      `<span class="hl-error-msg">${escHtml(msg)}</span>`
    )
  }

  // "in /path on line N" suffix
  const inLineMatch = line.match(/^(.*)\s+(in\s+)(.+\.php)\s+(on line\s+)(\d+)$/)
  if (inLineMatch) {
    const [, prefix, inKw, file, lineKw, num] = inLineMatch
    return (
      escHtml(prefix) + ' ' +
      `<span class="hl-trace-kw">${escHtml(inKw)}</span>` +
      `<span class="hl-trace-file">${escHtml(file)}</span> ` +
      `<span class="hl-trace-kw">${escHtml(lineKw)}</span>` +
      `<span class="hl-num">${escHtml(num)}</span>`
    )
  }

  return escHtml(line)
}

function looksLikeStackTrace(text: string): boolean {
  return /^#\d+\s+.+\.php\(\d+\):/m.test(text)
}

function looksLikeVarDump(text: string): boolean {
  return /^\s*(int|float|string|bool|NULL|array|object)\s*[(\[]/m.test(text)
}

function looksLikeJson(text: string): boolean {
  const t = text.trim()
  return (t.startsWith('{') || t.startsWith('[')) && (t.endsWith('}') || t.endsWith(']'))
}

export function highlightOutput(raw: string): string {
  if (!raw) return ''

  // Try JSON first
  if (looksLikeJson(raw)) {
    try {
      const parsed = JSON.parse(raw)
      const pretty = JSON.stringify(parsed, null, 2)
      return pretty.split('\n').map(highlightJsonLine).join('\n')
    } catch {
      // fall through
    }
  }

  const lines = raw.split('\n')

  if (looksLikeStackTrace(raw)) {
    return lines.map(highlightStackTraceLine).join('\n')
  }

  if (looksLikeVarDump(raw)) {
    return lines.map(highlightVarDumpLine).join('\n')
  }

  // Plain text — just escape XSS
  return lines.map(escHtml).join('\n')
}
