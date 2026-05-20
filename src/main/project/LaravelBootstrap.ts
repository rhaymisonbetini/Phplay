import { join } from 'path'

/**
 * Generates a PHP wrapper that boots a Laravel application and executes
 * the user's snippet inside the bootstrapped context.
 *
 * PHP requires `use` declarations to appear at file top level — they cannot
 * be inside try/catch blocks. This class extracts them from the user's snippet
 * and hoists them before the bootstrap require calls.
 */
export class LaravelBootstrap {
  generate(projectPath: string, userCode: string, bootstrapPath?: string): string {
    const autoload = join(projectPath, 'vendor', 'autoload.php').replace(/\\/g, '/')
    const bootstrap = (bootstrapPath ?? join(projectPath, 'bootstrap', 'app.php')).replace(
      /\\/g,
      '/'
    )

    // Strip opening PHP tag
    let code = userCode.replace(/^<\?php\s*/i, '').trim()

    // Extract declare() — must be the very first statement after <?php
    const { declares, rest: afterDeclares } = this.extractDeclares(code)
    code = afterDeclares

    // Extract use statements — must be at file top level, cannot be inside try/catch
    const { useStatements, rest: snippet } = this.extractUseStatements(code)

    const declareBlock = declares.length > 0 ? declares.join('\n') + '\n\n' : ''
    const useBlock = useStatements.length > 0 ? useStatements.join('\n') + '\n\n' : ''

    return `<?php
${declareBlock}${useBlock}
require_once '${autoload}';

$app = require_once '${bootstrap}';

$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

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

  /**
   * Extracts declare() statements (e.g. declare(strict_types=1)).
   * Must appear before any other code in PHP, so we hoist them to the top.
   */
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

  /**
   * Extracts `use` import statements from user code.
   *
   * Handles:
   *   use App\Models\User;
   *   use App\Models\User as U;
   *   use function Illuminate\Support\Facades\DB;
   *   use const App\Enums\Status;
   *   use Illuminate\Support\Facades\{DB, Auth, Cache};   (single-line grouped)
   */
  private extractUseStatements(code: string): { useStatements: string[]; rest: string } {
    const useStatements: string[] = []

    // Match single-line use statements (covers 99% of real-world cases)
    const rest = code
      .replace(/^use\s+(function\s+|const\s+)?[\w\\,\s{}]+;/gm, (m) => {
        useStatements.push(m.trim())
        return ''
      })
      .replace(/^\n{3,}/gm, '\n\n') // collapse excessive blank lines
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
