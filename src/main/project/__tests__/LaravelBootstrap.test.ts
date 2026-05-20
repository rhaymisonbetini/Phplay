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
    const matches = code.match(/<\?php/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('wraps snippet in try/catch with Throwable', () => {
    const code = bootstrap.generate('/app', 'echo "test";')
    expect(code).toContain('catch (\\Throwable $__e)')
  })

  it('includes kernel bootstrap call', () => {
    const code = bootstrap.generate('/app', 'echo 1;')
    expect(code).toContain('$kernel->bootstrap()')
  })

  it('injects d() helper function', () => {
    const code = bootstrap.generate('/app', 'echo 1;')
    expect(code).toContain("function d(")
  })

  it('injects dd() helper function', () => {
    const code = bootstrap.generate('/app', 'echo 1;')
    expect(code).toContain("function dd(")
  })

  // --- use statement hoisting ---

  it('hoists use statement to file top level, before require_once', () => {
    const user = `<?php
use App\\Models\\User;
$u = User::find(1);
echo $u->name;`

    const code = bootstrap.generate('/app', user)

    const usePos = code.indexOf('use App\\Models\\User;')
    const requirePos = code.indexOf("require_once '/app/vendor/autoload.php'")
    const tryPos = code.indexOf('try {')

    expect(usePos).toBeGreaterThanOrEqual(0)
    expect(usePos).toBeLessThan(requirePos)
    expect(usePos).toBeLessThan(tryPos)
  })

  it('keeps non-use code inside try block', () => {
    const user = `<?php
use App\\Models\\User;
$u = User::find(1);`

    const code = bootstrap.generate('/app', user)

    const tryPos = code.indexOf('try {')
    const findPos = code.indexOf('User::find(1)')

    expect(findPos).toBeGreaterThan(tryPos)
  })

  it('hoists multiple use statements', () => {
    const user = `<?php
use App\\Models\\User;
use Illuminate\\Support\\Facades\\DB;
use App\\Enums\\Status;
DB::table('users')->get();`

    const code = bootstrap.generate('/app', user)

    expect(code).toContain('use App\\Models\\User;')
    expect(code).toContain('use Illuminate\\Support\\Facades\\DB;')
    expect(code).toContain('use App\\Enums\\Status;')

    const requirePos = code.indexOf("require_once '/app/vendor/autoload.php'")
    expect(code.indexOf('use App\\Models\\User;')).toBeLessThan(requirePos)
    expect(code.indexOf('use Illuminate\\Support\\Facades\\DB;')).toBeLessThan(requirePos)
  })

  it('handles use with alias', () => {
    const user = `<?php
use App\\Models\\User as UserModel;
$u = UserModel::find(1);`

    const code = bootstrap.generate('/app', user)
    expect(code).toContain('use App\\Models\\User as UserModel;')
    const requirePos = code.indexOf("require_once '/app/vendor/autoload.php'")
    expect(code.indexOf('use App\\Models\\User as UserModel;')).toBeLessThan(requirePos)
  })

  it('handles grouped use statements', () => {
    const user = `<?php
use Illuminate\\Support\\Facades\\{DB, Auth, Cache};
DB::table('users')->count();`

    const code = bootstrap.generate('/app', user)
    expect(code).toContain('use Illuminate\\Support\\Facades\\{DB, Auth, Cache};')
  })

  it('handles use function and use const', () => {
    const user = `<?php
use function Illuminate\\Support\\now;
use const App\\Constants\\VERSION;
echo now();`

    const code = bootstrap.generate('/app', user)
    expect(code).toContain('use function Illuminate\\Support\\now;')
    expect(code).toContain('use const App\\Constants\\VERSION;')
  })

  it('hoists declare(strict_types=1) before use and require', () => {
    const user = `<?php
declare(strict_types=1);
use App\\Models\\User;
$u = User::find(1);`

    const code = bootstrap.generate('/app', user)

    const declPos = code.indexOf('declare(strict_types=1)')
    const usePos = code.indexOf('use App\\Models\\User;')
    const requirePos = code.indexOf("require_once '/app/vendor/autoload.php'")

    expect(declPos).toBeGreaterThanOrEqual(0)
    expect(declPos).toBeLessThan(usePos)
    expect(declPos).toBeLessThan(requirePos)
  })

  it('does not double-emit use statements inside try block', () => {
    const user = `<?php
use App\\Models\\User;
$u = User::find(1);`

    const code = bootstrap.generate('/app', user)
    const count = (code.match(/use App\\Models\\User;/g) ?? []).length
    expect(count).toBe(1)
  })
})
