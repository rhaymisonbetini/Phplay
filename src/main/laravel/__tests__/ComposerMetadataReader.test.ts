import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { ComposerMetadataReader } from '../ComposerMetadataReader'

const fixturesDir = join(__dirname, '../../../../tests/fixtures')

describe('ComposerMetadataReader', () => {
  const reader = new ComposerMetadataReader()

  it('reads Laravel version and packages from laravel-minimal fixture', async () => {
    const meta = await reader.read(join(fixturesDir, 'laravel-minimal'))
    expect(meta.laravelVersion).toBe('^11.0')
    expect(meta.phpConstraint).toBe('^8.2')
    expect(meta.appNamespace).toBe('App\\')
    expect(meta.installedPackages).toHaveLength(2)
    expect(meta.installedPackages[0].name).toBe('laravel/framework')
  })

  it('returns empty packages when composer.lock is absent', async () => {
    const meta = await reader.read(join(fixturesDir, 'laravel-no-vendor'))
    expect(meta.laravelVersion).toBe('^10.0')
    expect(meta.installedPackages).toHaveLength(0)
  })

  it('returns null fields when composer.json is absent', async () => {
    const meta = await reader.read(join(fixturesDir, 'plain-php'))
    expect(meta.laravelVersion).toBeNull()
    expect(meta.phpConstraint).toBeNull()
    expect(meta.installedPackages).toHaveLength(0)
  })
})
