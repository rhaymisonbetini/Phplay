import { readFile } from 'fs/promises'
import { join } from 'path'

export interface ScanResult {
  classes: string[]
  functions: string[]
}

/**
 * Reads vendor/composer/autoload_classmap.php to extract all autoloaded
 * class/interface/trait names available in the project.
 */
export class PhpClassScanner {
  async scan(projectPath: string): Promise<ScanResult> {
    const classmapPath = join(projectPath, 'vendor', 'composer', 'autoload_classmap.php')

    try {
      const content = await readFile(classmapPath, 'utf-8')

      // Parse: 'Full\Class\Name' => $baseDir . '/path/to/file.php',
      const matches = [...content.matchAll(/'([^'\\]+(?:\\[^'\\]+)*)'\s*=>/g)]
      const classes = matches
        .map((m) => m[1])
        .filter((cls) => !cls.startsWith('Composer\\') && cls.includes('\\'))
        .sort()

      return { classes, functions: [] }
    } catch {
      return { classes: [], functions: [] }
    }
  }
}
