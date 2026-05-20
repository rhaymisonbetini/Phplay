import { join } from 'path'

/**
 * Generates a PHP wrapper that boots a Laravel application and executes
 * the user's snippet inside the bootstrapped context.
 *
 * The wrapper:
 * 1. Loads vendor/autoload.php
 * 2. Boots the Laravel app via bootstrap/app.php
 * 3. Boots all service providers (makes, facades, etc. available)
 * 4. Wraps the snippet in try/catch to capture Laravel exceptions
 * 5. Outputs execution result as JSON for clean parsing
 */
export class LaravelBootstrap {
  generate(projectPath: string, userCode: string, bootstrapPath?: string): string {
    const autoload = join(projectPath, 'vendor', 'autoload.php').replace(/\\/g, '/')
    const bootstrap = (bootstrapPath ?? join(projectPath, 'bootstrap', 'app.php')).replace(
      /\\/g,
      '/'
    )

    // Strip opening PHP tag from user code if present — we provide our own context
    const snippet = userCode.replace(/^<\?php\s*/i, '').trim()

    return `<?php

require_once '${autoload}';

$app = require_once '${bootstrap}';

$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

// Capture output from user snippet
ob_start();
try {
    ${snippet}
    $output = ob_get_clean();
    $error = null;
} catch (\\Throwable $e) {
    $output = ob_get_clean();
    $error = [
        'class'   => get_class($e),
        'message' => $e->getMessage(),
        'file'    => $e->getFile(),
        'line'    => $e->getLine(),
        'trace'   => $e->getTraceAsString(),
    ];
}

if ($error !== null) {
    fwrite(STDERR, $error['class'] . ': ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line'] . "\\n\\nStack trace:\\n" . $error['trace']);
    exit(1);
}

echo $output;
`
  }
}
