import { join } from 'path'
import { SmartPhpRuntime } from '../runtime/SmartPhpRuntime'

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
if (!function_exists('phplay_inspect')) {
    function phplay_inspect($__v, $__depth = 0) {
        if ($__depth > 5) return '...';
        if (is_null($__v)) return 'null';
        if (is_bool($__v)) return $__v ? 'true' : 'false';
        if (is_string($__v)) return '"' . addslashes($__v) . '"';
        if (is_int($__v) || is_float($__v)) return (string)$__v;
        if (is_array($__v)) {
            if (empty($__v)) return '[]';
            $items = [];
            foreach ($__v as $k => $val) {
                $items[] = (is_int($k) ? '' : '"' . $k . '" => ') . phplay_inspect($val, $__depth + 1);
            }
            return count($__v) <= 5 ? '[' . implode(', ', $items) . ']' : "Array(" . count($__v) . ")";
        }
        if (is_object($__v)) {
            $class = get_class($__v);
            if (method_exists($__v, 'toArray')) {
                return $class . ' ' . json_encode($__v->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $props = [];
            foreach ((array)$__v as $k => $val) {
                $props[] = ltrim($k, "\\0*\\0") . ': ' . phplay_inspect($val, $__depth + 1);
            }
            return $class . ' { ' . implode(', ', $props) . ' }';
        }
        return var_export($__v, true);
    }
}
if (!function_exists('phplay_render')) {
    function phplay_render($__v) {
        if ($__v === null) { echo "null" . PHP_EOL; return; }
        if (is_bool($__v)) { echo ($__v ? 'true' : 'false') . PHP_EOL; return; }
        if (is_string($__v) || is_int($__v) || is_float($__v)) { echo $__v . PHP_EOL; return; }
        echo phplay_inspect($__v) . PHP_EOL;
    }
}
`

const runtime = new SmartPhpRuntime()

export class LaravelBootstrap {
  generate(projectPath: string, userCode: string, bootstrapPath?: string): string {
    const autoload = join(projectPath, 'vendor', 'autoload.php').replace(/\\/g, '/')
    const bootstrap = (bootstrapPath ?? join(projectPath, 'bootstrap', 'app.php')).replace(
      /\\/g,
      '/'
    )

    const stripped = userCode.replace(/^<\?php\s*/i, '').trim()
    const { declares, rest: afterDeclares } = this.extractDeclares(stripped)
    const { useStatements, rest: snippet } = this.extractUseStatements(afterDeclares)

    const declareBlock = declares.length ? declares.join('\n') + '\n\n' : ''
    const useBlock = useStatements.length ? useStatements.join('\n') + '\n\n' : ''
    const wrappedSnippet = runtime.wrap(snippet)

    return `<?php
${declareBlock}${useBlock}require_once '${autoload}';

$__app = require_once '${bootstrap}';
$__kernel = $__app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$__kernel->bootstrap();
${PHP_HELPERS}
ob_start();
try {
${this.indent(wrappedSnippet)}
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
      // Match: use Foo\Bar; | use function foo; | use const FOO; | use Foo\{Bar, Baz};
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
