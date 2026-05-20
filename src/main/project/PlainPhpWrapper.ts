// PHP helpers injected for plain PHP execution (no framework).
const PHP_HELPERS = `
if (!function_exists('d')) {
    function d(...$__args) {
        foreach ($__args as $__v) { var_dump($__v); }
    }
}
if (!function_exists('dd')) {
    function dd(...$__args) {
        d(...$__args);
        exit(0);
    }
}
if (!function_exists('phplay_json')) {
    function phplay_json($__v) {
        echo json_encode($__v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
`

/**
 * Wraps plain PHP code (no framework) in a try/catch block with:
 * - PHP helpers (d, dd, phplay_json)
 * - Output buffering for clean stdout/stderr separation
 * - Structured exception output to STDERR
 */
export class PlainPhpWrapper {
  generate(userCode: string): string {
    let code = userCode.replace(/^<\?php\s*/i, '').trim()

    const { declares, rest: afterDeclares } = this.extractDeclares(code)
    code = afterDeclares

    const { useStatements, rest: snippet } = this.extractUseStatements(code)

    const declareBlock = declares.length > 0 ? declares.join('\n') + '\n\n' : ''
    const useBlock = useStatements.length > 0 ? useStatements.join('\n') + '\n\n' : ''

    return `<?php
${declareBlock}${useBlock}
${PHP_HELPERS}
ob_start();
try {
${this.indent(snippet)}
    $__output = ob_get_clean();
} catch (\\Throwable $__e) {
    ob_get_clean();
    fwrite(STDERR, get_class($__e) . ': ' . $__e->getMessage() . ' in ' . $__e->getFile() . ' on line ' . $__e->getLine() . "\\n\\nStack trace:\\n" . $__e->getTraceAsString());
    exit(1);
}

echo $__output;
`
  }

  private extractDeclares(code: string): { declares: string[]; rest: string } {
    const declares: string[] = []
    const rest = code
      .replace(/^declare\s*\([^)]+\)\s*;/gm, (m) => {
        declares.push(m.trim())
        return ''
      })
      .trim()
    return { declares, rest }
  }

  private extractUseStatements(code: string): { useStatements: string[]; rest: string } {
    const useStatements: string[] = []
    const rest = code
      .replace(/^use\s+(function\s+|const\s+)?[\w\\,\s{}]+;/gm, (m) => {
        useStatements.push(m.trim())
        return ''
      })
      .replace(/^\n{3,}/gm, '\n\n')
      .trim()
    return { useStatements, rest }
  }

  private indent(code: string, spaces = 4): string {
    const pad = ' '.repeat(spaces)
    return code
      .split('\n')
      .map((line) => (line.trim() === '' ? '' : pad + line))
      .join('\n')
  }
}
