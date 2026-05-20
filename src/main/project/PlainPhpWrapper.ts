const PHP_HELPERS = `
if (!function_exists('d')) {
    function d(...$__args) {
        foreach ($__args as $__v) { var_dump($__v); }
    }
}
if (!function_exists('dd')) {
    function dd(...$__args) {
        foreach ($__args as $__v) { var_dump($__v); }
        exit(0);
    }
}
if (!function_exists('phplay_json')) {
    function phplay_json($__v) {
        echo json_encode($__v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
`

export class PlainPhpWrapper {
  generate(userCode: string): string {
    const stripped = userCode.replace(/^<\?php\s*/i, '').trim()
    const { declares, rest: afterDeclares } = this.extractDeclares(stripped)
    const { useStatements, rest: snippet } = this.extractUseStatements(afterDeclares)

    const declareBlock = declares.length ? declares.join('\n') + '\n\n' : ''
    const useBlock = useStatements.length ? useStatements.join('\n') + '\n\n' : ''

    return `<?php
${declareBlock}${useBlock}${PHP_HELPERS}
ob_start();
try {
${this.indent(snippet)}
    $__output = ob_get_clean();
} catch (\\Throwable $__e) {
    $__output = ob_get_clean();
    fwrite(STDERR, get_class($__e) . ': ' . $__e->getMessage() . ' in ' . $__e->getFile() . ' on line ' . $__e->getLine() . "\\n\\nStack trace:\\n" . $__e->getTraceAsString());
    if ($__output !== '') { echo $__output; }
    exit(1);
}

echo $__output;
`
  }

  private extractDeclares(code: string): { declares: string[]; rest: string } {
    const declares: string[] = []
    const lines = code.split('\n')
    const kept: string[] = []
    for (const line of lines) {
      if (/^\s*declare\s*\(/.test(line)) {
        declares.push(line.trim())
      } else {
        kept.push(line)
      }
    }
    return { declares, rest: kept.join('\n').trim() }
  }

  private extractUseStatements(code: string): { useStatements: string[]; rest: string } {
    const useStatements: string[] = []
    const lines = code.split('\n')
    const kept: string[] = []
    for (const line of lines) {
      if (/^\s*use\s+(function\s+|const\s+)?[\w\\]/.test(line)) {
        useStatements.push(line.trim())
      } else {
        kept.push(line)
      }
    }
    return { useStatements, rest: kept.join('\n').trim() }
  }

  private indent(code: string, spaces = 4): string {
    const pad = ' '.repeat(spaces)
    return code
      .split('\n')
      .map((l) => (l.trim() === '' ? '' : pad + l))
      .join('\n')
  }
}
