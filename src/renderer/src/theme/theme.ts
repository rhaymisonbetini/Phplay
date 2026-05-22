export type ThemeVariant = 'dracula-neon' | 'midnight' | 'nord' | 'system'

export interface Theme {
  name: ThemeVariant
  label: string
  vars: Record<string, string>
}
