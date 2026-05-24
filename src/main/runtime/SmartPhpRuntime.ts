export class SmartPhpRuntime {
  wrap(code: string): string {
    if (this.isPassthrough(code)) return code

    // Rewrite `return expr;` → `phplay_render(expr);` before checking last expression
    const withReturn = this.rewriteTopLevelReturn(code)
    if (withReturn !== code) return withReturn

    const lastExpr = this.extractLastExpression(code)
    if (!lastExpr) return code

    const lines = code.split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim()
      if (!trimmed || this.isIgnoredLine(trimmed)) continue
      if (this.isStatement(trimmed)) break

      const indent = lines[i].match(/^(\s*)/)?.[1] ?? ''
      lines[i] = `${indent}$__result = (${trimmed.replace(/;$/, '')});\n${indent}phplay_render($__result);`
      break
    }

    return lines.join('\n')
  }

  isPassthrough(code: string): boolean {
    const stripped = this.stripStringsAndComments(code)
    return /\b(echo|print|var_dump|var_export|print_r|dd|dump)\s*[\s(]/.test(stripped)
  }

  extractLastExpression(code: string): string | null {
    const lines = code.split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim()
      if (!trimmed || this.isIgnoredLine(trimmed)) continue
      if (this.isStatement(trimmed)) return null

      return trimmed.replace(/;$/, '').trim()
    }
    return null
  }

  private rewriteTopLevelReturn(code: string): string {
    const lines = code.split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim()
      if (!trimmed || this.isIgnoredLine(trimmed)) continue

      if (/^return\b/.test(trimmed)) {
        const expr = trimmed.replace(/^return\s*/, '').replace(/;$/, '').trim() || 'null'
        const indent = lines[i].match(/^(\s*)/)?.[1] ?? ''
        lines[i] = `${indent}phplay_render(${expr});`
        return lines.join('\n')
      }

      break
    }
    return code
  }

  private isIgnoredLine(line: string): boolean {
    return (
      line === '}' ||
      line === ');' ||
      line === ')' ||
      line.startsWith('//') ||
      line.startsWith('#') ||
      line.startsWith('/*') ||
      line.startsWith('*')
    )
  }

  private isStatement(line: string): boolean {
    if (
      /^(if|else|elseif|foreach|for|while|do\s*\{|switch|class|abstract|final|interface|trait|enum|function|return|exit|die|throw|declare|namespace|use|echo|print|var_dump|var_export|print_r|dd|dump)\b/.test(
        line
      )
    ) {
      return true
    }

    if (/^\$\w+(\[.*?\])?\s*=[^=>]/.test(line)) {
      return true
    }

    if (/^[{}]/.test(line)) return true

    return false
  }

  private stripStringsAndComments(code: string): string {
    return code
      .replace(/\/\/[^\n]*/g, '')
      .replace(/#[^\n]*/g, '')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  }
}
