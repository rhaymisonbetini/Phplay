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
    expect(code).toContain('catch (\\Throwable $e)')
  })

  it('includes kernel bootstrap call', () => {
    const code = bootstrap.generate('/app', 'echo 1;')
    expect(code).toContain('$kernel->bootstrap()')
  })
})
