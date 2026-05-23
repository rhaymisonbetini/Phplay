import type { Theme } from './theme'

export const nord: Theme = {
  name: 'nord',
  label: 'Nord',
  vars: {
    '--bg-base':     '#2E3440',
    '--bg-app':      '#2E3440',
    '--bg-surface':  '#3B4252',
    '--bg-elevated': '#434C5E',
    '--bg-overlay':  '#4C566A',

    '--text-primary':   '#ECEFF4',
    '--text-secondary': '#D8DEE9',
    '--text-muted':     '#9AA7BE',
    '--text-disabled':  '#616E88',

    '--accent':       '#88C0D0',
    '--accent-hover': '#81A1C1',

    '--neon-blue':   '#88C0D0',
    '--neon-purple': '#B48EAD',
    '--neon-green':  '#A3BE8C',

    '--border-subtle':  '#3B4252',
    '--border-default': '#434C5E',
    '--border-strong':  '#4C566A',

    '--radius-panel':  '10px',
    '--radius-button': '8px',
    '--radius-icon':   '8px',
    '--radius-sm':     '4px',

    '--shadow-neon-blue':   '0 0 0 1px rgba(136,192,208,0.15), 0 0 10px rgba(136,192,208,0.07)',
    '--shadow-neon-purple': '0 0 0 1px rgba(180,142,173,0.15), 0 0 10px rgba(180,142,173,0.07)',
    '--shadow-neon-green':  '0 0 0 1px rgba(163,190,140,0.15), 0 0 10px rgba(163,190,140,0.07)',

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
