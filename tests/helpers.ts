import { join } from 'path'

export function loadFixture(name: string): string {
  return join(__dirname, 'fixtures', name)
}
