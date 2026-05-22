import { describe, it, expect } from 'vitest'
import { LaravelBootstrap } from '../LaravelBootstrap'

describe('LaravelBootstrap', () => {
  const bootstrap = new LaravelBootstrap()

  it('includes vendor/autoload.php from project path', () => {
    const code = bootstrap.generate('/var/www/app', '<?php echo "hi";')
    expect(code).toContain("/var/www/app/vendor/autoload.php")
  })

  it('includes bootstrap/app.php from project path by default', () => {
    const code = bootstrap.generate('/var/www/app', '<?php echo "hi";')
    expect(code).toContain("/var/www/app/bootstrap/app.php")
  })

  it('uses custom bootstrapPath when provided', () => {
    const code = bootstrap.generate('/app', 'echo "x";', '/app/bootstrap/app.php')
    expect(code).toContain('/app/bootstrap/app.php')
  })

  it('strips opening PHP tag from user snippet', () => {
    const code = bootstrap.generate('/app', '<?php echo "hello";')
    // Should not have double <?php
    const matches = code.match(/<\?php/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('wraps snippet in try/catch with Throwable', () => {
    const code = bootstrap.generate('/app', 'echo "test";')
    expect(code).toContain('catch (\\Throwable $__e)')
  })

  it('includes kernel bootstrap call', () => {
    const code = bootstrap.generate('/app', 'echo 1;')
    expect(code).toContain('$__kernel->bootstrap()')
  })

  it('hoists use statement above require_once', () => {
    const code = bootstrap.generate('/app', `<?php
use App\\Models\\User;
$user = User::find(1);`)
    const requirePos = code.indexOf("require_once")
    const usePos = code.indexOf('use App\\Models\\User;')
    expect(usePos).toBeGreaterThanOrEqual(0)
    expect(usePos).toBeLessThan(requirePos)
  })

  it('hoists multiple use statements', () => {
    const code = bootstrap.generate('/app', `<?php
use App\\Models\\User;
use App\\Models\\Post;
use Illuminate\\Support\\Facades\\DB;
$users = User::all();`)
    expect(code).toContain('use App\\Models\\User;')
    expect(code).toContain('use App\\Models\\Post;')
    expect(code).toContain('use Illuminate\\Support\\Facades\\DB;')
    // All three should appear before require_once
    const requirePos = code.indexOf('require_once')
    expect(code.indexOf('use App\\Models\\User;')).toBeLessThan(requirePos)
  })

  it('hoists declare(strict_types=1) before require_once', () => {
    const code = bootstrap.generate('/app', `<?php
declare(strict_types=1);
echo "strict";`)
    const declarePos = code.indexOf('declare(strict_types=1)')
    const requirePos = code.indexOf('require_once')
    expect(declarePos).toBeGreaterThanOrEqual(0)
    expect(declarePos).toBeLessThan(requirePos)
  })

  it('handles code without any use statements', () => {
    const code = bootstrap.generate('/app', '<?php echo 42;')
    expect(code).toContain('echo 42')
    expect(code).not.toMatch(/^\s*use\s+/m)
  })

  it('hoists use function statement', () => {
    const code = bootstrap.generate('/app', `<?php
use function App\\Helpers\\myHelper;
myHelper();`)
    expect(code).toContain('use function App\\Helpers\\myHelper;')
    expect(code.indexOf('use function')).toBeLessThan(code.indexOf('require_once'))
  })

  it('hoists use const statement', () => {
    const code = bootstrap.generate('/app', `<?php
use const App\\Constants\\MY_CONST;
echo MY_CONST;`)
    expect(code).toContain('use const App\\Constants\\MY_CONST;')
    expect(code.indexOf('use const')).toBeLessThan(code.indexOf('require_once'))
  })
})
