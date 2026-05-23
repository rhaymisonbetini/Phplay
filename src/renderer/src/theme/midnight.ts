import type { Theme } from './theme'

export const midnight: Theme = {
  name: 'midnight',
  label: 'Midnight',
  vars: {
    '--bg-base':     '#0D1117',
    '--bg-app':      '#0D1117',
    '--bg-surface':  '#161B22',
    '--bg-elevated': '#1C2330',
    '--bg-overlay':  '#21293A',

    '--text-primary':   '#CDD9E5',
    '--text-secondary': '#8B949E',
    '--text-muted':     '#6E7681',
    '--text-disabled':  '#3D444D',

    '--accent':       '#58A6FF',
    '--accent-hover': '#4493F8',

    '--neon-blue':   '#58A6FF',
    '--neon-purple': '#C9A0DC',
    '--neon-green':  '#3FB950',

    '--border-subtle':  '#21262D',
    '--border-default': '#30363D',
    '--border-strong':  '#484F58',

    '--radius-panel':  '12px',
    '--radius-button': '8px',
    '--radius-icon':   '10px',
    '--radius-sm':     '6px',

    '--shadow-neon-blue':   '0 0 0 1px rgba(88,166,255,0.12), 0 0 10px rgba(88,166,255,0.06)',
    '--shadow-neon-purple': '0 0 0 1px rgba(201,160,220,0.12), 0 0 10px rgba(201,160,220,0.06)',
    '--shadow-neon-green':  '0 0 0 1px rgba(63,185,80,0.12), 0 0 10px rgba(63,185,80,0.06)',

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
