import { describe, it, expect } from 'vitest'
import { SmartPhpRuntime } from '../SmartPhpRuntime'

describe('SmartPhpRuntime', () => {
  const runtime = new SmartPhpRuntime()

  describe('isPassthrough', () => {
    it('detects echo', () => {
      expect(runtime.isPassthrough('echo "hello";')).toBe(true)
    })

    it('detects print', () => {
      expect(runtime.isPassthrough('print "hello";')).toBe(true)
    })

    it('detects var_dump', () => {
      expect(runtime.isPassthrough('var_dump($user);')).toBe(true)
    })

    it('detects dd()', () => {
      expect(runtime.isPassthrough('dd($user);')).toBe(true)
    })

    it('detects dump()', () => {
      expect(runtime.isPassthrough('dump($user);')).toBe(true)
    })

    it('returns false for method call without output', () => {
      expect(runtime.isPassthrough('User::find(1);')).toBe(false)
    })

    it('does not false-positive on echo in string', () => {
      expect(runtime.isPassthrough('$s = "no echo here";')).toBe(false)
    })
  })

  describe('extractLastExpression', () => {
    it('extracts a method call', () => {
      expect(runtime.extractLastExpression('User::find(1);')).toBe('User::find(1)')
    })

    it('extracts a static call chain', () => {
      const code = "DB::table('users')->count();"
      expect(runtime.extractLastExpression(code)).toBe("DB::table('users')->count()")
    })

    it('extracts a variable', () => {
      expect(runtime.extractLastExpression('$result;')).toBe('$result')
    })

    it('returns null for echo statement', () => {
      expect(runtime.extractLastExpression('echo "hello";')).toBeNull()
    })

    it('returns null for foreach', () => {
      const code = 'foreach ($users as $u) {\n    echo $u->name;\n}'
      expect(runtime.extractLastExpression(code)).toBeNull()
    })

    it('returns null for assignment', () => {
      expect(runtime.extractLastExpression('$result = User::find(1);')).toBeNull()
    })

    it('returns null for if statement', () => {
      expect(runtime.extractLastExpression('if ($x) { return $x; }')).toBeNull()
    })

    it('ignores trailing closing brace', () => {
      const code = '$users = User::all();\n$users->count();'
      expect(runtime.extractLastExpression(code)).toBe('$users->count()')
    })

    it('extracts function call', () => {
      expect(runtime.extractLastExpression('collect([1, 2, 3]);')).toBe('collect([1, 2, 3])')
    })
  })

  describe('wrap', () => {
    it('wraps a method call with phplay_render', () => {
      const result = runtime.wrap('User::find(1);')
      expect(result).toContain('$__result = (User::find(1))')
      expect(result).toContain('phplay_render($__result)')
    })

    it('does not wrap when echo is present', () => {
      const code = 'echo "hello";'
      expect(runtime.wrap(code)).toBe(code)
    })

    it('does not wrap when dd is present', () => {
      const code = 'dd($user);'
      expect(runtime.wrap(code)).toBe(code)
    })

    it('does not wrap a foreach loop', () => {
      const code = 'foreach ($users as $u) {\n    echo $u->name;\n}'
      expect(runtime.wrap(code)).toBe(code)
    })

    it('does not wrap assignment', () => {
      const code = '$result = 42;'
      expect(runtime.wrap(code)).toBe(code)
    })

    it('wraps collect chain', () => {
      const result = runtime.wrap("collect([1,2,3])->sum();")
      expect(result).toContain('phplay_render($__result)')
    })

    it('wraps last expression in multi-line snippet', () => {
      const code = '$users = User::all();\n$users->count();'
      const result = runtime.wrap(code)
      expect(result).toContain('phplay_render($__result)')
      expect(result).toContain("$users = User::all()")
    })

    it('preserves indentation when wrapping', () => {
      const code = '    $x->method();'
      const result = runtime.wrap(code)
      expect(result).toMatch(/^ {4}\$__result/)
    })

    it('rewrites return $var; to phplay_render($var)', () => {
      const code = '$users = User::get();\nreturn $users;'
      const result = runtime.wrap(code)
      expect(result).toContain('phplay_render($users)')
      expect(result).not.toContain('return $users')
    })

    it('rewrites bare return expr to phplay_render', () => {
      const result = runtime.wrap('return User::find(1);')
      expect(result).toContain('phplay_render(User::find(1))')
    })

    it('rewrites return null to phplay_render(null)', () => {
      const result = runtime.wrap('return null;')
      expect(result).toContain('phplay_render(null)')
    })

    it('rewrites return false to phplay_render(false)', () => {
      const result = runtime.wrap('return false;')
      expect(result).toContain('phplay_render(false)')
    })

    it('rewrites return [] to phplay_render([])', () => {
      const result = runtime.wrap('return [];')
      expect(result).toContain('phplay_render([])')
    })

    it('rewrites return collect(...) to phplay_render', () => {
      const result = runtime.wrap('return collect([1, 2, 3]);')
      expect(result).toContain('phplay_render(collect([1, 2, 3]))')
    })

    it('does not rewrite return inside passthrough code', () => {
      const code = 'echo "x";\nreturn $x;'
      const result = runtime.wrap(code)
      expect(result).toBe(code)
    })

    // LastExpressionDetector edge cases (#111)
    it('wraps standalone variable as last expression', () => {
      const code = '$user = User::find(1);\n$user;'
      const result = runtime.wrap(code)
      expect(result).toContain('phplay_render($__result)')
      expect(result).toContain('($user)')
    })

    it('does not wrap code ending with if block', () => {
      const code = '$x = 1;\nif ($x > 0) {\n    $x = 2;\n}'
      const result = runtime.wrap(code)
      expect(result).toBe(code)
    })

    it('does not wrap code ending with try block', () => {
      const code = 'try {\n    User::find(1);\n} catch (\\Exception $e) {\n    echo $e->getMessage();\n}'
      const result = runtime.wrap(code)
      expect(result).toBe(code)
    })

    it('does not duplicate output when echo is used', () => {
      const code = 'echo "ok";'
      const result = runtime.wrap(code)
      expect(result).not.toContain('phplay_render')
      expect(result).toBe(code)
    })

    it('does not attempt render after dd()', () => {
      const code = '$user = User::find(1);\ndd($user);'
      const result = runtime.wrap(code)
      expect(result).not.toContain('phplay_render')
    })

    it('wraps chained method call as last expression', () => {
      const code = '$users = User::query();\n$users->where("active", true)->get();'
      const result = runtime.wrap(code)
      expect(result).toContain('phplay_render($__result)')
    })
  })
})
