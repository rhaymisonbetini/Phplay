import type { Theme } from './theme'

export const draculaNeon: Theme = {
  name: 'dracula-neon',
  label: 'Dracula Neon',
  vars: {
    // Backgrounds
    '--bg-base':     '#161B22',
    '--bg-app':      '#161B22',
    '--bg-surface':  '#1E2430',
    '--bg-elevated': '#202938',
    '--bg-overlay':  '#243042',

    // Text
    '--text-primary':   '#E6EDF3',
    '--text-secondary': '#9BA7B4',
    '--text-muted':     '#6B7C8E',
    '--text-disabled':  '#435060',

    // Accent — neon blue
    '--accent':       '#00D8FF',
    '--accent-hover': '#00C3E6',

    // Neon family
    '--neon-blue':   '#00D8FF',
    '--neon-purple': '#BD93F9',
    '--neon-green':  '#50FA7B',

    // Borders
    '--border-subtle':  '#1D2635',
    '--border-default': '#253043',
    '--border-strong':  '#2E3D55',

    // Radii
    '--radius-panel':  '14px',
    '--radius-button': '10px',
    '--radius-icon':   '12px',
    '--radius-sm':     '6px',

    // Glow shadows
    '--shadow-neon-blue':   '0 0 0 1px rgba(0,216,255,0.15), 0 0 12px rgba(0,216,255,0.08)',
    '--shadow-neon-purple': '0 0 0 1px rgba(189,147,249,0.15), 0 0 12px rgba(189,147,249,0.08)',
    '--shadow-neon-green':  '0 0 0 1px rgba(80,250,123,0.15), 0 0 12px rgba(80,250,123,0.08)',

    // Spacing scale
    '--space-1':  '4px',
    '--space-2':  '8px',
    '--space-3':  '12px',
    '--space-4':  '16px',
    '--space-5':  '20px',
    '--space-6':  '24px',
    '--space-8':  '32px',
    '--space-10': '40px',
  }
}
