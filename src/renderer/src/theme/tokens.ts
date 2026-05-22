// CSS custom property name constants — use these when setting/reading vars in JS
export const T = {
  // Backgrounds
  BG_BASE:     '--bg-base',
  BG_APP:      '--bg-app',
  BG_SURFACE:  '--bg-surface',
  BG_ELEVATED: '--bg-elevated',
  BG_OVERLAY:  '--bg-overlay',

  // Text
  TEXT_PRIMARY:   '--text-primary',
  TEXT_SECONDARY: '--text-secondary',
  TEXT_MUTED:     '--text-muted',
  TEXT_DISABLED:  '--text-disabled',

  // Accent / neon
  ACCENT:       '--accent',
  ACCENT_HOVER: '--accent-hover',
  NEON_BLUE:    '--neon-blue',
  NEON_PURPLE:  '--neon-purple',
  NEON_GREEN:   '--neon-green',

  // Borders
  BORDER_SUBTLE:  '--border-subtle',
  BORDER_DEFAULT: '--border-default',
  BORDER_STRONG:  '--border-strong',

  // Radii
  RADIUS_PANEL:  '--radius-panel',
  RADIUS_BUTTON: '--radius-button',
  RADIUS_ICON:   '--radius-icon',
  RADIUS_SM:     '--radius-sm',

  // Glow shadows
  SHADOW_NEON_BLUE:   '--shadow-neon-blue',
  SHADOW_NEON_PURPLE: '--shadow-neon-purple',
  SHADOW_NEON_GREEN:  '--shadow-neon-green',

  // Spacing
  SPACE_1:  '--space-1',
  SPACE_2:  '--space-2',
  SPACE_3:  '--space-3',
  SPACE_4:  '--space-4',
  SPACE_5:  '--space-5',
  SPACE_6:  '--space-6',
  SPACE_8:  '--space-8',
  SPACE_10: '--space-10',
} as const
