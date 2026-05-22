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
  })
})
